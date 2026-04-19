import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { StellarProvider } from './providers/StellarProvider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StellarProvider>
      <App />
    </StellarProvider>
  </React.StrictMode>,
)
