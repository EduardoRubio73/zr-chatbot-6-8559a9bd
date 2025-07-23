
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Play, Pause } from 'lucide-react';

interface ChatMessagesProps {
  conversationId: string;
  currentUserId: string | undefined;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isPlaying: { [key: string]: boolean };
  setIsPlaying: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  audioElements: { [key: string]: HTMLAudioElement };
  setAudioElements: React.Dispatch<React.SetStateAction<{ [key: string]: HTMLAudioElement }>>;
  onUserClick: (user: any) => void;
}

export default function ChatMessages({
  conversationId,
  currentUserId,
  messagesEndRef,
  isPlaying,
  setIsPlaying,
  audioElements,
  setAudioElements,
  onUserClick
}: ChatMessagesProps) {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!conversationId,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const playAudio = (messageId: string, audioUrl: string) => {
    if (isPlaying[messageId]) {
      audioElements[messageId]?.pause();
      setIsPlaying(prev => ({ ...prev, [messageId]: false }));
    } else {
      const audio = new Audio(audioUrl);
      setAudioElements(prev => ({ ...prev, [messageId]: audio }));
      setIsPlaying(prev => ({ ...prev, [messageId]: true }));
      
      audio.play();
      audio.onended = () => {
        setIsPlaying(prev => ({ ...prev, [messageId]: false }));
      };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message: any) => {
        const isOwnMessage = message.sender_id === currentUserId;
        
        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              isOwnMessage 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              {!isOwnMessage && (
                <div className="flex items-center space-x-2 mb-1">
                  <Avatar 
                    className="h-6 w-6 cursor-pointer"
                    onClick={() => onUserClick(message.sender)}
                  >
                    <AvatarImage src={message.sender?.avatar_url} alt={message.sender?.name} />
                    <AvatarFallback>
                      {message.sender?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{message.sender?.name}</span>
                </div>
              )}
              
              {message.text && (
                <p className="text-sm">{message.text}</p>
              )}
              
              {message.image_url && (
                <img 
                  src={message.image_url} 
                  alt="Imagem" 
                  className="max-w-full h-auto rounded-lg mt-2"
                />
              )}
              
              {message.video_url && (
                <video 
                  src={message.video_url} 
                  controls 
                  className="max-w-full h-auto rounded-lg mt-2"
                />
              )}
              
              {message.audio_url && (
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playAudio(message.id, message.audio_url)}
                  >
                    {isPlaying[message.id] ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 bg-gray-300 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-1/3"></div>
                  </div>
                </div>
              )}
              
              <div className="text-xs mt-1 opacity-75">
                {formatTime(message.sent_at)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
