import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Moon, Sun, Send, Smile, Paperclip, Phone, Video, MoreVertical, Search, ArrowLeft, Menu, User, LogOut, Mic, File, Image, FileText, Camera, Archive, MessageSquareText, Reply, Copy, Heart, Forward, Pin, Star, NotebookPen, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from './UserProfileModal';
import { MessageBubble } from './MessageBubble';

export default function ZRChat() {
  const { user, profile, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [showArchivedMenu, setShowArchivedMenu] = useState(false);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowSidebar(window.innerWidth >= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      if (isMobile) {
        setShowSidebar(false);
      }
    }
  }, [selectedConversation, isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('participants')
        .select(`
          conversation_id,
          unread_count,
          conversations!inner (
            id,
            is_group,
            is_archived,
            last_message_at,
            groups (
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.log('No conversations found, creating mock data');
      }

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id);

      const iaraConversation = {
        id: `iara_${user.id}`,
        name: "IARA",
        avatar: `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`,
        lastMessage: "Olá! Como posso ajudá-lo hoje?",
        timestamp: "agora",
        unreadCount: 0,
        isOnline: true,
        user_id: '51379d47-df13-4005-b91a-11dd06f226be',
        isIARA: true,
        is_archived: false
      };

      const realConversations = participantsData?.map(participant => {
        const conv = participant.conversations;
        const otherUser = usersData?.find(u => u.id !== user.id);
        return {
          id: conv.id,
          name: conv.is_group ? conv.groups?.name : otherUser?.name || 'Usuário',
          avatar: conv.is_group ? conv.groups?.avatar_url : otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || 'Usuário')}&background=25D366&color=fff`,
          lastMessage: "Iniciar conversa",
          timestamp: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'agora',
          unreadCount: participant.unread_count || 0,
          isOnline: !conv.is_group,
          user_id: otherUser?.id,
          isIARA: false,
          is_group: conv.is_group,
          is_archived: conv.is_archived || false
        };
      }) || [];

      const allConversations = [iaraConversation, ...realConversations.filter(conv => !conv.is_archived)];
      const archivedConvs = realConversations.filter(conv => conv.is_archived);

      setConversations(allConversations);
      setArchivedConversations(archivedConvs);

      if (!selectedConversation && allConversations.length > 0) {
        setSelectedConversation(allConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (conversationId.startsWith('iara_')) {
      setMessages([]);
      return;
    }

    if (conversationId.startsWith('conv_')) {
      const otherUserId = conversationId.split('_')[2];
      await findOrCreateConversation(otherUserId);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          audio_url,
          image_url,
          video_url,
          sent_at,
          is_read,
          sender:users!sender_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.log('No messages found for conversation');
        setMessages([]);
        return;
      }

      const formattedMessages = data?.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        image_url: msg.image_url,
        audio_url: msg.audio_url,
        video_url: msg.video_url,
        sender: msg.sender?.id === user.id ? 'me' : 'other',
        timestamp: new Date(msg.sent_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        read: msg.is_read,
        sender_name: msg.sender?.name,
        sender_avatar: msg.sender?.avatar_url
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const findOrCreateConversation = async (otherUserId: string) => {
    try {
      const { data: existingConversation, error: searchError } = await supabase
        .from('participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            is_group
          )
        `)
        .eq('user_id', user.id)
        .neq('conversations.is_group', true);

      if (searchError) {
        console.error('Erro ao buscar conversas existentes:', searchError);
        setMessages([]);
        return;
      }

      let foundExistingConversation = null;
      if (existingConversation && existingConversation.length > 0) {
        for (const conv of existingConversation) {
          const { data: otherParticipants, error: participantsError } = await supabase
            .from('participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('user_id', user.id);

          if (!participantsError && otherParticipants && otherParticipants.length === 1) {
            if (otherParticipants[0].user_id === otherUserId) {
              foundExistingConversation = conv.conversation_id;
              break;
            }
          }
        }
      }

      if (foundExistingConversation) {
        setSelectedConversation(prev => ({ ...prev, id: foundExistingConversation }));
        loadMessages(foundExistingConversation);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro ao procurar conversa:', error);
      setMessages([]);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        const newMessage = payload.new;

        loadConversations();

        if (selectedConversation?.id && newMessage.conversation_id === selectedConversation.id) {
          const { data: senderData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) return prev;

            const formattedMessage = {
              id: newMessage.id,
              text: newMessage.text,
              image_url: newMessage.image_url,
              audio_url: newMessage.audio_url,
              video_url: newMessage.video_url,
              sender: newMessage.sender_id === user.id ? 'me' : 'other',
              timestamp: new Date(newMessage.sent_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              read: newMessage.is_read,
              sender_name: senderData?.name,
              sender_avatar: senderData?.avatar_url
            };

            if (newMessage.sender_id !== user.id) {
              playSound('livechat');
              markMessageAsRead(newMessage.id);
            }
            return [...prev, formattedMessage];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updatedMessage = payload.new;
        setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? {
          ...msg,
          read: updatedMessage.is_read
        } : msg));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendToIARA = async (message: string, retryCount = 0) => {
    const maxRetries = 3;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://zragency-n8n.cchxwl.easypanel.host/webhook/568f0a22-74a6-4c3e-8d8c-86a979c02150', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          user_id: user.id,
          user_name: profile?.name || user.email,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setTimeout(async () => {
        try {
          const responseText = await response.text();
          let iaraResponseText = "Obrigada pela sua mensagem! Estou processando sua solicitação...";

          if (responseText && responseText.trim()) {
            try {
              const data = JSON.parse(responseText);
              if (Array.isArray(data) && data.length > 0) {
                const firstItem = data[0];
                if (firstItem.output) {
                  iaraResponseText = firstItem.output;
                } else if (firstItem.content) {
                  iaraResponseText = firstItem.content;
                }
              } else if (data.output) {
                iaraResponseText = data.output;
              } else if (data.content) {
                iaraResponseText = data.content;
              } else if (data.response) {
                iaraResponseText = data.response;
              } else if (data.message) {
                iaraResponseText = data.message;
              } else if (data.result) {
                iaraResponseText = data.result;
              } else if (data.text) {
                iaraResponseText = data.text;
              } else if (typeof data === 'string') {
                iaraResponseText = data;
              }
            } catch (jsonError) {
              if (responseText.trim()) {
                iaraResponseText = responseText.trim();
              }
            }
          }

          const iaraResponse = {
            id: Date.now() + Math.random(),
            text: iaraResponseText,
            sender: "other" as const,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            read: false,
            sender_name: "IARA",
            sender_avatar: `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`
          };
          setMessages(prev => [...prev, iaraResponse]);
          playSound("livechat");
        } catch (error) {
          if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendToIARA(message, retryCount + 1);
          }

          const errorResponse = {
            id: Date.now() + Math.random(),
            text: "Desculpe, estou com dificuldades técnicas no momento. Nossa equipe já foi notificada. Tente novamente em alguns minutos.",
            sender: "other" as const,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            read: false,
            sender_name: "IARA",
            sender_avatar: `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`
          };
          setMessages(prev => [...prev, errorResponse]);
          playSound("livechat");
        }
      }, 1500);
    } catch (error) {
      if (retryCount < maxRetries - 1 && error.name !== 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return sendToIARA(message, retryCount + 1);
      }

      setTimeout(() => {
        const errorMessage = error.name === 'AbortError' ? "A conexão com IARA demorou muito para responder. Tente novamente." : retryCount >= maxRetries - 1 ? "Não foi possível conectar com IARA após várias tentativas. Verifique sua conexão e tente novamente." : "Erro de conexão com IARA. Tente novamente.";
        const errorResponse = {
          id: Date.now() + Math.random(),
          text: errorMessage,
          sender: "other" as const,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          read: false,
          sender_name: "IARA",
          sender_avatar: `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`
        };
        setMessages(prev => [...prev, errorResponse]);
        playSound("livechat");
      }, 1000);

      if (retryCount >= maxRetries - 1) {
        toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar com IARA após várias tentativas.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setLoading(true);
    try {
      if (selectedConversation.isIARA) {
        const msg = {
          id: Date.now(),
          text: newMessage,
          sender: "me" as const,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          read: false
        };
        setMessages(prev => [...prev, msg]);
        const messageToSend = newMessage;
        setNewMessage("");
        playSound("livechat");
        await sendToIARA(messageToSend);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return;
      }

      let conversationId = selectedConversation.id;

      if (conversationId.startsWith('conv_')) {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({ is_group: false })
          .select()
          .single();

        if (convError) {
          console.error('Erro ao criar conversa:', convError);
          throw convError;
        }

        conversationId = convData.id;

        const { error: participantsError } = await supabase
          .from('participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: selectedConversation.user_id }
          ]);

        if (participantsError) {
          console.error('Erro ao adicionar participantes:', participantsError);
          throw participantsError;
        }

        setSelectedConversation(prev => ({ ...prev, id: conversationId }));
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: newMessage
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
      }

      const msg = {
        id: data.id,
        text: newMessage,
        sender: "me" as const,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
      playSound("livechat");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro completo ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    console.log('=== INICIANDO ARQUIVAMENTO ===');
    console.log('Conversation ID:', conversationId);

    if (!user) {
      console.error('Usuário não autenticado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.error('Conversa não encontrada:', conversationId);
      toast({
        title: "Erro",
        description: "Conversa não encontrada",
        variant: "destructive"
      });
      return;
    }

    if (conversation.isIARA) {
      toast({
        title: "Ação não permitida",
        description: "Não é possível arquivar a conversa com IARA",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (conversationId.startsWith('conv_')) {
        console.log('Arquivando conversa mock');
        setArchivedConversations(prev => [...prev, { ...conversation, is_archived: true }]);
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }

        toast({
          title: "Conversa arquivada",
          description: `Conversa com ${conversation.name} foi arquivada`
        });
        return;
      }

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participantData) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Erro ao arquivar conversa:', updateError);
        toast({
          title: "Erro",
          description: "Erro ao arquivar conversa",
          variant: "destructive"
        });
        return;
      }

      setArchivedConversations(prev => [...prev, { ...conversation, is_archived: true }]);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      toast({
        title: "Conversa arquivada",
        description: `Conversa com ${conversation.name} foi arquivada`
      });

    } catch (error) {
      console.error('Erro inesperado ao arquivar conversa:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao arquivar conversa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveConversation = async (conversationId: string) => {
    console.log('=== INICIANDO DESARQUIVAMENTO ===');
    console.log('Conversation ID:', conversationId);

    if (!user) {
      console.error('Usuário não autenticado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = archivedConversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.error('Conversa arquivada não encontrada:', conversationId);
      toast({
        title: "Erro",
        description: "Conversa arquivada não encontrada",
        variant: "destructive"
      });
      return;
    }

    if (conversation.isIARA) {
      toast({
        title: "Ação não permitida",
        description: "Não é possível desarquivar a conversa com IARA",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (conversationId.startsWith('conv_')) {
        console.log('Desarquivando conversa mock');
        setConversations(prev => [...prev, { ...conversation, is_archived: false }]);
        setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId));

        if (selectedConversation?.id === conversationId) {
          setSelectedConversation({ ...conversation, is_archived: false });
        }

        toast({
          title: "Conversa desarquivada",
          description: `Conversa com ${conversation.name} foi desarquivada`
        });
        return;
      }

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participantData) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ is_archived: false })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Erro ao desarquivar conversa:', updateError);
        toast({
          title: "Erro",
          description: "Erro ao desarquivar conversa",
          variant: "destructive"
        });
        return;
      }

      setConversations(prev => [...prev, { ...conversation, is_archived: false }]);
      setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation({ ...conversation, is_archived: false });
      }

      toast({
        title: "Conversa desarquivada",
        description: `Conversa com ${conversation.name} foi desarquivada`
      });

    } catch (error) {
      console.error('Erro inesperado ao desarquivar conversa:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao desarquivar conversa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    console.log('=== INICIANDO EXCLUSÃO ===');
    console.log('Conversation ID:', conversationId);

    if (!user) {
      console.error('Usuário não autenticado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = conversations.find(conv => conv.id === conversationId) ||
                       archivedConversations.find(conv => conv.id === conversationId);

    if (!conversation) {
      console.error('Conversa não encontrada:', conversationId);
      toast({
        title: "Erro",
        description: "Conversa não encontrada",
        variant: "destructive"
      });
      return;
    }

    if (conversation.isIARA) {
      toast({
        title: "Ação não permitida",
        description: "Não é possível excluir a conversa com IARA",
        variant: "destructive"
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir permanentemente a conversa com ${conversation.name}? Esta ação não pode ser desfeita.`
    );
    if (!confirmDelete) return;

    setLoading(true);

    try {
      if (conversationId.startsWith('conv_')) {
        console.log('Excluindo conversa mock');
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId));

        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }

        toast({
          title: "Conversa excluída",
          description: `Conversa com ${conversation.name} foi excluída`
        });
        return;
      }

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participantData) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      try {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId);

        if (messagesError) throw messagesError;

        const { error: participantsError } = await supabase
          .from('participants')
          .delete()
          .eq('conversation_id', conversationId);

        if (participantsError) throw participantsError;

        const { error: conversationError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);

        if (conversationError) throw conversationError;

        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId));

        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
        }

        toast({
          title: "Conversa excluída",
          description: `Conversa com ${conversation.name} foi excluída permanentemente`
        });

      } catch (error) {
        console.error('Erro na transação de exclusão:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir conversa do banco de dados",
          variant: "destructive"
        });
        throw error;
      }

    } catch (error) {
      console.error('Erro inesperado ao excluir conversa:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir conversa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video' | 'document') => {
    if (!selectedConversation || !user) return;

    if (selectedConversation.isIARA) {
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Upload de arquivos para IARA será implementado em breve"
      });
      return;
    }

    const bucket = {
      image: 'chat-imagens',
      audio: 'chat-audios',
      video: 'chat-videos',
      document: 'chat-documentos'
    }[type];

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      let conversationId = selectedConversation.id;

      if (conversationId.startsWith('conv_')) {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({ is_group: false })
          .select()
          .single();

        if (convError) throw convError;

        conversationId = convData.id;

        await supabase.from('participants').insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: selectedConversation.user_id }
        ]);
      }

      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        [type === 'image' ? 'image_url' : type === 'audio' ? 'audio_url' : type === 'video' ? 'video_url' : 'document_url']: urlData.publicUrl
      };

      const { data: msgData, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) throw insertError;

      const msg = {
        id: msgData.id,
        text: '',
        [type === 'image' ? 'image_url' : type === 'audio' ? 'audio_url' : type === 'video' ? 'video_url' : 'document_url']: urlData.publicUrl,
        sender: "me",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      setMessages(prev => [...prev, msg]);
      toast({
        title: "Sucesso",
        description: "Mídia enviada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da mídia",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const playSound = (type: "chat" | "livechat") => {
    const audio = new Audio(type === "chat" ? "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/new-notification.mp3" : "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/livechat.mp3");
    audio.play().catch(() => {
      console.log('Audio play failed - user interaction may be required');
    });
  };

  const filteredConversations = (showArchivedConversations ? archivedConversations : conversations).filter(conv => conv.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleCall = async (type: 'voice' | 'video') => {
    if (!selectedConversation || selectedConversation.isIARA) {
      toast({
        title: "Ligação não disponível",
        description: "Não é possível fazer ligações para IARA.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('whatsapp, name')
        .eq('id', selectedConversation.user_id)
        .single();

      if (error || !userData?.whatsapp) {
        toast({
          title: "Número não encontrado",
          description: "Usuário não possui número de telefone cadastrado.",
          variant: "destructive"
        });
        return;
      }

      let phoneNumber = userData.whatsapp;
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+55' + phoneNumber.replace(/\D/g, '');
      }

      const telUrl = `tel:${phoneNumber}`;
      window.location.href = telUrl;
      toast({
        title: `Iniciando ${type === 'voice' ? 'ligação' : 'videochamada'}`,
        description: `Conectando com ${userData.name}...`
      });
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a ligação.",
        variant: "destructive"
      });
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });

      setRecordingStream(stream);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const videoBlob =eatures new Blob(chunks, { type: 'video/webm' });
        const videoFile = videoBlob as any;
        videoFile.name = `video_${Date.now()}.webm`;
        await handleMediaUpload(videoFile, 'video');
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
        setIsRecording(false);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      toast({
        title: "Gravação iniciada",
        description: "Toque novamente para parar a gravação."
      });
    } catch (error) {
      console.error('Erro ao iniciar gravação de vídeo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive"
      });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowSidebar(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = Object.assign(audioBlob, {
          name: `audio-${Date.now()}.webm`,
          lastModified: Date.now()
        }) as File;

        await handleMediaUpload(audioFile, 'audio');
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleConversationClick = (conv: any) => {
    if (!selectedConversation || selectedConversation.id !== conv.id) {
      setSelectedConversation(conv);
    }
  };

  const handleAvatarClick = (conv: any) => {
    setSelectedUserProfile(conv);
    setShowUserProfileModal(true);
  };

  const handleArchivedConversationsClick = () => {
    setShowArchivedConversations(!showArchivedConversations);
    setShowArchivedMenu(false);
  };

  const emojiCategories = {
    'Rostos': ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨',