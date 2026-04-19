import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  taskContent: string;
}

export function ConfirmDeleteModal({ isOpen, onConfirm, onCancel, taskContent }: ConfirmDeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm glass p-8 rounded-3xl z-[70]"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-center text-white mb-2">Delete Task?</h3>
            <p className="text-slate-400 text-center mb-8">
              Are you sure you want to delete "{taskContent}"? This action is permanent and on-chain.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={onConfirm}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                Yes, delete task
              </button>
              <button 
                onClick={onCancel}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
