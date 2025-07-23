import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Send, Smile, Paperclip, MoreVertical, Search, ArrowLeft, Menu, User, LogOut, Check, CheckCheck, Archive, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  unreadCount: number;
  avatar: string;
  isOnline: boolean;
  isIARA?: boolean;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  sentAt: string;
  isRead: boolean;
}

const initialConversations: Conversation[] = [
  {
    id: '1',
    name: 'Suporte Técnico',
    lastMessage: 'Olá! Como podemos ajudar?',
    unreadCount: 2,
    avatar: 'https://github.com/shadcn.png',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Vendas',
    lastMessage: 'Confira nossas ofertas!',
    unreadCount: 0,
    avatar: 'https://avatars.githubusercontent.com/u/88202776?v=4',
    isOnline: false,
  },
  {
    id: '3',
    name: 'IARA',
    lastMessage: 'Confira nossas ofertas!',
    unreadCount: 0,
    avatar: 'https://avatars.githubusercontent.com/u/88202776?v=4',
    isOnline: true,
    isIARA: true,
  },
];

const ZRChatSupabase = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const sendMessage = () => {
    if (newMessage.trim() !== '') {
      const newMessageObj: Message = {
        id: String(Date.now()),
        text: newMessage,
        senderId: 'me',
        sentAt: new Date().toISOString(),
        isRead: false,
      };

      setMessages([...messages, newMessageObj]);
      setNewMessage('');

      // Simulate marking the message as read after a delay
      setTimeout(() => {
        setMessages(currentMessages =>
          currentMessages.map(msg =>
            msg.id === newMessageObj.id ? { ...msg, isRead: true } : msg
          )
        );
      }, 1000);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const loadIaraMessages = (conversationId: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const iaraMessages: Message[] = [
        {
          id: 'iara1',
          text: 'Olá! Sou a IARA, sua assistente virtual.',
          senderId: 'iara',
          sentAt: new Date().toISOString(),
          isRead: true,
        },
        {
          id: 'iara2',
          text: 'Em que posso ajudar hoje?',
          senderId: 'iara',
          sentAt: new Date().toISOString(),
          isRead: true,
        },
      ];
      setMessages(iaraMessages);
      setIsLoading(false);
    }, 500);
  };

  const loadMessages = (conversationId: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const initialMessages: Message[] = [
        {
          id: '1',
          text: 'Olá! Como podemos ajudar?',
          senderId: 'them',
          sentAt: new Date().toISOString(),
          isRead: true,
        },
        {
          id: '2',
          text: 'Preciso de suporte técnico.',
          senderId: 'me',
          sentAt: new Date().toISOString(),
          isRead: true,
        },
      ];
      setMessages(initialMessages);
      setIsLoading(false);
    }, 500);
  };

  const handleArchiveConversation = (conversationId: string) => {
    toast({
      title: "Conversa arquivada!",
      description: "A conversa foi movida para o arquivo.",
    })
  };

  const handleDeleteConversation = (conversationId: string) => {
     toast({
      title: "Conversa excluída!",
      description: "A conversa foi removida permanentemente.",
    })
  };

  const handleConversationClick = (conv: any) => {
    if (!selectedConversation || selectedConversation.id !== conv.id) {
      setSelectedConversation(conv);
      if (conv.isIARA) {
        loadIaraMessages(conv.id);
      } else {
        loadMessages(conv.id);
      }
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-16'} transition-all duration-300 border-r border-border bg-background/90 backdrop-blur-sm flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold text-lg">ZRChat</span>}
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            {isSidebarOpen ? <ArrowLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full bg-secondary border border-input rounded-md py-2 pl-8 pr-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-sm text-foreground"
              value={searchText}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 border-b border-border hover:bg-muted cursor-pointer transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-muted' : ''
              }`}
              onClick={() => handleConversationClick(conv)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={conv.avatar} alt={conv.name} />
                  <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{conv.name}</p>
                    {conv.unreadCount > 0 && (
                      <Badge variant="secondary">{conv.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{conv.lastMessage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-transparent max-w-[600px] mx-auto">
        {selectedConversation ? (
          <>
            {/* Chat Header with Archive and Delete buttons */}
            <header className="p-4 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
                    <AvatarFallback>{selectedConversation.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {selectedConversation.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.isOnline ? 'online' : 'última vez hoje às 14:30'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Arquivar conversa" 
                    onClick={() => handleArchiveConversation(selectedConversation.id)}
                    className="h-10 w-10"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Excluir conversa" 
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Chat Messages */}
            <section 
              className={`flex-1 overflow-y-auto p-4 chat-body ${
                isDarkMode ? 'dark-scrollbar' : 'light-scrollbar'
              }`} 
              ref={messagesEndRef}
            >
              {isLoading ? (
                <div className="text-center text-muted-foreground">Carregando mensagens...</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-2 flex flex-col ${msg.senderId === 'me' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`rounded-xl px-3 py-2 ${msg.senderId === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                        }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {msg.senderId === 'me' ? 'Você' : selectedConversation.name} -{' '}
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.senderId === 'me' && (
                        <span className="ml-1">
                          {msg.isRead ? <CheckCheck className="h-3 w-3 inline-block" /> : <Check className="h-3 w-3 inline-block" />}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Message Input */}
            <footer className="p-4 border-t border-border bg-background/90 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="resize-none flex-1"
                />
                <Button onClick={sendMessage} disabled={newMessage.trim() === ''}>
                  <Send className="h-5 w-5 rotate-90" />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Bem-vindo ao ZRChat</h2>
              <p className="text-muted-foreground">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ZRChatSupabase;
