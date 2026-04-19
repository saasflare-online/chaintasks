import { Trash2, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { type LocalTask } from '../db/db';

interface TaskItemProps {
  task: LocalTask;
  onToggle: (id: number, current: boolean) => void;
  onDelete: (id: number) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const isPending = task.status === 'pending';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        "glass glass-hover p-4 rounded-2xl flex items-center justify-between gap-4 group",
        task.completed ? "opacity-60" : "opacity-100"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => onToggle(task.id, task.completed)}
          disabled={isPending}
          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
        >
          {task.completed ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <span className={clsx(
          "text-lg transition-all duration-300",
          task.completed && "line-through text-slate-500"
        )}>
          {task.content}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isPending ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <button 
            onClick={() => onDelete(task.id)}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
