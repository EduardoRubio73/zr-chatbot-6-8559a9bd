
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Moon, Sun, User, LogOut, MoreVertical, Search, ArrowLeft, Archive, Wifi, WifiOff } from "lucide-react";

interface ChatSidebarProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showArchivedConversations: boolean;
  setShowArchivedConversations: (value: boolean) => void;
  conversations: any[];
  archivedConversations: any[];
  selectedConversation: any;
  onConversationClick: (conv: any) => void;
  onAvatarClick: (conv: any) => void;
  onArchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onLogout: () => void;
  profile: any;
  user: any;
  isOnline: boolean;
  supabaseConnected: boolean;
  isMobile: boolean;
  showSidebar: boolean;
}

export default function ChatSidebar({
  darkMode,
  setDarkMode,
  searchQuery,
  setSearchQuery,
  showArchivedConversations,
  setShowArchivedConversations,
  conversations,
  archivedConversations,
  selectedConversation,
  onConversationClick,
  onAvatarClick,
  onArchiveConversation,
  onDeleteConversation,
  onLogout,
  profile,
  user,
  isOnline,
  supabaseConnected,
  isMobile,
  showSidebar
}: ChatSidebarProps) {
  const filteredConversations = (showArchivedConversations ? archivedConversations : conversations).filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArchivedConversationsClick = () => {
    setShowArchivedConversations(!showArchivedConversations);
  };

  // Don't render the sidebar if it shouldn't be shown
  if (isMobile && !showSidebar) {
    return null;
  }

  return (
    <aside className={`${isMobile ? 'w-full' : 'w-80'} ${!isMobile ? 'border-r border-border' : ''} flex flex-col bg-background`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-foreground">
            {showArchivedConversations ? 'Conversas Arquivadas' : 'ZRChat'}
          </h1>
          <div className="flex gap-1">
            {/* Status de conexão */}
            <div className="flex items-center gap-1 mr-2" title={isOnline && supabaseConnected ? "Online" : "Offline"}>
              {isOnline && supabaseConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {showArchivedConversations && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowArchivedConversations(false)}
                title="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.location.href = '/profile'}
              title="Perfil"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleArchivedConversationsClick}
              title="Conversas Arquivadas"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onLogout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              {profile?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {profile?.name || 'Usuário'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOnline && supabaseConnected ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conv) => (
          <div
            key={conv.id}
            className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
              selectedConversation?.id === conv.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative" onClick={(e) => {
                e.stopPropagation();
                onAvatarClick(conv);
              }}>
                <Avatar className="h-12 w-12 cursor-pointer">
                  <AvatarImage src={conv.avatar} alt={conv.name} />
                  <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                {conv.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
                {conv.isIARA && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">AI</span>
                  </div>
                )}
                {conv.unreadCount > 0 && !conv.isIARA && (
                  <div className="unread-badge">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0" onClick={() => onConversationClick(conv)}>
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-foreground truncate">
                    {conv.name}
                    {conv.isGroup && <span className="ml-1 text-xs">👥</span>}
                  </h3>
                  <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              
              {conv.unreadCount > 0 && (
                <Badge className="bg-green-500 text-white rounded-full min-w-[20px] h-5 text-xs">
                  {conv.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
