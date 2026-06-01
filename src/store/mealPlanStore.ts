import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyPlan, DayOfWeek, MealType, DAYS_OF_WEEK, MEAL_TYPES } from '../types';

const STORAGE_KEY = '@juku:mealPlan';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function createEmptyPlan(weekStart: string): WeeklyPlan {
  const plan: Partial<Record<DayOfWeek, Record<MealType, { recipeId: null }>>> = {};
  for (const day of DAYS_OF_WEEK) {
    plan[day] = {} as Record<MealType, { recipeId: null }>;
    for (const meal of MEAL_TYPES) {
      (plan[day] as Record<MealType, { recipeId: null }>)[meal] = { recipeId: null };
    }
  }
  return {
    weekStart,
    plan: plan as WeeklyPlan['plan'],
  };
}

interface MealPlanStore {
  currentPlan: WeeklyPlan | null;
  isLoading: boolean;
  // Actions
  loadPlan: () => Promise<void>;
  initCurrentWeek: () => void;
  setMeal: (day: DayOfWeek, mealType: MealType, recipeId: string | null) => Promise<void>;
  applyGeneratedPlan: (generated: Record<DayOfWeek, Record<MealType, string | null>>) => Promise<void>;
  clearWeek: () => Promise<void>;
  getCurrentWeekStart: () => string;
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  currentPlan: null,
  isLoading: false,

  getCurrentWeekStart: () => {
    const monday = getMonday(new Date());
    return monday.toISOString().split('T')[0];
  },

  loadPlan: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const plan: WeeklyPlan = JSON.parse(stored);
        set({ currentPlan: plan });
      } else {
        get().initCurrentWeek();
      }
    } catch (error) {
      console.error('Failed to load meal plan:', error);
      get().initCurrentWeek();
    } finally {
      set({ isLoading: false });
    }
  },

  initCurrentWeek: () => {
    const weekStart = get().getCurrentWeekStart();
    const newPlan = createEmptyPlan(weekStart);
    set({ currentPlan: newPlan });
  },

  setMeal: async (day: DayOfWeek, mealType: MealType, recipeId: string | null) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const updatedPlan: WeeklyPlan = {
      ...currentPlan,
      plan: {
        ...currentPlan.plan,
        [day]: {
          ...currentPlan.plan[day],
          [mealType]: { recipeId },
        },
      },
    };

    set({ currentPlan: updatedPlan });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlan));
    } catch (error) {
      console.error('Failed to save meal plan:', error);
    }
  },

  applyGeneratedPlan: async (generated: Record<DayOfWeek, Record<MealType, string | null>>) => {
    const { currentPlan, getCurrentWeekStart } = get();
    const weekStart = currentPlan?.weekStart ?? getCurrentWeekStart();

    const plan: WeeklyPlan['plan'] = {} as WeeklyPlan['plan'];
    for (const day of DAYS_OF_WEEK) {
      plan[day] = {} as Record<MealType, { recipeId: string | null }>;
      for (const meal of MEAL_TYPES) {
        const recipeId = generated[day]?.[meal] ?? null;
        plan[day][meal] = { recipeId };
      }
    }

    const updatedPlan: WeeklyPlan = { weekStart, plan };
    set({ currentPlan: updatedPlan });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlan));
    } catch (error) {
      console.error('Failed to save generated plan:', error);
    }
  },

  clearWeek: async () => {
    const weekStart = get().getCurrentWeekStart();
    const newPlan = createEmptyPlan(weekStart);
    set({ currentPlan: newPlan });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPlan));
    } catch (error) {
      console.error('Failed to clear meal plan:', error);
    }
  },
}));
