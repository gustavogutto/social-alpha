import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export async function uploadMedia(params: {
  bucket: string;
  userId: string;
  uri: string;
}): Promise<{ url: string; contentType: string }> {
  const { bucket, userId, uri } = params;

  const extMatch = uri.match(/\.(\w+)(?:\?.*)?$/);
  const ext = (extMatch ? extMatch[1] : 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'mov' ? 'video/quicktime' : ext === 'mp4' ? 'video/mp4' : 'image/jpeg';

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
