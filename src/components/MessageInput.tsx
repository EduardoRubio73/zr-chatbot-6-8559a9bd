
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Paperclip, Video } from 'lucide-react';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingTime: number;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
}

export default function MessageInput({
  newMessage,
  setNewMessage,
  onSendMessage,
  isRecording,
  onStartRecording,
  onStopRecording,
  recordingTime,
  onFileUpload,
  onVideoUpload,
  fileInputRef,
  videoInputRef,
  isUploading
}: MessageInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-gray-500 hover:text-gray-700"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => videoInputRef.current?.click()}
          disabled={isUploading}
          className="text-gray-500 hover:text-gray-700"
        >
          <Video className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className="pr-12"
            disabled={isUploading}
          />
          
          {isRecording && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 text-sm">
              {formatTime(recordingTime)}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={onStartRecording}
          onMouseUp={onStopRecording}
          onMouseLeave={onStopRecording}
          className={`${isRecording ? 'text-red-500' : 'text-gray-500'} hover:text-gray-700`}
        >
          {isRecording ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        
        <Button
          onClick={onSendMessage}
          disabled={!newMessage.trim() || isUploading}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
