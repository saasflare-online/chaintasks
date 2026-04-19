import { useEffect, useState, useCallback } from 'react';
import { useStellar } from '../providers/StellarProvider';
import { db, type LocalTask } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

// Configuration
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const CONTRACT_ID = 'C...'; // Placeholder Contract ID

const server = new StellarSdk.rpc.Server(RPC_URL);

export function useTasks() {
  const { address, isConnected } = useStellar();
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Read from Dexie (Local Cache)
  const localTasks = useLiveQuery(
    () => db.tasks.where('owner').equals(address || '').toArray(),
    [address]
  ) || [];

  // 2. Fetch from Soroban
  const fetchOnChainTasks = useCallback(async () => {
    if (!address) return;
    try {
      setIsSyncing(true);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const publicKey = new StellarSdk.Address(address);
      
      const response = await server.getEvents({
        startLedger: 0,
        filters: [], // We can simplify or just call get_tasks
      });
      
      // Call get_tasks
      // In a real app, we'd use the generated client or manually build the invokeHostFunction
      // For brevity and clarity, we'll simulate the response parsing from the SDK
      const tasks: any[] = []; // result of get_tasks call
      
      const mappedTasks = tasks.map((t: any) => ({
        id: t.id,
        content: t.content,
        completed: t.completed,
        owner: address,
        status: 'confirmed' as const,
      }));

      await db.tasks.where('owner').equals(address).and(t => t.status === 'confirmed').delete();
      await db.tasks.bulkPut(mappedTasks);
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) {
      fetchOnChainTasks();
    }
  }, [isConnected, fetchOnChainTasks]);

  // 3. Mutations
  const addTask = async (content: string) => {
    if (!address) return;
    
    // Optimistic Update
    const tempId = Math.floor(Date.now() / 1000);
    await db.tasks.add({
      id: tempId,
      content,
      completed: false,
      owner: address,
      status: 'pending'
    });

    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const taskName = content; // Soroban Symbol conversion needed in real app

      // 1. Fetch account info
      const account = await server.getAccount(address);
      
      // 2. Build Transaction
      const tx = new StellarSdk.TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(
            contract.call("add_task", new StellarSdk.Address(address).toScVal(), StellarSdk.nativeToScVal(taskName, { type: 'symbol' }))
        )
        .setTimeout(30)
        .build();

      // 3. Sign with Freighter
      const xdr = tx.toXDR();
      const signedXdr = await signTransaction(xdr, { network: 'TESTNET' });
      
      // 4. Submit
      const result = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      return result;
    } catch (error) {
      await db.tasks.where('id').equals(tempId).delete();
      throw error;
    }
  };

  const toggleTask = async (taskId: number, currentStatus: boolean) => {
    if (!address) return;
    await db.tasks.where('id').equals(taskId).modify({ completed: !currentStatus });
    // Similar TX building logic...
  };

  const deleteTask = async (taskId: number) => {
    if (!address) return;
    await db.tasks.where('id').equals(taskId).modify({ status: 'deleting' });
    // Similar TX building logic...
  };

  const pendingCount = localTasks.filter(t => t.status === 'pending' || t.status === 'deleting').length;

  return {
    tasks: localTasks.filter(t => t.status !== 'deleting'),
    addTask,
    toggleTask,
    deleteTask,
    pendingCount,
    isLoading: isSyncing,
    refetch: fetchOnChainTasks,
  };
}
