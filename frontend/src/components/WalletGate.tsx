import { useStellar } from '../providers/StellarProvider';
import { motion, AnimatePresence } from 'framer-motion';

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected, connect } = useStellar();

  return (
    <div className="relative min-h-screen">
      <AnimatePresence>
        {!isConnected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md"
          >
            <div className="text-center space-y-6 max-w-md px-6">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/30 rotate-12">
                 <span className="text-4xl text-primary font-bold -rotate-12">CT</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">ChainTasks x Stellar</h1>
              <p className="text-slate-400 text-lg">
                Personal, immutable todo list on Soroban. Connect your **Freighter** wallet to start.
              </p>
              <div className="flex justify-center pt-4">
                <button 
                    onClick={connect}
                    className="btn-primary"
                >
                    Connect Freighter
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={!isConnected ? "blur-sm pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
        {children}
      </div>
    </div>
  );
}
