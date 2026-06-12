import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, Platform } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import RecipeBookScreen from '../screens/RecipeBookScreen';
import AddRecipeScreen from '../screens/AddRecipeScreen';
import AIGenerateScreen from '../screens/AIGenerateScreen';

export type RootStackParamList = {
  Main: undefined;
  AddRecipe: undefined;
  AIGenerate: undefined;
};

export type TabParamList = {
  Home: undefined;
  RecipeBook: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFBF5',
          borderTopColor: '#F0E6D3',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#E8833A',
        tabBarInactiveTintColor: '#B0A090',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Lịch thực đơn',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="RecipeBook"
        component={RecipeBookScreen}
        options={{
          tabBarLabel: 'Sổ công thức',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📖" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFBF5',
          },
          headerTintColor: '#3D2B1F',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#FFFBF5' },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddRecipe"
          component={AddRecipeScreen}
          options={{
            title: 'Thêm công thức',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="AIGenerate"
          component={AIGenerateScreen}
          options={{
            title: 'AI gợi ý thực đơn',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
