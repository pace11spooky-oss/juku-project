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
  mon: 'T2',
  tue: 'T3',
  wed: 'T4',
  thu: 'T5',
  fri: 'T6',
  sat: 'T7',
  sun: 'CN',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Sáng',
  lunch: '🌞 Trưa',
  dinner: '🌙 Tối',
};

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
