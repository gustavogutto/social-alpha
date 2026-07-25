import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { DemoProvider } from './src/context/DemoContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DemoProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </DemoProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
