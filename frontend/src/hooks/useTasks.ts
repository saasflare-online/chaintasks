import { useEffect, useState, useCallback } from 'react';
import { useStellar } from '../providers/StellarProvider';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

// Configuration from Environment Variables
export const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
export const CONTRACT_ID = import.meta.env.VITE_STELLAR_CONTRACT_ID;

const server = new StellarSdk.rpc.Server(RPC_URL);

export function useTasks() {
  const { address } = useStellar();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 1. Live query from IndexedDB
  const localTasks = useLiveQuery(
    () => db.tasks.where('owner').equals(address || '').toArray(),
    [address]
  ) || [];

  // 2. Fetch from Soroban
  const fetchOnChainTasks = useCallback(async () => {
    if (!address || !CONTRACT_ID) return;
    try {
      setIsSyncing(true);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      
      // Call get_tasks using simulation
      const account = await server.getAccount(address);
      const tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(
            contract.call("get_tasks", new StellarSdk.Address(address).toScVal())
        )
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      
      if (StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
        const result = simulation.result?.retval;
        if (result) {
            // ScVal to JS conversion
            const tasks: any[] = StellarSdk.scValToNative(result);
            
            const mappedTasks = tasks.map((t: any) => ({
                id: Number(t.id),
                content: t.content.toString(),
                completed: t.completed,
                owner: address,
                status: 'confirmed' as const,
            }));

            await db.tasks.where('owner').equals(address).and(t => t.status === 'confirmed').delete();
            await db.tasks.bulkPut(mappedTasks);
        }
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [address]);

  // Initial Sync
  useEffect(() => {
    fetchOnChainTasks();
  }, [fetchOnChainTasks]);

  const addTask = async (content: string) => {
    if (!address || !CONTRACT_ID) return;

    // Clear any existing stale ghost tasks before adding a new one
    await clearPending();

    const tempId = Math.floor(Date.now() / 1000);
    
    // Optimistic Update
    await db.tasks.add({
      id: tempId,
      content,
      completed: false,
      owner: address,
      status: 'pending'
    });

    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const taskName = content;

      // 1. Fetch account info
      const account = await server.getAccount(address);
      
      // 2. Build Transaction
      let tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(
            contract.call("add_task", new StellarSdk.Address(address).toScVal(), StellarSdk.nativeToScVal(taskName, { type: 'string' }))
        )
        .setTimeout(30)
        .build();

      // 3. Simulate and Assemble (Mandatory for Soroban)
      const simulation = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }
      tx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();

      // 4. Sign with Freighter
      const xdr = tx.toXDR();
      const signedXdr = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
      
      // 5. Submit
      const response = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr.signedTxXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction);
      
      if (response.status === 'ERROR') {
        console.error('Transaction failed details:', response);
        throw new Error(`Transaction failed with status: ERROR. Result: ${response.errorResult}`);
      }
      
      if (response.status !== 'PENDING') {
         throw new Error(`Transaction failed with status: ${response.status}`);
      }

      // 6. Poll for result
      let status = 'PENDING';
      let txResponse;
      while (status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        txResponse = await server.getTransaction(response.hash);
        status = txResponse.status as string;
      }

      if (status !== 'SUCCESS') {
        throw new Error(`Transaction finalized with status: ${status}`);
      }

      // 7. Force refetch to sync
      await fetchOnChainTasks();
      
      // 8. Remove the optimistic temporary task as it's now replaced by the on-chain one
      await db.tasks.where('id').equals(tempId).delete();
      
      return txResponse;
    } catch (error) {
      console.error('Task action failed:', error);
      await db.tasks.where('id').equals(tempId).delete();
      throw error;
    }
  };

  const toggleTask = async (taskId: number, currentStatus: boolean) => {
    if (!address || !CONTRACT_ID) return;
    
    // Optimistic toggle
    await db.tasks.where('id').equals(taskId).modify({ completed: !currentStatus });

    try {
      const account = await server.getAccount(address);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      let tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call("toggle_task", new StellarSdk.Address(address).toScVal(), StellarSdk.nativeToScVal(taskId, { type: 'u32' })))
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      tx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();

      const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const response = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr.signedTxXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction);
      
      let status = 'PENDING';
      while (status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        const res = await server.getTransaction(response.hash);
        status = res.status as string;
      }

      if (status !== 'SUCCESS') throw new Error();
      await fetchOnChainTasks();
    } catch (e) {
      await db.tasks.where('id').equals(taskId).modify({ completed: currentStatus });
      console.error('Toggle failed', e);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!address || !CONTRACT_ID) return;
    
    const taskBefore = await db.tasks.where('id').equals(taskId).first();
    await db.tasks.where('id').equals(taskId).modify({ status: 'deleting' });

    try {
      const account = await server.getAccount(address);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      let tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call("delete_task", new StellarSdk.Address(address).toScVal(), StellarSdk.nativeToScVal(taskId, { type: 'u32' })))
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      tx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();

      const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const response = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr.signedTxXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction);
      
      let status = 'PENDING';
      while (status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        const res = await server.getTransaction(response.hash);
        status = res.status as string;
      }

      if (status !== 'SUCCESS') throw new Error();
      await fetchOnChainTasks();
    } catch (e) {
      if (taskBefore) {
        await db.tasks.put(taskBefore);
      }
      console.error('Delete failed', e);
    }
  };

  const clearAll = async () => {
    if (!address) return;
    await db.tasks.where('owner').equals(address).delete();
  };

  const clearPending = async () => {
    if (!address) return;
    console.log('Clearing pending tasks for:', address);
    try {
      const pendingTasks = await db.tasks
        .where('owner').equals(address)
        .filter(t => t.status !== 'confirmed')
        .toArray();
      
      const ids = pendingTasks.map(t => t.localId).filter((id): id is number => id !== undefined);
      await db.tasks.bulkDelete(ids);
      console.log('Cleared IDs:', ids);
    } catch (e) {
      console.error('Clear failed', e);
    }
  };

  const pendingCount = localTasks.filter(t => t.status === 'pending' || t.status === 'deleting').length;

  return {
    tasks: localTasks.filter(t => t.status !== 'deleting'),
    addTask,
    toggleTask,
    deleteTask,
    clearAll,
    clearPending,
    pendingCount,
    isLoading: isSyncing,
    refetch: fetchOnChainTasks,
  };
}
