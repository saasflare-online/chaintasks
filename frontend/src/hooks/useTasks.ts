import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import TaskManagerABI from '../constants/TaskManager.json';
import { useEffect, useState } from 'react';

// Replace with your deployed contract address
export const CONTRACT_ADDRESS = '0x1Fd396014457F2429a320399Ac0E927014603B6F';

export function useTasks() {
  const { address } = useAccount();
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Read from Dexie (Local Cache)
  const localTasks = useLiveQuery(
    () => db.tasks.where('owner').equals(address || '').toArray(),
    [address]
  ) || [];

  // 2. Read from Blockchain
  const { data: onChainTasks, refetch: refetchOnChain } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: TaskManagerABI.abi,
    functionName: 'getMyTasks',
    account: address,
    query: {
        enabled: !!address,
    }
  });

  const { writeContractAsync } = useWriteContract();

  // 3. Reconcilation logic
  useEffect(() => {
    if (onChainTasks && address) {
      const syncTasks = async () => {
        setIsSyncing(true);
        // Map on-chain tasks to LocalTask format
        const tasks = (onChainTasks as any[]).map((t: any) => ({
          id: Number(t.id),
          content: t.content,
          completed: t.completed,
          owner: address.toLowerCase(),
          status: 'confirmed' as const,
        }));

        // Remove confirmed tasks that are no longer on chain
        await db.tasks.where('owner').equals(address.toLowerCase()).and(t => t.status === 'confirmed').delete();
        
        // Add current on-chain tasks
        await db.tasks.bulkPut(tasks);
        setIsSyncing(false);
      };
      syncTasks();
    }
  }, [onChainTasks, address]);

  // 4. Mutations
  const addTask = async (content: string) => {
    if (!address) return;
    
    // Optimistic Update
    const tempId = Date.now() * -1; // Negative ID for pending
    await db.tasks.add({
      id: tempId,
      content,
      completed: false,
      owner: address.toLowerCase(),
      status: 'pending'
    });

    try {
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TaskManagerABI.abi,
        functionName: 'addTask',
        args: [content],
      });
      // Transaction sent, we wait for indexing (handled by refetch or events)
      return tx;
    } catch (error) {
      // Revert optimistic update
      await db.tasks.where('id').equals(tempId).delete();
      throw error;
    }
  };

  const toggleTask = async (taskId: number, currentStatus: boolean) => {
    if (!address) return;

    // Optimistic Update
    await db.tasks.where('id').equals(taskId).modify({ completed: !currentStatus });

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TaskManagerABI.abi,
        functionName: 'toggleTaskComplete',
        args: [BigInt(taskId)],
      });
    } catch (error) {
      // Revert
      await db.tasks.where('id').equals(taskId).modify({ completed: currentStatus });
      throw error;
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!address) return;

    // Optimistic Update: Change status to deleting
    await db.tasks.where('id').equals(taskId).modify({ status: 'deleting' });

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TaskManagerABI.abi,
        functionName: 'deleteTask',
        args: [BigInt(taskId)],
      });
    } catch (error) {
      // Revert status
      await db.tasks.where('id').equals(taskId).modify({ status: 'confirmed' });
      throw error;
    }
  };

  // Watch for events to sync
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: TaskManagerABI.abi,
    onLogs() {
      refetchOnChain();
    },
  });

  const pendingCount = localTasks.filter(t => t.status === 'pending' || t.status === 'deleting').length;

  return {
    tasks: localTasks.filter(t => t.status !== 'deleting'),
    addTask,
    toggleTask,
    deleteTask,
    pendingCount,
    isLoading: isSyncing,
  };
}
