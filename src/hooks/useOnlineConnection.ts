
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOnlineConnection = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (!error) {
          setIsSupabaseConnected(true);
          setIsOnline(true);
        } else {
          throw error;
        }
      } catch (error) {
        console.error('Supabase connection failed:', error);
        setIsSupabaseConnected(false);
        setIsOnline(false);
        // Force reload if connection fails
        window.location.reload();
      }
    };

    // Check connection immediately
    checkSupabaseConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkSupabaseConnection, 30000);

    // Listen to online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      checkSupabaseConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Force reload when going offline
      setTimeout(() => window.location.reload(), 1000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSupabaseConnected };
};
