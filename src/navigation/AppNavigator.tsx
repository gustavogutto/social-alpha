import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList, RootStackParamList } from '../types';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import FeedScreen from '../screens/FeedScreen';
import StoriesScreen from '../screens/StoriesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Stories" component={StoriesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Mensagens' }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notificações' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
