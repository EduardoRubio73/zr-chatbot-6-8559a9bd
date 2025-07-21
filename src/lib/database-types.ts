
// TypeScript types for the ZRChat database schema

export interface User {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  group_id?: string;
  last_message_at?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_seen?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text?: string;
  audio_url?: string;
  image_url?: string;
  video_url?: string;
  sent_at: string;
  is_read: boolean;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// Joined types for complex queries
export interface MessageWithSender extends Message {
  sender: User;
}

export interface ConversationWithParticipants extends Conversation {
  participants: (Participant & { user: User })[];
  group?: Group;
}

export interface ConversationPreview {
  conversation: Conversation;
  last_message?: Message;
  unread_count: number;
  other_participant?: User;
  group?: Group;
}
