import type { NavigatorScreenParams } from '@react-navigation/native';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type PostVisibility = 'everyone' | 'group' | 'friends';

export type Post = {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  visibility: PostVisibility;
  group_id: string | null;
  created_at: string;
};

export type PostFeedItem = Post & {
  group_name: string | null;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  added_at: string;
};

export type FriendshipStatus = 'pending' | 'accepted';

export type Friendship = {
  id: string;
  user_id_a: string;
  user_id_b: string;
  requester_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
};

// Client-computed from a Friendship row + the current user's id - not a DB type.
export type FriendRelation = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export type RecadoFeedItem = {
  id: string;
  profile_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

export type StoryMediaType = 'image' | 'video';

export type ActiveStory = {
  id: string;
  author_id: string;
  media_url: string;
  media_type: StoryMediaType;
  created_at: string;
  expires_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

export type StoryGroup = {
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  stories: ActiveStory[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
};

export type ConversationWithParticipants = ConversationSummary & {
  otherParticipants: Profile[];
};

export type NotificationType =
  | 'like'
  | 'comment'
  | 'message'
  | 'group_invite'
  | 'friend_request'
  | 'friend_accept'
  | 'recado';

export type NotificationFeedItem = {
  id: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  group_id: string | null;
  friendship_id: string | null;
  recado_id: string | null;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url: string | null;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  NewPost: undefined;
  Groups: undefined;
  CreateGroup: undefined;
  StoryViewer: { group: StoryGroup };
  Chat: { conversationId: string; title: string };
  NewConversation: undefined;
  Friends: undefined;
  UserProfile: { userId: string };
};

export type MainTabParamList = {
  Feed: undefined;
  Stories: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};
