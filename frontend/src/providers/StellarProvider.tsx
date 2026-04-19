import React, { createContext, useContext, useState, useEffect } from 'react';
import { isConnected, getPublicKey } from '@stellar/freighter-api';

interface StellarContextType {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

const StellarContext = createContext<StellarContextType | undefined>(undefined);

export function StellarProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    try {
      if (await isConnected()) {
        const publicKey = await getPublicKey();
        if (publicKey) {
          setAddress(publicKey);
        }
      } else {
        alert('Please install Freighter wallet');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  useEffect(() => {
    // Check if already connected
    const checkConnection = async () => {
        if (await isConnected()) {
            // We don't auto-fetch public key for privacy unless needed, 
            // but for a dApp it's common to show the address if already allowed.
        }
    };
    checkConnection();
  }, []);

  return (
    <StellarContext.Provider value={{
      address,
      connect,
      disconnect,
      isConnected: !!address,
    }}>
      {children}
    </StellarContext.Provider>
  );
}

export function useStellar() {
  const context = useContext(StellarContext);
  if (context === undefined) {
    throw new Error('useStellar must be used within a StellarProvider');
  }
  return context;
}
