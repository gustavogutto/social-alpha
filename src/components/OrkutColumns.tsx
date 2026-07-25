import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsWideScreen } from '../theme/responsive';

// Classic Orkut profile shape: a narrow identity column on the left, the
// main content (about/recados/posts) in the middle, friends on the right.
// Stacks top to bottom on narrow/mobile viewports.
export default function OrkutColumns({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  const isWide = useIsWideScreen();

  if (!isWide) {
    return (
      <View>
        {left}
        {center}
        {right}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.left}>{left}</View>
      <View style={styles.center}>{center}</View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  left: { width: 200 },
  center: { flex: 1, minWidth: 0 },
  right: { width: 260 },
});
