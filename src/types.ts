import { format } from 'date-fns';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  timestamp: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  limit: number;
}

export interface Settings {
  dailyLimit: number;
}

export const STORAGE_KEY = 'calorie_track_data';
export const SETTINGS_KEY = 'calorie_track_settings';

export const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');
