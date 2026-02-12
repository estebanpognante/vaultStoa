import React from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import Login from './components/security/Login';

import Dashboard from './components/dashboard/Dashboard';

const AppContent = () => {
  const { isAuthenticated } = useSecurity();

  if (!isAuthenticated) {
    return <Login />;
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
