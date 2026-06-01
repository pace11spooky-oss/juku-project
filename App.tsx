import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useRecipeStore } from './src/store/recipeStore';
import { useMealPlanStore } from './src/store/mealPlanStore';

export default function App() {
  const loadRecipes = useRecipeStore((s) => s.loadRecipes);
  const loadPlan = useMealPlanStore((s) => s.loadPlan);

  useEffect(() => {
    loadRecipes();
    loadPlan();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FFFBF5" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
