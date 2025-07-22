
import React from 'react';
import { useOnlineConnection } from '@/hooks/useOnlineConnection';

interface OnlineGuardProps {
  children: React.ReactNode;
}

const OnlineGuard: React.FC<OnlineGuardProps> = ({ children }) => {
  const { isOnline, isSupabaseConnected } = useOnlineConnection();

  if (!isOnline || !isSupabaseConnected) {
    return (
      <div className="min-h-screen bg-red-500 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Conexão Perdida</h1>
          <p className="mb-4">Não foi possível conectar ao servidor. Recarregando...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default OnlineGuard;
