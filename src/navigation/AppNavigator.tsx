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
import NewPostScreen from '../screens/NewPostScreen';
import GroupsScreen from '../screens/GroupsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import ChatScreen from '../screens/ChatScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import FriendsScreen from '../screens/FriendsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { colors } from '../theme/colors';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
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
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      >
        {session ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="NewPost"
              component={NewPostScreen}
              options={{ headerShown: true, title: 'Novo post', presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Groups"
              component={GroupsScreen}
              options={{ headerShown: true, title: 'Meus grupos' }}
            />
            <RootStack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ headerShown: true, title: 'Criar grupo' }}
            />
            <RootStack.Screen
              name="StoryViewer"
              component={StoryViewerScreen}
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <RootStack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true }} />
            <RootStack.Screen
              name="NewConversation"
              component={NewConversationScreen}
              options={{ headerShown: true, title: 'Nova conversa', presentation: 'modal' }}
            />
            <RootStack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: true, title: 'Amigos' }} />
            <RootStack.Screen
              name="UserProfile"
              component={UserProfileScreen}
              options={{ headerShown: true, title: 'Perfil' }}
            />
          </>
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
