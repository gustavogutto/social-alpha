import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsWideScreen } from '../theme/responsive';

// On wide/web viewports, centers content in a fixed-width column (with an
// optional right-hand sidebar) instead of letting it stretch edge to edge.
// On narrow viewports it's a no-op passthrough - the existing mobile layout.
export default function PageContainer({
  children,
  sidebar,
  maxWidth = 640,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  maxWidth?: number;
}) {
  const isWide = useIsWideScreen();

  if (!isWide) {
    return <>{children}</>;
  }

  return (
    <View style={styles.row}>
      <View style={[styles.main, { maxWidth }]}>{children}</View>
      {sidebar ? <View style={styles.sidebar}>{sidebar}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 20, gap: 24 },
  main: { flex: 1 },
  sidebar: { width: 280 },
});
