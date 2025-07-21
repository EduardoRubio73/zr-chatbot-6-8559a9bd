import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Smile, Paperclip, Mic, File, Image, FileText, Camera } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from './UserProfileModal';
import { MessageBubble } from './MessageBubble';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';

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
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const testSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        setSupabaseConnected(!error);
        if (error) {
          console.error('Supabase connection error:', error);
        }
      } catch (error) {
        console.error('Erro de conexão com Supabase:', error);
        setSupabaseConnected(false);
      }
    };

    if (isOnline && user) {
      testSupabaseConnection();
    }
  }, [isOnline, user]);

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
      console.log('Carregando conversas para usuário:', user.id);
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id);

      if (usersError) {
        console.error('Erro ao carregar usuários:', usersError);
        // Continuar com dados mock se houver erro
      }

      // Create IARA conversation (always first)
      const iaraConversation = {
        id: `iara_${user.id}`,
        name: "IARA",
        avatar: `https://ui-avatars.com/api/?name=IARA&background=FF6B6B&color=fff`,
        lastMessage: "Olá! Como posso ajudá-lo hoje?",
        timestamp: "agora",
        unreadCount: 0,
        isOnline: true,
        user_id: '51379d47-df13-4005-b91a-11dd06f226be',
        isIARA: true
      };

      const realConversations = usersData?.map(otherUser => ({
        id: `conv_${user.id}_${otherUser.id}`,
        name: otherUser.name,
        avatar: otherUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=25D366&color=fff`,
        lastMessage: "Iniciar conversa",
        timestamp: "agora",
        unreadCount: 0,
        isOnline: true,
        user_id: otherUser.id,
        isIARA: false
      })) || [];

      // IARA sempre em primeiro lugar
      const allConversations = [iaraConversation, ...realConversations];
      
      setConversations(allConversations);
      if (!selectedConversation && allConversations.length > 0) {
        setSelectedConversation(allConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (conversationId: string) => {
    // Se for conversa com IARA, não carregar mensagens do banco
    if (conversationId.startsWith('iara_')) {
      setMessages([]);
      return;
    }

    // Se for uma conversa "mock" (começa com conv_), verificar se existe uma conversa real
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
        console.error('Erro ao carregar mensagens:', error);
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
        timestamp: new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
      // Verificar se já existe uma conversa entre os dois usuários
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

      // Se existem conversas, verificar se alguma tem o outro usuário
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
        console.log('Conversa existente encontrada:', foundExistingConversation);
        
        // Atualizar o selectedConversation para usar o ID real
        setSelectedConversation(prev => ({
          ...prev,
          id: foundExistingConversation
        }));
        
        // Carregar mensagens da conversa existente
        loadMessages(foundExistingConversation);
      } else {
        console.log('Nenhuma conversa existente encontrada, mensagens em branco até enviar primeira mensagem');
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
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, async (payload) => {
        const newMessage = payload.new;
        
        // Processar mensagem em tempo real para atualizar a lista de conversas
        loadConversations();
        
        // Só processar se a conversa atual é a que recebeu a mensagem
        if (selectedConversation?.id && newMessage.conversation_id === selectedConversation.id) {
          // Buscar dados do remetente para ter o nome e avatar
          const { data: senderData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          // Verificar se a mensagem já não existe para evitar duplicatas
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
              timestamp: new Date(newMessage.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              read: newMessage.is_read,
              sender_name: senderData?.name,
              sender_avatar: senderData?.avatar_url
            };

            // Só tocar som se não foi você que enviou
            if (newMessage.sender_id !== user.id) {
              playSound('livechat');
              // Marcar mensagem como lida automaticamente se a conversa estiver aberta
              markMessageAsRead(newMessage.id);
            }

            return [...prev, formattedMessage];
          });
        }
      })
      // Escutar mudanças nos status de leitura
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const updatedMessage = payload.new;
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id 
            ? { ...msg, read: updatedMessage.is_read }
            : msg
        ));
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
      console.log(`Enviando mensagem para IARA (tentativa ${retryCount + 1}):`, message);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
      
      const response = await fetch('https://zragency-n8n.cchxwl.easypanel.host/webhook/568f0a22-74a6-4c3e-8d8c-86a979c02150', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          user_id: user.id,
          user_name: profile?.name || user.email,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Aguardar um pouco para simular processamento
      setTimeout(async () => {
        try {
          // Tentar obter a resposta como texto primeiro
          const responseText = await response.text();
          console.log('Response text:', responseText);
          
          let iaraResponseText = "Obrigada pela sua mensagem! Estou processando sua solicitação...";
          
          // Tentar fazer parse do JSON se houver conteúdo
          if (responseText && responseText.trim()) {
            try {
              const data = JSON.parse(responseText);
              console.log('Parsed response data:', data);
              
              // Verificar se é um array e tem o formato esperado
              if (Array.isArray(data) && data.length > 0) {
                const firstItem = data[0];
                if (firstItem.output) {
                  iaraResponseText = firstItem.output;
                } else if (firstItem.content) {
                  iaraResponseText = firstItem.content;
                }
              }
              // Se não for array, verificar se tem as propriedades diretamente
              else if (data.output) {
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
              console.log('Response não é JSON válido, usando como texto:', responseText);
              if (responseText.trim()) {
                iaraResponseText = responseText.trim();
              }
            }
          }
          
          // Adicionar resposta da IARA
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
          console.error('Erro ao processar resposta da IARA:', error);
          
          // Se ainda há tentativas disponíveis, tentar novamente
          if (retryCount < maxRetries - 1) {
            console.log(`Tentando novamente... (${retryCount + 2}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
            return sendToIARA(message, retryCount + 1);
          }
          
          // Resposta de erro após esgotar tentativas
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
      }, 1500); // Delay de 1.5 segundos para simular processamento

    } catch (error) {
      console.error(`Erro na requisição para IARA (tentativa ${retryCount + 1}):`, error);
      
      // Se ainda há tentativas disponíveis e o erro não é de aborto, tentar novamente
      if (retryCount < maxRetries - 1 && error.name !== 'AbortError') {
        console.log(`Tentando novamente... (${retryCount + 2}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
        return sendToIARA(message, retryCount + 1);
      }
      
      // Resposta de erro após esgotar tentativas
      setTimeout(() => {
        const errorMessage = error.name === 'AbortError' 
          ? "A conexão com IARA demorou muito para responder. Tente novamente."
          : retryCount >= maxRetries - 1 
            ? "Não foi possível conectar com IARA após várias tentativas. Verifique sua conexão e tente novamente."
            : "Erro de conexão com IARA. Tente novamente.";
            
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
          variant: "destructive",
        });
      }
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    
    // Verificar se está online antes de tentar enviar
    if (!isOnline) {
      toast({
        title: "Sem conexão",
        description: "Verifique sua conexão com a internet para enviar mensagens.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o Supabase está conectado
    if (!supabaseConnected && !selectedConversation.isIARA) {
      toast({
        title: "Erro de conexão",
        description: "Problemas de conexão com o servidor. Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Se for conversa com IARA, usar webhook
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
        
        // Enviar para IARA após limpar o input
        await sendToIARA(messageToSend);
        
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return;
      }

      let conversationId = selectedConversation.id;
      
      // Se a conversa ainda não existe no banco (ID começa com 'conv_'), criar nova conversa
      if (conversationId.startsWith('conv_')) {
        console.log('Criando nova conversa...');
        
        // Primeiro, criar a conversa
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            is_group: false
          })
          .select()
          .single();

        if (convError) {
          console.error('Erro ao criar conversa:', convError);
          throw convError;
        }
        
        console.log('Conversa criada:', convData);
        conversationId = convData.id;
        
        // Então, adicionar os participantes
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
        
        console.log('Participantes adicionados à conversa');
        
        // Atualizar o selectedConversation para usar o ID real
        setSelectedConversation(prev => ({
          ...prev,
          id: conversationId
        }));
      }

      // Agora enviar a mensagem
      console.log('Enviando mensagem para conversa:', conversationId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: newMessage,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
      }

      console.log('Mensagem enviada com sucesso:', data);

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
      
      // Toast de sucesso
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso!",
      });
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro completo ao enviar mensagem:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setArchivedConversations(prev => [...prev, conversation]);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      
      toast({
        title: "Conversa arquivada",
        description: `Conversa com ${conversation.name} foi arquivada`,
      });
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId) || 
                         archivedConversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      
      toast({
        title: "Conversa excluída",
        description: `Conversa com ${conversation.name} foi excluída`,
      });
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video' | 'document') => {
    if (!selectedConversation || !user) return;

    // Validar arquivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Se for conversa com IARA, apenas mostrar toast
    if (selectedConversation.isIARA) {
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Upload de arquivos para IARA será implementado em breve",
      });
      return;
    }

    // Verificar conexão
    if (!isOnline) {
      toast({
        title: "Sem conexão",
        description: "Verifique sua conexão com a internet para enviar arquivos.",
        variant: "destructive",
      });
      return;
    }

    if (!supabaseConnected) {
      toast({
        title: "Erro de conexão",
        description: "Problemas de conexão com o servidor. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const bucket = {
      image: 'chat-imagens',
      audio: 'chat-audios',
      video: 'chat-videos',
      document: 'chat-documentos'
    }[type];

    setIsUploading(true);
    setUploadProgress(0);
    setLoading(true);

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) {
        console.error('Erro no upload:', error);
        throw error;
      }

      setUploadProgress(100);

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
        [type === 'image' ? 'image_url' : type === 'audio' ? 'audio_url' : type === 'video' ? 'video_url' : 'document_url']: urlData.publicUrl,
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
        title: "Upload concluído",
        description: `${type === 'image' ? 'Imagem' : type === 'audio' ? 'Áudio' : type === 'video' ? 'Vídeo' : 'Documento'} enviado com sucesso!`,
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const playSound = (type: "chat" | "livechat") => {
    const audio = new Audio(
      type === "chat"
        ? "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/new-notification.mp3"
        : "https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-sound/livechat.mp3"
    );
    audio.play().catch(() => {
      console.log('Audio play failed - user interaction may be required');
    });
  };

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
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar o número de WhatsApp do usuário selecionado
      const { data: userData, error } = await supabase
        .from('users')
        .select('whatsapp, name')
        .eq('id', selectedConversation.user_id)
        .single();

      if (error || !userData?.whatsapp) {
        toast({
          title: "Número não encontrado",
          description: "Usuário não possui número de telefone cadastrado.",
          variant: "destructive",
        });
        return;
      }

      // Formatar número para formato internacional se necessário
      let phoneNumber = userData.whatsapp;
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+55' + phoneNumber.replace(/\D/g, '');
      }

      // Criar URL de telefone
      const telUrl = `tel:${phoneNumber}`;
      
      // Tentar abrir o app de telefone
      window.location.href = telUrl;
      
      toast({
        title: `Iniciando ${type === 'voice' ? 'ligação' : 'videochamada'}`,
        description: `Conectando com ${userData.name}...`,
      });
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a ligação.",
        variant: "destructive",
      });
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user' // ou 'environment' para câmera traseira
        }, 
        audio: true 
      });
      
      setRecordingStream(stream);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        // Criar file a partir do blob
        const videoFile = videoBlob as any;
        videoFile.name = `video_${Date.now()}.webm`;
        await handleMediaUpload(videoFile, 'video');
        
        // Parar stream
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
        setIsRecording(false);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "Toque novamente para parar a gravação.",
      });
    } catch (error) {
      console.error('Erro ao iniciar gravação de vídeo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
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
      
      recorder.ondataavailable = (e) => {
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
        variant: "destructive",
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

  const emojiCategories = {
    'Rostos': ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳'],
    'Gestos': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'],
    'Corações': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
    'Símbolos': ['💯', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💨', '💦', '💤', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉']
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`h-screen w-full flex ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleMediaUpload(file, 'image');
          }
        }}
      />
      
      <input
        type="file"
        ref={videoInputRef}
        className="hidden"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleMediaUpload(file, 'video');
          }
        }}
      />
      
      <input
        type="file"
        ref={documentInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleMediaUpload(file, 'document');
          }
        }}
      />
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="*/*"
        onChange={(e) => {
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
        }}
      />

      {/* Sidebar */}
      <ChatSidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showArchivedConversations={showArchivedConversations}
        setShowArchivedConversations={setShowArchivedConversations}
        conversations={conversations}
        archivedConversations={archivedConversations}
        selectedConversation={selectedConversation}
        onConversationClick={handleConversationClick}
        onAvatarClick={handleAvatarClick}
        onArchiveConversation={handleArchiveConversation}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
        profile={profile}
        user={user}
        isOnline={isOnline}
        supabaseConnected={supabaseConnected}
        isMobile={isMobile}
        showSidebar={showSidebar}
      />

      {/* Chat Area */}
      <main className={`${isMobile ? (showSidebar ? 'hidden' : 'w-full') : 'flex-1'} flex flex-col bg-background`}>
        {selectedConversation && (
          <>
            {/* Chat Header */}
            <ChatHeader
              selectedConversation={selectedConversation}
              isMobile={isMobile}
              onBackToList={handleBackToList}
              onAvatarClick={handleAvatarClick}
              onCall={handleCall}
              onArchiveConversation={handleArchiveConversation}
              onDeleteConversation={handleDeleteConversation}
              isRecording={isRecording}
              onVideoRecording={isRecording ? stopVideoRecording : startVideoRecording}
            />

            {/* Messages Area */}
            <section className={`chat-body flex-1 overflow-y-auto px-4 py-2 space-y-2 ${
              selectedConversation.isIARA ? 'chat-bg-iara' : 'whatsapp-bg'
            }`}>
              <div className="py-4 flex flex-col gap-2">
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={{
                      id: msg.id,
                      text: msg.text,
                      sent_at: msg.sent_at || msg.timestamp,
                      is_read: msg.read || msg.is_read,
                      sender: msg.sender,
                      image_url: msg.image_url,
                      audio_url: msg.audio_url,
                      video_url: msg.video_url
                    }}
                    onMessageDeleted={(messageId) => {
                      setMessages(prev => prev.filter(m => m.id !== messageId));
                    }}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </section>

            {/* Message Input Footer */}
            <footer className="p-4 border-t border-border bg-background">
              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#25D366] h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviando arquivo... {uploadProgress}%
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Emoji"
                      disabled={loading || isUploading}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      {Object.entries(emojiCategories).map(([category, emojis]) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium mb-2">{category}</h4>
                          <div className="grid grid-cols-8 gap-2">
                            {emojis.map((emoji) => (
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
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Anexar"
                      disabled={loading || isUploading}
                    >
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
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={loading || !isOnline || isUploading}
                  />
                </div>
                
                <Button 
                  size="icon" 
                  onClick={newMessage.trim() ? handleSend : handleMicClick}
                  className={`${
                    newMessage.trim() 
                      ? "bg-[#25D366] hover:bg-[#20b456]" 
                      : isRecording 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-[#25D366] hover:bg-[#20b456]"
                  } text-white transition-colors`}
                  disabled={loading || !isOnline || isUploading}
                  title={newMessage.trim() ? "Enviar" : isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {loading || isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : newMessage.trim() ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  )}
                </Button>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                  {supabaseConnected && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Servidor conectado</span>
                    </>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        user={selectedUserProfile}
      />
    </div>
  );
}
