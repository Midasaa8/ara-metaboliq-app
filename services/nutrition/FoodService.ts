/**
 * PART:   FoodService — food log CRUD + macro totals
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Add/remove food log entries, compute daily macro summary, persist via AsyncStorage
 * SCOPE:  IN: food items from OpenFoodFacts, manual quantity
 *         OUT: barcode detection (BarcodeScanner component), API search (openFoodFactsAPI)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OFFFoodItem } from './openFoodFactsAPI';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  food: OFFFoodItem;
  quantity_g: number;
  meal: MealType;
  logged_at: string; // ISO
}

export interface DailyMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const KEY = (date: string) => `food_log:${date}`;
const todayKey = () => KEY(new Date().toISOString().slice(0, 10));

function calcMacro(item: OFFFoodItem, qty: number): DailyMacros {
  const ratio = qty / 100;
  return {
    calories:  Math.round(item.calories_per_100g * ratio),
    protein_g: Math.round(item.protein_per_100g * ratio * 10) / 10,
    carbs_g:   Math.round(item.carbs_per_100g * ratio * 10) / 10,
    fat_g:     Math.round(item.fat_per_100g * ratio * 10) / 10,
    fiber_g:   Math.round(item.fiber_per_100g * ratio * 10) / 10,
  };
}

export async function getTodayLog(): Promise<FoodLogEntry[]> {
  const raw = await AsyncStorage.getItem(todayKey());
  return raw ? (JSON.parse(raw) as FoodLogEntry[]) : [];
}

export async function addFoodEntry(food: OFFFoodItem, quantity_g: number, meal: MealType): Promise<FoodLogEntry> {
  const entries = await getTodayLog();
  const entry: FoodLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    food, quantity_g, meal,
    logged_at: new Date().toISOString(),
  };
  entries.push(entry);
  await AsyncStorage.setItem(todayKey(), JSON.stringify(entries));
  return entry;
}

export async function removeFoodEntry(id: string): Promise<void> {
  const entries = await getTodayLog();
  await AsyncStorage.setItem(todayKey(), JSON.stringify(entries.filter((e) => e.id !== id)));
}

export function computeDailyMacros(entries: FoodLogEntry[]): DailyMacros {
  return entries.reduce<DailyMacros>(
    (acc, e) => {
      const m = calcMacro(e.food, e.quantity_g);
      return {
        calories:  acc.calories  + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g:   acc.carbs_g   + m.carbs_g,
        fat_g:     acc.fat_g     + m.fat_g,
        fiber_g:   acc.fiber_g   + m.fiber_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}
