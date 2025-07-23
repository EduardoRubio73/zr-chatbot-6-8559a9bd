import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Archive,
  Inbox,
  MessageCircle,
  MoreVertical,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import UserSelectionModal from './UserSelectionModal';
import GroupCreationModal from './GroupCreationModal';
import UserProfileModal from './UserProfileModal';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import MessageInput from './MessageInput';

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
  onArchive: () => void;
  showArchived: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onArchive,
  showArchived,
}) => {
  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-md hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-blue-50' : ''
        }`}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={conversation.avatar} alt={conversation.displayName} />
        <AvatarFallback>
          {conversation.displayName?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{conversation.displayName}</h3>
        <p className="text-sm text-gray-500">
          {conversation.is_online ? 'Online' : 'Offline'}
        </p>
      </div>
      {!showArchived && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          className="text-gray-600 hover:text-gray-900"
        >
          <Archive className="h-5 w-5" />
        </Button>
      )}
      {conversation.unread_count > 0 && (
        <div className="rounded-full bg-blue-500 text-white text-xs px-2 py-1">
          {conversation.unread_count}
        </div>
      )}
    </div>
  );
};

const ZRChat = () => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    };

    fetchUsers();
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, []);

  const toggleArchiveConversation = async (conversationId: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_archived: archive.toString() })
        .eq('id', conversationId);

      if (error) {
        console.error('Error archiving conversation:', error);
      } else {
        refetchConversations();
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.id, showArchivedConversations],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          groups(*),
          participants!inner(
            user_id,
            unread_count,
            users(id, name, avatar_url, is_online, last_seen)
          )
        `)
        .eq('participants.user_id', user.id)
        .eq('is_archived', showArchivedConversations.toString());

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      if (!data) return [];

      return data.map((conv: any) => ({
        id: conv.id,
        is_group: conv.is_group,
        groups: conv.groups,
        is_archived: conv.is_archived === 'true',
        last_message_at: conv.last_message_at,
        participants: conv.participants || []
      })).sort((a, b) => {
        const aTime = new Date(a.last_message_at || 0).getTime();
        const bTime = new Date(b.last_message_at || 0).getTime();
        return bTime - aTime;
      }).map(conv => ({
        ...conv,
        displayName: conv.is_group
          ? conv.groups?.name || 'Grupo'
          : conv.participants.find((p: any) => p.user_id !== user?.id)?.users?.name || 'Usuário',
        avatar: conv.is_group
          ? conv.groups?.avatar_url
          : conv.participants.find((p: any) => p.user_id !== user?.id)?.users?.avatar_url,
        unread_count: conv.participants.find((p: any) => p.user_id === user?.id)?.unread_count || 0,
        is_online: !conv.is_group && conv.participants.find((p: any) => p.user_id !== user?.id)?.users?.is_online,
        is_archived: conv.is_archived
      }));
    },
    enabled: !!user?.id,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, name, avatar_url)
        `)
        .eq('conversation_id', selectedConversation)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!selectedConversation,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (fileUrl: string | null = null, fileType: 'image' | 'video' | 'audio' | null = null) => {
    if (!user?.id || !selectedConversation) return;

    try {
      const messageData: any = {
        conversation_id: selectedConversation,
        sender_id: user.id,
        sent_at: new Date().toISOString(),
      };

      if (fileUrl && fileType) {
        if (fileType === 'image') {
          messageData.image_url = fileUrl;
        } else if (fileType === 'video') {
          messageData.video_url = fileUrl;
        } else if (fileType === 'audio') {
          messageData.audio_url = fileUrl;
        }
      } else {
        messageData.text = newMessage.trim();
        if (!messageData.text) return;
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
      setAudioBlob(null);
      setIsUploading(false);
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setIsUploading(false);
    }
  };

  const createConversation = async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select(`
          id,
          participants!inner(user_id)
        `)
        .eq('is_group', false)
        .eq('is_archived', 'false');

      const existing = existingConversation?.find(conv => {
        const participantIds = conv.participants.map((p: any) => p.user_id);
        return participantIds.includes(user.id) && participantIds.includes(targetUserId) && participantIds.length === 2;
      });

      if (existing) {
        setSelectedConversation(existing.id);
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          is_group: false,
          is_archived: 'false'
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      const { error: participantsError } = await supabase
        .from('participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: targetUserId }
        ]);

      if (participantsError) throw participantsError;

      setSelectedConversation(newConversation.id);
      refetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        let intervalId: NodeJS.Timeout;
        intervalId = setInterval(() => {
          setRecordingTime(prevTime => prevTime + 1);
        }, 1000);

        recorder.ondataavailable = event => {
          const audioBlob = new Blob([event.data], { type: 'audio/webm' });
          setAudioBlob(audioBlob);
          clearInterval(intervalId);
        };
      })
      .catch(error => {
        console.error("Error accessing microphone:", error);
      });
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !selectedConversation) return;
    setIsUploading(true);

    const file = event.target.files?.[0];
    if (!file) {
      setIsUploading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from('chat-imagens')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const url = `https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/${filePath}`;
      await sendMessage(url, 'image');
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !selectedConversation) return;
    setIsUploading(true);

    const file = event.target.files?.[0];
    if (!file) {
      setIsUploading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from('chat-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const url = `https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-videos/${filePath}`;
      await sendMessage(url, 'video');
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
    }
  };

  const createGroup = async () => {
    if (!user?.id || !groupName.trim() || selectedUsers.length === 0) return;

    try {
      // Create group
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Create conversation for the group
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          is_group: true,
          group_id: newGroup.id,
          is_archived: 'false'
        })
        .select()
        .single();

      if (conversationError) throw conversationError;

      // Add participants (including the creator)
      const participantIds = [...selectedUsers, user.id];
      const { error: participantsError } = await supabase
        .from('participants')
        .insert(
          participantIds.map(userId => ({
            conversation_id: newConversation.id,
            user_id: userId
          }))
        );

      if (participantsError) throw participantsError;

      setSelectedConversation(newConversation.id);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      refetchConversations();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.name} />
              <AvatarFallback>
                {user?.user_metadata?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-gray-900">{user?.user_metadata?.name}</h1>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchivedConversations(!showArchivedConversations)}
              className="text-gray-600 hover:text-gray-900"
            >
              {showArchivedConversations ? (
                <Inbox className="h-5 w-5" />
              ) : (
                <Archive className="h-5 w-5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUserModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowGroupModal(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Novo Grupo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h2 className="text-lg font-semibold mb-2 px-2">
              {showArchivedConversations ? 'Conversas Arquivadas' : 'Conversas'}
            </h2>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {showArchivedConversations
                  ? 'Nenhuma conversa arquivada'
                  : 'Nenhuma conversa ainda'}
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation === conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  onArchive={() => toggleArchiveConversation(conversation.id, !conversation.is_archived)}
                  showArchived={showArchivedConversations}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader
              selectedConversation={conversations.find(c => c.id === selectedConversation)}
              isMobile={false}
              onBackToList={() => setSelectedConversation(null)}
              onAvatarClick={(user) => {
                setProfileUser(user);
                setShowProfileModal(true);
              }}
              onCall={(type) => console.log('Call:', type)}
              onArchiveConversation={() => toggleArchiveConversation(selectedConversation, true)}
              onDeleteConversation={() => console.log('Delete conversation')}
              isRecording={isRecording}
              onVideoRecording={() => setIsRecording(!isRecording)}
              onRefreshConversation={() => refetchMessages()}
            />
            <ChatMessages
              conversationId={selectedConversation}
              currentUserId={user?.id}
              messagesEndRef={messagesEndRef}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              audioElements={audioElements}
              setAudioElements={setAudioElements}
              onUserClick={(user) => {
                setProfileUser(user);
                setShowProfileModal(true);
              }}
            />
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={() => {}} // This will be implemented in MessageInput
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              recordingTime={recordingTime}
              onFileUpload={handleFileUpload}
              onVideoUpload={handleVideoUpload}
              fileInputRef={fileInputRef}
              videoInputRef={videoInputRef}
              isUploading={isUploading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Selecione uma conversa
              </h2>
              <p className="text-gray-500">
                Escolha uma conversa para começar a trocar mensagens
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserSelectionModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onUserSelect={createConversation}
        users={users}
      />

      <GroupCreationModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setGroupName('');
          setSelectedUsers([]);
        }}
        onCreateGroup={createGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        users={users}
      />

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setProfileUser(null);
        }}
        user={profileUser || {
          id: user?.id || '',
          name: user?.user_metadata?.name || '',
          avatar: user?.user_metadata?.avatar_url || '',
          isOnline: true
        }}
      />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ZRChat;
