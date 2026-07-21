import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

const STORY_DURATION_MS = 5000;

function VideoStory({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  return <VideoView style={styles.media} player={player} contentFit="contain" nativeControls={false} />;
}

export default function StoryViewerScreen({ route, navigation }: Props) {
  const { group } = route.params;
  const [index, setIndex] = useState(0);
  const story = group.stories[index];

  useEffect(() => {
    const timer = setTimeout(() => {
      goNext();
    }, STORY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [index]);

  function goNext() {
    if (index < group.stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      navigation.goBack();
    }
  }

  function goPrevious() {
    if (index > 0) {
      setIndex((i) => i - 1);
    } else {
      navigation.goBack();
    }
  }

  if (!story) return null;

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {group.stories.map((s, i) => (
          <View key={s.id} style={styles.progressTrack}>
            <View style={[styles.progressFill, i < index && styles.progressFillDone, i === index && styles.progressFillActive]} />
          </View>
        ))}
      </View>
      <Text style={styles.authorName}>{group.authorDisplayName}</Text>

      {story.media_type === 'video' ? (
        <VideoStory uri={story.media_url} />
      ) : (
        <Image source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" />
      )}

      <View style={[StyleSheet.absoluteFill, styles.tapZones]}>
        <Pressable style={{ flex: 1 }} onPress={goPrevious} />
        <Pressable style={{ flex: 1 }} onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressRow: { flexDirection: 'row', gap: 4, padding: 8, paddingTop: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressFill: { flex: 0, height: 3, borderRadius: 2 },
  progressFillDone: { width: '100%', backgroundColor: '#fff' },
  progressFillActive: { width: '100%', backgroundColor: '#fff' },
  authorName: { color: '#fff', fontWeight: '700', paddingHorizontal: 12, paddingTop: 8 },
  media: { flex: 1, width: '100%' },
  tapZones: { flexDirection: 'row' },
});
