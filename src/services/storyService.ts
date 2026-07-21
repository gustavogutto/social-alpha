import { supabase } from './supabase';
import { uploadMedia } from './mediaUpload';
import type { ActiveStory, StoryGroup, StoryMediaType } from '../types';

export async function fetchActiveStories(): Promise<StoryGroup[]> {
  const { data, error } = await supabase.from('active_stories').select('*');
  if (error) throw error;

  const stories = data as ActiveStory[];
  const groupsByAuthor = new Map<string, StoryGroup>();
  for (const story of stories) {
    const existing = groupsByAuthor.get(story.author_id);
    if (existing) {
      existing.stories.push(story);
    } else {
      groupsByAuthor.set(story.author_id, {
        authorId: story.author_id,
        authorDisplayName: story.author_display_name,
        authorAvatarUrl: story.author_avatar_url,
        stories: [story],
      });
    }
  }
  return Array.from(groupsByAuthor.values());
}

export async function createStory(params: {
  authorId: string;
  uri: string;
  mediaType: StoryMediaType;
}): Promise<void> {
  const { authorId, uri, mediaType } = params;
  const { url } = await uploadMedia({ bucket: 'story-media', userId: authorId, uri });

  const { error } = await supabase.from('stories').insert({
    author_id: authorId,
    media_url: url,
    media_type: mediaType,
  });
  if (error) throw error;
}
