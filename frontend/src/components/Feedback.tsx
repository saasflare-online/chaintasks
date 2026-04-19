import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ProgressIndicator({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary/20 backdrop-blur-lg border border-primary/30 rounded-full flex items-center gap-3 z-40 shadow-xl shadow-primary/10"
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm font-medium text-primary">
            {count} transaction{count > 1 ? 's' : ''} pending...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20 px-6"
    >
      <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
        <Loader2 className="w-10 h-10 text-slate-700" />
      </div>
      <h3 className="text-2xl font-semibold text-slate-300 mb-2">No tasks yet</h3>
      <p className="text-slate-500 max-w-xs mx-auto">
        Your blockchain-stored tasks will appear here. Add one above to get started!
      </p>
    </motion.div>
  );
}
