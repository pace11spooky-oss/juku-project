export interface Recipe {
  id: string;
  url: string;
  title: string;
  image?: string;
  description?: string;
  ingredients?: string[];
  servings?: string;
  cookingTime?: string;
  addedAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface MealSlot {
  recipeId: string | null;
}

export interface WeeklyPlan {
  weekStart: string; // ISO date string of the Monday
  plan: Record<DayOfWeek, Record<MealType, MealSlot>>;
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 朝食',
  lunch: '🌞 昼食',
  dinner: '🌙 夕食',
};

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
