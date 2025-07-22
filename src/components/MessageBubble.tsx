
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Reply, 
  Copy, 
  Heart, 
  Download, 
  Forward, 
  Pin, 
  Star, 
  Flag, 
  Trash2,
  MoreVertical 
} from "lucide-react";

interface MessageBubbleProps {
  message: {
    id: string;
    message: string;
    sent_at: string;
    is_read: boolean;
    sender: string;
    image_url?: string;
    audio_url?: string;
    video_url?: string;
  };
  onMessageDeleted: (messageId: string) => void;
  onReply?: (message: any) => void;
}

const formatTime = (dateString: string) => {
  if (!dateString) return "00:00";
  
  try {
    // Se já está no formato HH:MM, retorna diretamente
    if (/^\d{1,2}:\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Tenta criar um objeto Date a partir da string
    const date = new Date(dateString);
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return "00:00";
    }
    
    // Usa UTC para evitar problemas de timezone
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch (error) {
    console.warn("Error formatting time:", error);
    return "00:00";
  }
};

export function MessageBubble({ message, onMessageDeleted, onReply }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();
  const isMine = message.sender === "me";

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) {
        console.error("Erro ao deletar:", error.message);
        toast({
          title: "Erro",
          description: "Erro ao deletar mensagem",
          variant: "destructive"
        });
      } else {
        onMessageDeleted(id);
        setShowMenu(false);
      }
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar mensagem",
        variant: "destructive"
      });
    }
  };

  const formattedTime = formatTime(message.sent_at);

  const handleMenuClick = (action: string) => {
    if (action === "delete") {
      handleDelete(message.id);
    } else if (action === "reply") {
      setShowMenu(false);
      if (onReply) {
        onReply(message);
      }
    } else {
      toast({
        title: "Em desenvolvimento",
        description: "🔧 Funcionalidade ainda em desenvolvimento",
        variant: "default"
      });
      setShowMenu(false);
    }
  };

  // Click outside to close menu
  const handleClickOutside = () => {
    setShowMenu(false);
  };

  const menuItems = [
    { label: "Responder", action: "reply", icon: Reply },
    { label: "Copiar", action: "copy", icon: Copy },
    { label: "Reagir", action: "react", icon: Heart },
    { label: "Baixar", action: "download", icon: Download },
    { label: "Encaminhar", action: "forward", icon: Forward },
    { label: "Fixar", action: "pin", icon: Pin },
    { label: "Favoritar", action: "favorite", icon: Star },
    { label: "Denunciar", action: "report", icon: Flag },
  ];

  // Renderizar status de leitura
  const renderReadStatus = () => {
    if (!isMine) return null;
    
    return (
      <span className="text-[#4A90E2] text-sm font-bold ml-1">
        {message.is_read ? "✓✓" : "✓"}
      </span>
    );
  };

  return (
    <>
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleClickOutside}
        />
      )}
      <div
        className={`message-bubble relative group w-fit max-w-[80%] ${
          isMine ? "self-end" : "self-start"
        }`}
      >
        <div
          className={`p-3 rounded-xl shadow-sm balao overflow-hidden ${
            isMine ? "bg-[#DCF8C6] balao-sent" : "bg-white balao-received"
          }`}
        >
          {message.message && (
            <p className="message-text whitespace-pre-wrap break-words">{message.message}</p>
          )}
          {message.image_url && (
            <img 
              src={message.image_url} 
              alt="Imagem enviada" 
              className="max-w-full h-auto rounded-lg mt-2"
              style={{ maxHeight: '300px' }}
            />
          )}
          {message.audio_url && (
            <div className="mt-2 w-full">
              <audio 
                controls 
                className="w-full"
                style={{ 
                  maxWidth: '240px', 
                  minWidth: '200px', 
                  height: '40px',
                  borderRadius: '6px'
                }}
              >
                <source src={message.audio_url} type="audio/mpeg" />
              </audio>
            </div>
          )}
          {message.video_url && (
            <video 
              controls 
              className="max-w-full h-auto rounded-lg mt-2" 
              style={{ maxHeight: '300px' }}
            >
              <source src={message.video_url} type="video/mp4" />
            </video>
          )}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-500">{formattedTime}</span>
            {renderReadStatus()}
          </div>
        </div>

        {/* Botão de menu com ícone */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-600 hover:text-black bg-white/80 rounded-full w-6 h-6 flex items-center justify-center z-10"
        >
          <MoreVertical size={12} />
        </button>

        {/* Menu suspenso com ícones */}
        {showMenu && (
          <div className="context-menu absolute right-0 top-8 w-52 bg-white rounded-lg shadow-lg z-50 py-1 animate-fade-in border border-gray-200">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.action}
                  className="context-menu-item flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleMenuClick(item.action)}
                >
                  <IconComponent size={16} className="mr-2 text-gray-500" />
                  <span className="flex-grow">{item.label}</span>
                </div>
              );
            })}
            <div className="border-t border-gray-200 mt-1"></div>
            <div
              className="context-menu-item flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => handleMenuClick("delete")}
            >
              <Trash2 size={16} className="mr-2 text-red-500" />
              <span className="flex-grow">Apagar</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
