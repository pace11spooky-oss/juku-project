import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const STORAGE_KEY = '@juku:recipes';

interface RecipeStore {
  recipes: Recipe[];
  isLoading: boolean;
  // Actions
  loadRecipes: () => Promise<void>;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipeById: (id: string) => Recipe | undefined;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  isLoading: false,

  loadRecipes: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const recipes: Recipe[] = JSON.parse(stored);
        set({ recipes });
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addRecipe: async (recipe: Recipe) => {
    const { recipes } = get();
    const updated = [...recipes, recipe];
    set({ recipes: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recipe:', error);
    }
  },

  updateRecipe: async (id: string, updates: Partial<Recipe>) => {
    const { recipes } = get();
    const updated = recipes.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ recipes: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update recipe:', error);
    }
  },

  deleteRecipe: async (id: string) => {
    const { recipes } = get();
    const updated = recipes.filter((r) => r.id !== id);
    set({ recipes: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  },

  getRecipeById: (id: string) => {
    return get().recipes.find((r) => r.id === id);
  },
}));
