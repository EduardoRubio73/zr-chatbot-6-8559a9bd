import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, ArrowLeft, Archive, Trash2 } from "lucide-react";
interface ChatHeaderProps {
  selectedConversation: any;
  isMobile: boolean;
  onBackToList: () => void;
  onAvatarClick: (conv: any) => void;
  onCall: (type: 'voice' | 'video') => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isRecording: boolean;
  onVideoRecording: () => void;
}
export default function ChatHeader({
  selectedConversation,
  isMobile,
  onBackToList,
  onAvatarClick,
  onCall,
  onArchiveConversation,
  onDeleteConversation,
  isRecording,
  onVideoRecording
}: ChatHeaderProps) {
  if (!selectedConversation) return null;
  return <header className="p-4 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isMobile && <Button variant="ghost" size="icon" onClick={onBackToList}>
              <ArrowLeft className="h-4 w-4" />
            </Button>}
          
          <Avatar className="h-10 w-10 cursor-pointer" onClick={() => onAvatarClick(selectedConversation)}>
            <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
            <AvatarFallback>{selectedConversation.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold text-foreground">
              {selectedConversation.name}
              {selectedConversation.isIARA}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedConversation.isOnline ? 'online' : 'última vez hoje às 14:30'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" title="Chamada de voz" onClick={() => onCall('voice')}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title={isRecording ? "Parar gravação de vídeo" : "Gravar vídeo"} onClick={onVideoRecording} className={isRecording ? "text-red-500" : ""}>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Arquivar" onClick={() => onArchiveConversation(selectedConversation.id)}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Excluir conversa" onClick={() => onDeleteConversation(selectedConversation.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>;
}