import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export async function uploadMedia(params: {
  bucket: string;
  userId: string;
  uri: string;
  mimeType?: string | null;
}): Promise<{ url: string; contentType: string }> {
  const { bucket, userId, uri, mimeType } = params;

  let contentType = mimeType || undefined;
  let ext = contentType ? EXT_BY_MIME[contentType] : undefined;

  if (!ext) {
    const extMatch = uri.match(/\.(\w+)(?:\?.*)?$/);
    ext = (extMatch ? extMatch[1] : 'jpg').toLowerCase();
  }
  if (!contentType) {
    contentType =
      ext === 'png' ? 'image/png' : ext === 'mov' ? 'video/quicktime' : ext === 'mp4' ? 'video/mp4' : 'image/jpeg';
  }
  const path = `${userId}/${Date.now()}.${ext}`;

  let arrayBuffer: ArrayBuffer;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    arrayBuffer = await blob.arrayBuffer();
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    arrayBuffer = decode(base64);
  }

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, contentType };
}
