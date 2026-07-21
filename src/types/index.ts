export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type PostVisibility = 'everyone' | 'group';

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

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  NewPost: undefined;
  Groups: undefined;
  CreateGroup: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Stories: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};
