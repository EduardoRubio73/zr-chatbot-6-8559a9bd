
import { Suspense } from 'react';
import ZRChatSupabase from '@/components/ZRChatSupabase';

const ZRChatPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ZRChatSupabase />
    </Suspense>
  );
};

export default ZRChatPage;
