import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { InventoryClientContext, BackendType, InventoryClient } from './api/client';
import { GraphQLAdapter } from './api/graphql';
import { ExpressRESTAdapter } from './api/express';
import { LaravelRESTAdapter } from './api/laravel';
import './index.css';

function ClientProvider({ children }: { children: React.ReactNode }) {
  const [backendType, setBackendTypeState] = useState<BackendType>(
    (localStorage.getItem('backend_type') as BackendType) || 'graphql'
  );

  const setBackendType = (type: BackendType) => {
    localStorage.setItem('backend_type', type);
    // Clear auth token when changing backends to avoid cross-endpoint token pollution
    localStorage.removeItem('auth_token');
    setBackendTypeState(type);
    window.location.reload(); // Hard reload to fully reset state & socket connections
  };

  const client = useMemo<InventoryClient>(() => {
    switch (backendType) {
      case 'express':
        return new ExpressRESTAdapter();
      case 'laravel':
        return new LaravelRESTAdapter();
      case 'graphql':
      default:
        return new GraphQLAdapter();
    }
  }, [backendType]);

  const value = useMemo(() => ({
    client,
    backendType,
    setBackendType
  }), [client, backendType]);

  return (
    <InventoryClientContext.Provider value={value}>
      {children}
    </InventoryClientContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClientProvider>
      <App />
    </ClientProvider>
  </React.StrictMode>
);
