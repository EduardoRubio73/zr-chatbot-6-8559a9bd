import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Send, Smile, Paperclip, MoreVertical, Search, ArrowLeft, Menu, User, LogOut, Check, CheckCheck } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { validateMessage, sanitizeMessage, validateFileUpload, sanitizeFilename } from '@/utils/inputValidation';
import ChatHeader from './ChatHeader';

export default function ZRChatSupabase() {
  const { user, profile, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showArchivedMenu, setShowArchivedMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // WhatsApp background URL
  const whatsappBackground = "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens//back%20whsats.jpg";

  // Format time function
  const formatTime = useCallback((dateString: string) => {
    if (!dateString) return "00:00";
    try {
      return new Date(dateString).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.warn("Error formatting time:", error);
      return "00:00";
    }
  }, []);

  // Optimistic message update
  const addOptimisticMessage = useCallback((message) => {
    const optimisticMessage = {
      ...message,
      id: `temp-${Date.now()}`,
      isOptimistic: true,
      created_at: new Date().toISOString(),
      sender: "me",
      isRead: false
    };
    setMessages(prev => [...prev, optimisticMessage]);
    return optimisticMessage.id;
  }, []);

  // Update optimistic message with real data
  const updateOptimisticMessage = useCallback((tempId: string, realMessage) => {
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? { ...realMessage, sender: "me" } : msg
    ));
  }, []);

  // Remove failed optimistic message
  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
      setupPresenceChannel();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      console.log('Carregando conversas para usuário:', user.id);
      
      // Buscar conversas reais do usuário no banco
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            is_group,
            last_message_at,
            is_archived,
            groups (
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('conversations.is_archived', 'false'); // Apenas conversas não arquivadas

      if (participantsError) {
        console.log('Erro ao buscar conversas:', participantsError);
      }

      const realConversations = [];

      // Processar conversas existentes
      if (participantsData && participantsData.length > 0) {
        for (const participant of participantsData) {
          const conversation = participant.conversations;
          
          if (conversation.is_group) {
            // Conversa em grupo
            const group = conversation.groups;
            realConversations.push({
              id: conversation.id,
              name: group?.name || 'Grupo',
              avatar: group?.avatar_url || "https://ui-avatars.com/api/?name=Grupo&background=25D366&color=fff",
              lastMessage: "Última mensagem...",
              timestamp: conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "agora",
              unreadCount: 0,
              isOnline: false,
              isGroup: true
            });
          } else {
            // Conversa individual - buscar o outro participante
            const { data: otherParticipants, error: otherError } = await supabase
              .from('participants')
              .select(`
                user_id,
                users!inner (
                  id,
                  name,
                  email,
                  avatar_url,
                  is_online
                )
              `)
              .eq('conversation_id', conversation.id)
              .neq('user_id', user.id);

            if (!otherError && otherParticipants && otherParticipants.length > 0) {
              const otherUser = otherParticipants[0].users;
              realConversations.push({
                id: conversation.id,
                name: otherUser.name || otherUser.email.split('@')[0],
                avatar: otherUser.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
                lastMessage: "Última mensagem...",
                timestamp: conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "agora",
                unreadCount: 0,
                isOnline: onlineUsers.has(otherUser.id),
                otherUserId: otherUser.id,
                isGroup: false
              });
            }
          }
        }
      }

      // Adicionar IARA como opção especial
      realConversations.unshift({
        id: `iara_${user.id}`,
        name: 'IARA',
        avatar: 'https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff',
        lastMessage: 'Assistente de IA disponível...',
        timestamp: 'agora',
        unreadCount: 0,
        isOnline: true,
        isIARA: true,
        isGroup: false
      });

      // Buscar todos os usuários para criar opções de novas conversas
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, is_online')
        .neq('id', user.id);

      if (usersError) {
        console.log('Erro ao buscar usuários:', usersError);
      }

      // Adicionar usuários que ainda não têm conversa
      if (allUsers) {
        for (const otherUser of allUsers) {
          // Verificar se já existe conversa com este usuário
          const existingConversation = realConversations.find(conv => 
            conv.otherUserId === otherUser.id
          );
          
          if (!existingConversation) {
            // Criar entrada para nova conversa potencial
            realConversations.push({
              id: `new-${user.id}-${otherUser.id}`, // ID temporário para novas conversas
              name: otherUser.name || otherUser.email.split('@')[0],
              avatar: otherUser.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
              lastMessage: "Iniciar conversa...",
              timestamp: "agora",
              unreadCount: 0,
              isOnline: onlineUsers.has(otherUser.id),
              otherUserId: otherUser.id,
              isNew: true, // Flag para identificar conversas novas
              isGroup: false
            });
          }
        }
      }

      setConversations(realConversations);
      
      // Se não há conversa selecionada e há conversas disponíveis, selecionar a primeira
      if (!selectedConversation && realConversations.length > 0) {
        setSelectedConversation(realConversations[0]);
      }
      
      console.log('Conversas carregadas com sucesso:', realConversations.length);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas.",
        variant: "destructive",
      });
    }
  };

  const loadIaraMessages = async (conversationId: string) => {
    if (!conversationId.startsWith('iara_') || !user) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('n8n_conversations')
        .select('message')
        .eq('session_id', conversationId)
        .order('id', { ascending: true });

      if (error) {
        console.error('Erro ao carregar mensagens da IARA:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar mensagens anteriores da IARA",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        const formattedMessages = data.map((item: any, index: number) => {
          const message = item.message;
          const isUserMessage = message.user_id === user.id;
          return {
            id: `${conversationId}_${index}`,
            message: isUserMessage ? message.message : (message.output || message.content || message.response || message.text || message.message || "Mensagem recebida"),
            sender: isUserMessage ? "me" : "other",
            created_at: new Date(message.timestamp || Date.now()).toISOString(),
            isRead: true,
            sender_name: isUserMessage ? (profile?.name || user.email) : "IARA",
            sender_avatar: isUserMessage
              ? (profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || user.email)}&background=25D366&color=fff`)
              : `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`
          };
        });

        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar mensagens da IARA:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar mensagens da IARA",
        variant: "destructive"
      });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      console.log('📨 Carregando mensagens para conversa:', conversationId);
      
      // Limpar mensagens imediatamente ao trocar de conversa
      setMessages([]);
      
      // Se é conversa com IARA, carregar mensagens especiais
      if (conversationId.startsWith('iara_')) {
        await loadIaraMessages(conversationId);
        return;
      }
      
      // Se é uma conversa nova, não carregar mensagens
      if (conversationId.startsWith('new-')) {
        console.log('💬 Nenhuma conversa existente encontrada, mensagens em branco até enviar primeira mensagem');
        return;
      }
      
      // ===== BUSCAR MENSAGENS COM DADOS DO REMETENTE =====
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          audio_url,
          image_url,
          video_url,
          sent_at,
          is_read,
          sender_id,
          sender:users!sender_id(
            id,
            name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Erro ao carregar mensagens:', messagesError);
        return;
      }

      // ===== TRANSFORMAR MENSAGENS PARA O FORMATO ESPERADO =====
      const formattedMessages = (messagesData || []).map(msg => ({
        id: msg.id,
        message: msg.text || '',
        audio_url: msg.audio_url,
        image_url: msg.image_url,
        video_url: msg.video_url,
        sender: msg.sender_id === user.id ? 'me' : 'other',
        sender_name: msg.sender?.name || 'Usuário',
        sender_avatar: msg.sender?.avatar_url,
        created_at: msg.sent_at,
        isRead: msg.is_read
      }));

      setMessages(formattedMessages);
      console.log('✅ Mensagens carregadas com sucesso:', formattedMessages.length);

      // ===== MARCAR MENSAGENS COMO LIDAS =====
      if (formattedMessages.length > 0) {
        const unreadMessages = formattedMessages
          .filter(msg => msg.sender !== 'me' && !msg.isRead)
          .map(msg => msg.id);

        if (unreadMessages.length > 0) {
          console.log('📋 Marcando mensagens como lidas:', unreadMessages.length);
          const { error: readError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages);

          if (readError) {
            console.error('⚠️ Erro ao marcar mensagens como lidas:', readError);
          } else {
            console.log('✅ Mensagens marcadas como lidas');
          }
        }
      }
    } catch (error) {
      console.error('💥 Erro ao carregar mensagens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens da conversa.",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = useCallback(() => {
    console.log('Configurando subscription em tempo real');
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        console.log('Nova mensagem recebida:', payload);
        const newMessage = payload.new;
        
        // Evitar duplicatas
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          return [...prev, {
            ...newMessage,
            sender: newMessage.sender_id === user.id ? 'me' : 'other',
            created_at: newMessage.sent_at
          }];
        });
        
        if (newMessage.sender_id !== user.id) {
          playSound('livechat');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const setupPresenceChannel = useCallback(() => {
    if (!user) return;

    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const users = new Set();
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.add(presence.user_id);
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id]);

  const handleRefreshConversation = useCallback(async () => {
    if (!selectedConversation) {
      toast({
        title: "Erro",
        description: "Nenhuma conversa selecionada para atualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Atualizando conversa:', selectedConversation.id);
      
      toast({
        title: "Atualizando...",
        description: "Carregando mensagens mais recentes.",
      });

      // Recarregar as mensagens da conversa atual
      await loadMessages(selectedConversation.id);
      
      toast({
        title: "Sucesso",
        description: "Conversa atualizada com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a conversa.",
        variant: "destructive",
      });
    }
  }, [selectedConversation, toast]);

  const getOrCreateConversation = async (otherUserId: string) => {
    try {
      // ✔ Verificar se 'user' está definido
      if (!user?.id) {
        console.error('Usuário não autenticado - user.id não definido');
        throw new Error('Usuário não autenticado');
      }

      console.log('🔍 Buscando conversa existente entre:', user.id, 'e', otherUserId);

      // Buscar conversas do usuário atual
      const { data: myConversations, error: myConversationsError } = await supabase
        .from('participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            is_group,
            is_archived
          )
        `)
        .eq('user_id', user.id)
        .eq('conversations.is_group', false)  
        .eq('conversations.is_archived', 'false');

      if (myConversationsError) {
        console.error('❌ Erro ao buscar minhas conversas:', myConversationsError);
        throw myConversationsError;
      }

      console.log('📋 Minhas conversas encontradas:', myConversations?.length || 0);

      // Verificar se alguma dessas conversas tem o outro usuário
      if (myConversations && myConversations.length > 0) {
        for (const myConv of myConversations) {
          const { data: otherParticipant, error: otherError } = await supabase
            .from('participants')
            .select('user_id')
            .eq('conversation_id', myConv.conversation_id)
            .eq('user_id', otherUserId)
            .maybeSingle();

          if (!otherError && otherParticipant) {
            console.log('✅ Conversa existente encontrada:', myConv.conversation_id);
            return myConv.conversation_id;
          }
        }
      }

      // ===== CRIAR NOVA CONVERSA =====
      console.log('🆕 Criando nova conversa...');
      
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          is_group: false,
          is_archived: 'false'
        })
        .select('*')
        .single();

      if (createError) {
        console.error('❌ Erro ao criar conversa:', createError);
        throw createError;
      }

      if (!newConversation) {
        console.error('❌ Conversa não foi criada - retorno vazio');
        throw new Error('Conversa não foi criada');
      }

      console.log('✅ Conversa criada com sucesso:', newConversation.id);

      // ===== ADICIONAR PARTICIPANTES =====
      console.log('👥 Adicionando participantes...');
      
      const participantsToAdd = [
        { 
          conversation_id: newConversation.id, 
          user_id: user.id 
        },
        { 
          conversation_id: newConversation.id, 
          user_id: otherUserId 
        }
      ];

      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .insert(participantsToAdd)
        .select('*');

      if (participantsError) {
        console.error('❌ Erro ao adicionar participantes:', participantsError);
        // Tentar deletar a conversa criada em caso de erro
        await supabase.from('conversations').delete().eq('id', newConversation.id);
        throw participantsError;
      }

      if (!participants || participants.length !== 2) {
        console.error('❌ Participantes não foram adicionados corretamente:', participants);
        // Tentar deletar a conversa criada em caso de erro
        await supabase.from('conversations').delete().eq('id', newConversation.id);
        throw new Error('Participantes não foram adicionados corretamente');
      }

      console.log('✅ Participantes adicionados com sucesso:', participants.length);
      
      // ✔ Forçar reload das conversas após criação
      setTimeout(() => {
        loadConversations();
      }, 100);
      
      return newConversation.id;
    } catch (error) {
      console.error('💥 Erro em getOrCreateConversation:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || !user || !newMessage.trim()) return;
    
    let conversationId = selectedConversation.id;
    
    // ===== CRIAR CONVERSA SE NECESSÁRIO =====
    if (conversationId.startsWith('new-')) {
      console.log('🆕 Criando nova conversa para:', selectedConversation.otherUserId);
      try {
        conversationId = await getOrCreateConversation(selectedConversation.otherUserId);
        
        // Atualizar o selectedConversation com o ID real
        setSelectedConversation(prev => ({
          ...prev,
          id: conversationId,
          isNew: false
        }));
      } catch (error) {
        console.error('❌ Erro ao criar conversa:', error);
        toast({
          title: "Erro",
          description: `Não foi possível criar a conversa: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // ===== VALIDAR MENSAGEM =====
    const validation = validateMessage(newMessage);
    if (!validation.isValid) {
      setMessageError(validation.error || "Mensagem inválida");
      return;
    }

    // Limpar erro anterior
    setMessageError("");
    
    // Sanitizar mensagem
    const sanitizedMessage = sanitizeMessage(newMessage);
    
    // Adicionar mensagem otimista imediatamente
    const tempId = addOptimisticMessage({ message: sanitizedMessage });
    
    // Limpar input imediatamente
    setNewMessage("");
    
    // Focar no input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    try {
      console.log('📤 Enviando mensagem para conversa:', conversationId);

      // ===== ENVIAR MENSAGEM =====
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: sanitizedMessage
        })
        .select('*')
        .single();

      if (messageError) {
        console.error('❌ Erro ao enviar mensagem:', messageError);
        throw messageError;
      }

      if (!message) {
        console.error('❌ Mensagem não foi criada - retorno vazio');
        throw new Error('Mensagem não foi criada');
      }

      console.log('✅ Mensagem enviada com sucesso:', message.id);

      // Atualizar mensagem otimista com dados reais
      updateOptimisticMessage(tempId, {
        id: message.id,
        message: sanitizedMessage,
        created_at: message.sent_at,
        isRead: false
      });
      
      playSound("livechat");
      
    } catch (error) {
      console.error('💥 Erro ao enviar mensagem:', error);
      
      // Remover mensagem otimista em caso de falha
      removeOptimisticMessage(tempId);
      
      toast({
        title: "Erro ao enviar mensagem",
        description: `Não foi possível enviar a mensagem: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video') => {
    if (!selectedConversation || !user) return;

    // ===== VALIDAR ARQUIVO =====
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      toast({
        title: "Erro no upload",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const bucket = {
      image: 'chat-imagens',
      audio: 'chat-audios',
      video: 'chat-videos'
    }[type];

    // Adicionar mensagem otimista para mídia
    const tempId = addOptimisticMessage({ 
      message: `[${type.toUpperCase()}]`,
      [`${type}_url`]: URL.createObjectURL(file)
    });

    try {
      console.log('📎 Fazendo upload de arquivo:', file.name, 'tipo:', type);
      
      // ===== PREPARAR ARQUIVO =====
      const fileExt = file.name.split('.').pop();
      const sanitizedName = sanitizeFilename(file.name.replace(`.${fileExt}`, ''));
      const fileName = `${Date.now()}-${sanitizedName}.${fileExt}`;
      const filePath = `${fileName}`;

      // ===== UPLOAD DO ARQUIVO =====
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      console.log('✅ Upload realizado com sucesso:', urlData.publicUrl);

      // ===== CRIAR CONVERSA SE NECESSÁRIO =====
      let conversationId = selectedConversation.id;
      
      if (conversationId.startsWith('new-')) {
        console.log('🆕 Criando nova conversa para mídia:', selectedConversation.otherUserId);
        conversationId = await getOrCreateConversation(selectedConversation.otherUserId);
        
        // Atualizar o selectedConversation com o ID real
        setSelectedConversation(prev => ({
          ...prev,
          id: conversationId,
          isNew: false
        }));
      }
      
      // ===== CRIAR MENSAGEM COM MÍDIA =====
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        [`${type}_url`]: urlData.publicUrl
      };

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*')
        .single();

      if (messageError) {
        console.error('❌ Erro ao criar mensagem:', messageError);
        throw messageError;
      }

      if (!message) {
        console.error('❌ Mensagem não foi criada - retorno vazio');
        throw new Error('Mensagem não foi criada');
      }

      console.log('✅ Mensagem com mídia criada:', message.id);

      // Atualizar mensagem otimista com dados reais
      updateOptimisticMessage(tempId, {
        id: message.id,
        message: `[${type.toUpperCase()}]`,
        created_at: message.sent_at,
        isRead: false,
        [`${type}_url`]: urlData.publicUrl
      });

      playSound("livechat");

    } catch (error) {
      console.error('💥 Erro ao fazer upload:', error);
      
      // Remover mensagem otimista em caso de falha
      removeOptimisticMessage(tempId);
      
      toast({
        title: "Erro no upload",
        description: `Não foi possível enviar o arquivo: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const playSound = useCallback((type: "chat" | "livechat") => {
    const audio = new Audio(
      type === "chat"
        ? "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/new-notification.mp3"
        : "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/livechat.mp3"
    );
    audio.play().catch(() => {
      console.log('Audio play failed - user interaction may be required');
    });
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Limpar erro quando usuário começar a digitar
    if (messageError) {
      setMessageError("");
    }

    // Indicador de digitação
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleArchiveConversation = useCallback(async (conversationId: string) => {
    try {
      console.log('🗃️ Iniciando arquivamento da conversa:', conversationId);
      
      setLoading(true);

      // Se é uma conversa nova ou IARA, apenas remover da lista local
      if (conversationId.startsWith('new-') || conversationId.startsWith('iara_')) {
        console.log('ℹ️ Removendo conversa não iniciada da lista local');
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }

        toast({
          title: "Sucesso",
          description: "Contato removido da lista!",
        });
        
        setLoading(false);
        return;
      }

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      // Verificar se a conversa existe primeiro
      const { data: conversationCheck, error: conversationError } = await supabase
        .from('conversations')
        .select('id, is_archived')
        .eq('id', conversationId)
        .eq('is_archived', 'false')
        .maybeSingle();

      if (conversationError) {
        console.error('❌ Erro ao verificar conversa:', conversationError);
        throw conversationError;
      }

      if (!conversationCheck) {
        console.error('❌ Conversa não encontrada ou já arquivada');
        throw new Error('Conversa não encontrada ou já arquivada');
      }

      // Verificar se o usuário participa da conversa
      const { data: participantCheck, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) {
        console.error('❌ Erro ao verificar participação:', participantError);
        throw participantError;
      }

      if (!participantCheck) {
        console.error('❌ Usuário não participa desta conversa');
        throw new Error('Você não tem permissão para arquivar esta conversa');
      }

      console.log('✅ Usuário tem permissão para arquivar a conversa');

      // Arquivar a conversa (alterar is_archived para true)
      const { data: updatedConversation, error: updateError } = await supabase
        .from('conversations')
        .update({ is_archived: 'true' })
        .eq('id', conversationId)
        .eq('is_archived', 'false')
        .select('id, is_archived')
        .maybeSingle();

      if (updateError) {
        console.error('❌ Erro ao arquivar conversa:', updateError);
        throw updateError;
      }

      if (!updatedConversation) {
        console.error('❌ Nenhuma conversa foi arquivada - possível problema de permissão ou conversa já arquivada');
        throw new Error('Não foi possível arquivar a conversa. Verifique suas permissões');
      }

      console.log('✅ Conversa arquivada com sucesso:', updatedConversation);

      // Remover da lista local
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Se era a conversa selecionada, limpar seleção
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      toast({
        title: "Sucesso",
        description: "Conversa arquivada com sucesso!",
      });

    } catch (error) {
      console.error('💥 Erro ao arquivar conversa:', error);
      toast({
        title: "Erro",
        description: `Não foi possível arquivar a conversa: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedConversation, toast]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    try {
      console.log('🗑️ Iniciando exclusão da conversa:', conversationId);
      
      setLoading(true);

      // Se é uma conversa nova ou IARA, apenas remover da lista local
      if (conversationId.startsWith('new-') || conversationId.startsWith('iara_')) {
        console.log('ℹ️ Removendo conversa não iniciada da lista local');
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }

        toast({
          title: "Sucesso",
          description: "Contato removido da lista!",
        });
        
        setLoading(false);
        return;
      }

      // Verificar se o usuário está autenticado
      if (!user?.id) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      // Verificar se a conversa existe primeiro
      const { data: conversationCheck, error: conversationError } = await supabase
        .from('conversations')
        .select('id, is_archived')
        .eq('id', conversationId)
        .maybeSingle();

      if (conversationError) {
        console.error('❌ Erro ao verificar conversa:', conversationError);
        throw conversationError;
      }

      if (!conversationCheck) {
        console.error('❌ Conversa não encontrada');
        throw new Error('Conversa não encontrada');
      }

      // Verificar se o usuário participa da conversa
      const { data: participantCheck, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participantError) {
        console.error('❌ Erro ao verificar participação:', participantError);
        throw participantError;
      }

      if (!participantCheck) {
        console.error('❌ Usuário não participa desta conversa');
        throw new Error('Você não tem permissão para excluir esta conversa');
      }

      console.log('✅ Usuário tem permissão para excluir a conversa');

      // Executar exclusão em sequência para evitar problemas de foreign key
      console.log('🔄 Iniciando exclusão sequencial de mensagens, participantes e conversa...');
      
      // 1. Excluir mensagens primeiro
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('❌ Erro ao excluir mensagens:', messagesError);
        throw messagesError;
      }
      console.log('✅ Mensagens excluídas com sucesso');

      // 2. Excluir participantes
      const { error: participantsError } = await supabase
        .from('participants')
        .delete()
        .eq('conversation_id', conversationId);

      if (participantsError) {
        console.error('❌ Erro ao excluir participantes:', participantsError);
        throw participantsError;
      }
      console.log('✅ Participantes excluídos com sucesso');

      // 3. Excluir conversa
      const { data: deletedConversation, error: conversationDeleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .select('id')
        .maybeSingle();

      if (conversationDeleteError) {
        console.error('❌ Erro ao excluir conversa:', conversationDeleteError);
        throw conversationDeleteError;
      }

      if (!deletedConversation) {
        console.error('❌ Conversa não foi excluída - possível problema de permissão');
        throw new Error('Não foi possível excluir a conversa. Verifique suas permissões');
      }

      console.log('✅ Conversa excluída com sucesso:', deletedConversation);

      // Remover da lista local apenas se a exclusão da conversa foi bem-sucedida
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Se era a conversa selecionada, limpar seleção
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      console.log('✅ Conversa excluída completamente');

      toast({
        title: "Sucesso",
        description: "Conversa excluída com sucesso!",
      });

    } catch (error) {
      console.error('💥 Erro ao excluir conversa:', error);
      toast({
        title: "Erro",
        description: `Não foi possível excluir a conversa: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedConversation, toast]);

  const handleConversationSelect = useCallback((conv) => {
    // Limpar mensagens imediatamente ao selecionar nova conversa
    if (selectedConversation?.id !== conv.id) {
      setMessages([]);
      setSelectedConversation(conv);
    }
  }, [selectedConversation]);

  if (!user) {
    return null;
  }

  return (
    <div 
      className={`h-screen w-full flex ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-black'}`}
      style={{
        backgroundImage: `url('${whatsappBackground}')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,audio/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = file.type.startsWith('image/') ? 'image' : 
                        file.type.startsWith('audio/') ? 'audio' : 'video';
            handleMediaUpload(file, type);
          }
        }}
      />

      <aside className="w-80 border-r border-border flex flex-col bg-background/95 backdrop-blur-sm">
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold text-foreground">ZRChat</h1>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/profile')}
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
                onClick={() => setShowArchivedMenu(!showArchivedMenu)}
                title="Menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {showArchivedMenu && (
            <div className="mb-4 p-2 bg-muted rounded-lg">
              <Button variant="ghost" className="w-full justify-start text-sm">
                📦 Conversas Arquivadas
              </Button>
            </div>
          )}
          
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
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleConversationSelect(conv)}
              className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.avatar} alt={conv.name} />
                    <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-foreground truncate">
                      {conv.name}
                      {conv.isGroup && <span className="ml-1 text-xs">👥</span>}
                      {conv.isIARA && <span className="ml-1 text-xs">🤖</span>}
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

      <main className="flex-1 flex flex-col bg-transparent max-w-[600px] mx-auto">
        {selectedConversation && (
          <>
            <ChatHeader
              selectedConversation={selectedConversation}
              isMobile={false}
              onBackToList={() => setSelectedConversation(null)}
              onAvatarClick={(conv) => console.log('Avatar clicked:', conv)}
              onCall={(type) => console.log('Call:', type)}
              onArchiveConversation={handleArchiveConversation}
              onDeleteConversation={handleDeleteConversation}
              isRecording={isRecording}
              onVideoRecording={() => setIsRecording(!isRecording)}
              onRefreshConversation={handleRefreshConversation}
            />

            <section 
              className={`flex-1 overflow-y-auto p-4 chat-body ${
                selectedConversation.isIARA ? 'chat-bg-iara' : 'chat-bg-pattern'
              }`}
            >
              <div className="flex flex-col gap-2 w-full">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex w-full ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`${msg.sender === "me" ? "message-right" : "message-left"} ${
                      msg.isOptimistic ? 'opacity-70' : ''
                    }`}>
                      {msg.message}
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Imagem enviada" 
                          className="max-w-full h-auto rounded-lg mt-2"
                        />
                      )}
                      {msg.audio_url && (
                        <div className="mt-2 w-full">
                          <audio controls className="w-full">
                            <source src={msg.audio_url} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}
                      {msg.video_url && (
                        <video controls className="max-w-full h-auto rounded-lg mt-2">
                          <source src={msg.video_url} type="video/mp4" />
                        </video>
                      )}
                      <span className="message-status">
                        {formatTime(msg.created_at)}
                        {msg.sender === "me" && (
                          msg.isRead ? (
                            <CheckCheck size={14} className="text-[#4A90E2]" />
                          ) : (
                            <Check size={14} className="text-[#4A90E2]" />
                          )
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </section>

            <footer className="p-4 border-t border-border bg-background/90 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" title="Emoji">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Anexar"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className={`border-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      messageError ? 'border-red-500' : ''
                    }`}
                    disabled={loading}
                  />
                  {messageError && (
                    <p className="text-red-500 text-xs mt-1">{messageError}</p>
                  )}
                </div>
                
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  className="bg-[#25D366] hover:bg-[#20b456] text-white"
                  disabled={!newMessage.trim() || loading || !!messageError}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
