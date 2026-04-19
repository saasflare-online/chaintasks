import React, { createContext, useContext, useState, useEffect } from 'react';
import { isConnected, requestAccess, getAddress } from '@stellar/freighter-api';

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
      console.log('Connecting to Freighter...');
      
      const connectionStatus = await isConnected();
      if (connectionStatus && connectionStatus.isConnected) {
        // requestAccess() prompts for permission if not already granted
        const access = await requestAccess();
        
        if (access && access.address) {
          setAddress(access.address);
          console.log('Connected with:', access.address);
        } else if (access && access.error) {
          console.error('Access requested failed:', access.error);
          alert(`Freighter Error: ${access.error}`);
        }
      } else {
        alert('Freighter wallet not found or locked. Please open the extension.');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to Freighter. Please ensure it is installed and unlocked.');
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connectionStatus = await isConnected();
        if (connectionStatus && connectionStatus.isConnected) {
          // getAddress only returns if already allowed, won't prompt
          const activeAddress = await getAddress();
          if (activeAddress && activeAddress.address) {
            setAddress(activeAddress.address);
          }
        }
      } catch (e) {
        console.error('Auto-connect check failed', e);
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
