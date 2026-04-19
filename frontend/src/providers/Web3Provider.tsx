import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: 'ChainTasks',
  projectId: '04309ed1007e49d00c2838531288fac1', // Placeholder Project ID
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: 'white',
            borderRadius: 'large',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
