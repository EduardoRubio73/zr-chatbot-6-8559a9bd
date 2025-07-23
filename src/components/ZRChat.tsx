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
    console.log('User ID:', user?.id);
    console.log('User object:', user);

    if (!user || !user.id) {
      console.error('Usuário não autenticado ou ID não encontrado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = conversations.find(conv => conv.id === conversationId);
    console.log('Conversa encontrada:', conversation);

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
      console.log('Tentativa de arquivar conversa com IARA');
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
        console.log('Arquivando conversa mock (conv_)');
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

      console.log('Verificando participação do usuário na conversa...');
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id, user_id, conversation_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Dados do participante:', participantData);
      console.log('Erro do participante:', participantError);

      if (participantError) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Erro ao verificar participação na conversa",
          variant: "destructive"
        });
        return;
      }

      if (!participantData) {
        console.error('Usuário não participa desta conversa');
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      console.log('Atualizando conversa para arquivada...');
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

      console.log('Conversa arquivada com sucesso!');
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
    console.log('User ID:', user?.id);

    if (!user || !user.id) {
      console.error('Usuário não autenticado ou ID não encontrado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = archivedConversations.find(conv => conv.id === conversationId);
    console.log('Conversa arquivada encontrada:', conversation);

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
      console.log('Tentativa de desarquivar conversa com IARA');
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
        console.log('Desarquivando conversa mock (conv_)');
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

      console.log('Verificando participação do usuário na conversa...');
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id, user_id, conversation_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Dados do participante:', participantData);
      console.log('Erro do participante:', participantError);

      if (participantError) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Erro ao verificar participação na conversa",
          variant: "destructive"
        });
        return;
      }

      if (!participantData) {
        console.error('Usuário não participa desta conversa');
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      console.log('Atualizando conversa para desarquivada...');
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

      console.log('Conversa desarquivada com sucesso!');
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
    console.log('User ID:', user?.id);

    if (!user || !user.id) {
      console.error('Usuário não autenticado ou ID não encontrado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    const conversation = conversations.find(conv => conv.id === conversationId) ||
                       archivedConversations.find(conv => conv.id === conversationId);

    console.log('Conversa encontrada:', conversation);

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
      console.log('Tentativa de excluir conversa com IARA');
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
        console.log('Excluindo conversa mock (conv_)');
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

      console.log('Verificando participação do usuário na conversa...');
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id, user_id, conversation_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Dados do participante:', participantData);
      console.log('Erro do participante:', participantError);

      if (participantError) {
        console.error('Erro ao verificar participação:', participantError);
        toast({
          title: "Erro",
          description: "Erro ao verificar participação na conversa",
          variant: "destructive"
        });
        return;
      }

      if (!participantData) {
        console.error('Usuário não participa desta conversa');
        toast({
          title: "Erro",
          description: "Você não participa desta conversa",
          variant: "destructive"
        });
        return;
      }

      console.log('Iniciando exclusão sequencial...');
      
      // Primeiro, excluir todas as mensagens da conversa
      console.log('Excluindo mensagens...');
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Erro ao excluir mensagens:', messagesError);
        throw messagesError;
      }

      // Segundo, excluir todos os participantes
      console.log('Excluindo participantes...');
      const { error: participantsError } = await supabase
        .from('participants')
        .delete()
        .eq('conversation_id', conversationId);

      if (participantsError) {
        console.error('Erro ao excluir participantes:', participantsError);
        throw participantsError;
      }

      // Por último, excluir a conversa
      console.log('Excluindo conversa...');
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Erro ao excluir conversa:', conversationError);
        throw conversationError;
      }

      console.log('Conversa excluída com sucesso!');
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
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
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
  'Rostos': [
    '😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', 
    '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', 
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', 
    '🤓', '😎', '🥸', '🤩', '🥳', '😣', '😖', '😫', '😩', '🥺', 
    '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶'
  ],
  'Gestos': [
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', 
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', 
    '🖖', '👏', '🙌', '🫶', '🤲', '🤝', '🙏', '✊', '👊', '🤛', 
    '🤜', '🤚', '🫵', '🫳', '🫴', '👌', '🤗', '🤦', '🤷', '🙋'
  ],
  'Corações': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', 
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', 
    '🫀', '💖', '💞', '💘', '💓', '💕', '💌', '💟', '💖', '💝'
  ],
  'Símbolos': [
    '💯', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💨', 
    '💦', '💤', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', 
    '🚀', '🌈', '☄️', '🪐', '🌍', '🌎', '🌏', '☀️', '🌙', '🌠'
  ],
  'Animais': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', 
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋'
  ],
  'Comida': [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', 
    '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥕', '🌽', '🌶️', '🥒', 
    '🥬', '🥦', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯'
  ],
  'Atividades': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', 
    '🏸', '🏒', '🏑', '🥍', '🏏', '🎳', '⛳', '⛸️', '🎿', '🛷', 
    '🛹', '🏄', '🏊', '🚴', '🚵', '🤸', '🤼', '🤺', '🤾', '🏋️'
  ],
  'Objetos': [
    '⌚', '📱', '💻', '🖥️', '🖨️', '🖱️', '🎮', '📷', '📸', '📹', 
    '📺', '📻', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎸', '🎻', 
    '🎬', '🎨', '🧵', '🪡', '📚', '📰', '📖', '✏️', '🖌️', '🔍'
  ],
  'Natureza': [
    '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌿', '🍀', '🌴', 
    '🌵', '🌾', '🌳', '🌲', '🍁', '🍂', '🍃', '🌊', '🏔️', '🌋', 
    '🗻', '🏕️', '🏞️', '🏜️', '🏝️', '🌅', '🌄', '🌌', '🌫️', '🌧️'
  ],
  'Locais': [
    '🏠', '🏡', '🏢', '🏬', '🏥', '🏦', '🏨', '🏪', '🏫', '🏛', 
    '⛪', '🕌', '🕍', '🕋', '⛩️', '🗿', '🏰', '🗽', '🗼', '🏯', 
    '🎡', '🎢', '⛲', '⛺', '🏖️', '🏜️', '🏝️', '🗻', '🏟️', '🛤'
  ]
};

  if (!user) {
    return null;
  }

  return (
    <div className={`h-screen w-full flex ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleMediaUpload(file, 'image');
      }} />
      <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleMediaUpload(file, 'video');
      }} />
      <input type="file" ref={documentInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleMediaUpload(file, 'document');
      }} />
      <input type="file" ref={fileInputRef} className="hidden" accept="*/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const fileType = file.type;
          let category: 'image' | 'audio' | 'video' | 'document' = 'document';
          if (fileType.startsWith('image/')) {
            category = 'image';
          } else if (fileType.startsWith('video/')) {
            category = 'video';
          } else if (fileType.startsWith('audio/')) {
            category = 'audio';
          }
          handleMediaUpload(file, category);
        }
      }} />

      {/* Sidebar */}
      <aside className={`${isMobile ? showSidebar ? 'w-full' : 'hidden' : 'w-80'} ${!isMobile ? 'border-r border-border' : ''} flex flex-col bg-background`}>
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold text-foreground">
              {showArchivedConversations ? 'Conversas Arquivadas' : 'ZRChat'}
            </h1>
            <div className="flex gap-1">
              {showArchivedConversations && (
                <Button variant="ghost" size="icon" onClick={() => setShowArchivedConversations(false)} title="Voltar">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} title="Perfil">
                <User className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu open={showArchivedMenu} onOpenChange={setShowArchivedMenu}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="Menu">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={handleArchivedConversationsClick}>
                    <Archive className="mr-2 h-4 w-4" />
                    Conversas Arquivadas ({archivedConversations.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar conversas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

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
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-muted' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative" onClick={e => {
                  e.stopPropagation();
                  handleAvatarClick(conv);
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
                <div className="flex-1 min-w-0" onClick={() => handleConversationClick(conv)}>
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

      <main className={`${isMobile ? showSidebar ? 'hidden' : 'w-full' : 'flex-1'} flex flex-col bg-background`}>
        {selectedConversation && (
          <>
            <header className="p-4 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Avatar className="h-10 w-10" onClick={() => handleAvatarClick(selectedConversation)}>
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
                  <Button variant="ghost" size="icon" title="Chamada de voz" onClick={() => handleCall('voice')}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={isRecording ? "Parar gravação de vídeo" : "Gravar vídeo"} onClick={isRecording ? stopVideoRecording : startVideoRecording} className={isRecording ? "text-red-500" : ""}>
                    <Video className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" title="Menu" disabled={loading}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem onClick={() => handleArchiveConversation(selectedConversation.id)} disabled={loading}>
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUnarchiveConversation(selectedConversation.id)} disabled={loading || !selectedConversation.is_archived}>
                        <Archive className="mr-2 h-4 w-4" />
                        Desarquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteConversation(selectedConversation.id)} disabled={loading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            <section className={`chat-body flex-1 overflow-y-auto px-4 py-2 space-y-2 ${selectedConversation.isIARA ? 'chat-bg-iara' : 'whatsapp-bg'}`}>
              <div className="py-4 flex flex-col gap-2">
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={{
                      id: msg.id,
                      message: msg.text,
                      sent_at: msg.sent_at || msg.timestamp,
                      is_read: msg.read || msg.is_read,
                      sender: msg.sender,
                      image_url: msg.image_url,
                      audio_url: msg.audio_url,
                      video_url: msg.video_url
                    }}
                    onMessageDeleted={messageId => {
                      setMessages(prev => prev.filter(m => m.id !== messageId));
                    }}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </section>

            <footer className="p-4 border-t border-border bg-background">
              <div className="flex items-center gap-2">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Emoji">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      {Object.entries(emojiCategories).map(([category, emojis]) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium mb-2">{category}</h4>
                          <div className="grid grid-cols-8 gap-2">
                            {emojis.map(emoji => (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                                onClick={() => handleEmojiSelect(emoji)}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <DropdownMenu open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Anexar">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                      <Image className="mr-2 h-4 w-4" />
                      Foto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      Vídeo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
                      <FileText className="mr-2 h-4 w-4" />
                      Documento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <File className="mr-2 h-4 w-4" />
                      Arquivo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={loading}
                  />
                </div>
                <Button
                  size="icon"
                  onClick={newMessage.trim() ? handleSend : handleMicClick}
                  className={`${newMessage.trim() ? "bg-[#25D366] hover:bg-[#20b456]" : isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#25D366] hover:bg-[#20b456]"} text-white transition-colors`}
                  disabled={loading}
                  title={newMessage.trim() ? "Enviar" : isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {newMessage.trim() ? <Send className="h-4 w-4" /> : <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />}
                </Button>
              </div>
            </footer>
          </>
        )}
      </main>

      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        user={selectedUserProfile}
      />
    </div>
  );
}
