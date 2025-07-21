
import { Suspense } from 'react';
import ZRChatSupabase from '@/components/ZRChatSupabase';

const ZRChatPage = () => {
  return (
    <div className="h-screen w-full">
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <ZRChatSupabase />
      </Suspense>
    </div>
  );
};

export default ZRChatPage;
