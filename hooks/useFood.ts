/**
 * PART:   useFood — food log state + search
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   State management for daily food log, meal grouping, macro totals, search
 * SCOPE:  IN: FoodService CRUD, openFoodFactsAPI search
 *         OUT: barcode scan (BarcodeScanner), network connectivity check
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTodayLog, addFoodEntry, removeFoodEntry, computeDailyMacros,
  type FoodLogEntry, type MealType, type DailyMacros,
} from '@/services/nutrition/FoodService';
import { searchFood, fetchByBarcode, type OFFFoodItem } from '@/services/nutrition/openFoodFactsAPI';

export interface UseFoodResult {
  entries: FoodLogEntry[];
  macros: DailyMacros;
  isLoading: boolean;
  searchResults: OFFFoodItem[];
  isSearching: boolean;
  search: (query: string) => Promise<void>;
  scanBarcode: (barcode: string) => Promise<OFFFoodItem | null>;
  addEntry: (food: OFFFoodItem, qty: number, meal: MealType) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  refreshLog: () => Promise<void>;
}

export function useFood(): UseFoodResult {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [macros, setMacros] = useState<DailyMacros>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<OFFFoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const refreshLog = useCallback(async () => {
    setIsLoading(true);
    const log = await getTodayLog();
    setEntries(log);
    setMacros(computeDailyMacros(log));
    setIsLoading(false);
  }, []);

  useEffect(() => { refreshLog(); }, [refreshLog]);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await searchFood(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const scanBarcode = useCallback(async (barcode: string): Promise<OFFFoodItem | null> => {
    return fetchByBarcode(barcode);
  }, []);

  const addEntry = useCallback(async (food: OFFFoodItem, qty: number, meal: MealType) => {
    await addFoodEntry(food, qty, meal);
    await refreshLog();
  }, [refreshLog]);

  const removeEntry = useCallback(async (id: string) => {
    await removeFoodEntry(id);
    await refreshLog();
  }, [refreshLog]);

  return { entries, macros, isLoading, searchResults, isSearching, search, scanBarcode, addEntry, removeEntry, refreshLog };
}
