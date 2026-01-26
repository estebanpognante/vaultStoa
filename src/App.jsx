import React from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import MasterKeyPrompt from './components/security/MasterKeyPrompt';

import Dashboard from './components/dashboard/Dashboard';

const AppContent = () => {
  const { isAuthenticated } = useSecurity();

  if (!isAuthenticated) {
    return <MasterKeyPrompt />;
  }

  return <Dashboard />;
};

export default function App() {
  return (
    <SecurityProvider>
      <AppContent />
    </SecurityProvider>
  );
}
