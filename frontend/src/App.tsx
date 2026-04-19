import { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { useStellar } from './providers/StellarProvider';
import { WalletGate } from './components/WalletGate';
import { TaskItem } from './components/TaskItem';
import { ProgressIndicator, EmptyState } from './components/Feedback';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { Plus, Layout, LogOut } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function TaskApp() {
  const [newContent, setNewContent] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { address, disconnect } = useStellar();
  const { tasks, addTask, toggleTask, deleteTask, pendingCount, isLoading } = useTasks();

  const activeTask = tasks.find(t => t.id === deletingId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const content = newContent;
    setNewContent('');
    try {
      await addTask(content);
    } catch (err) {
      console.error(err);
      setNewContent(content); // Revert content on error
    }
  };

  const truncateAddress = (addr: string) => 
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            ChainTasks
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-400">
                {address ? truncateAddress(address) : 'Not Connected'}
            </div>
            <button 
                onClick={disconnect}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Input Section */}
      <form onSubmit={handleAdd} className="mb-10">
        <div className="glass p-2 rounded-2xl flex items-center gap-2 focus-within:ring-2 ring-primary/50 transition-all">
          <input 
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a new Soroban task..."
            className="flex-1 bg-transparent border-none outline-none py-3 px-4 text-lg text-white placeholder:text-slate-500"
          />
          <button 
            type="submit"
            disabled={!newContent.trim()}
            className="btn-primary flex items-center gap-2 py-2.5"
          >
            <Plus className="w-5 h-5" />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-3 relative min-h-[400px]">
        {isLoading && tasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={toggleTask}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
        </AnimatePresence>

        {!isLoading && tasks.length === 0 && <EmptyState />}
      </div>

      <ConfirmDeleteModal 
        isOpen={!!deletingId}
        taskContent={activeTask?.content || ''}
        onConfirm={() => {
          if (deletingId !== null) {
            deleteTask(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />

      <ProgressIndicator count={pendingCount} />
    </div>
  );
}

export default function App() {
  return (
    <WalletGate>
      <TaskApp />
    </WalletGate>
  );
}
