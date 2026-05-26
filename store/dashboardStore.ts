/**
 * PART:   dashboardStore — widget layout state (order + visibility)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  35s — Dashboard Customization
 * TASK:   Zustand store with AsyncStorage persistence for widget order/toggle
 * SCOPE:  IN: Zustand + AsyncStorage
 *         OUT: BentoGrid, EditMode components
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WidgetSize = '2x2' | '2x1' | '1x1' | '4x1';

export interface WidgetConfig {
  id: string;
  label: string;
  emoji: string;
  size: WidgetSize;
  visible: boolean;
  pinned: boolean;     // pinned widgets can't be moved/hidden
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'health_score',  label: 'Health Score',      emoji: '💚', size: '2x2', visible: true, pinned: true },
  { id: 'alerts',        label: 'Cảnh báo',          emoji: '⚠️', size: '4x1', visible: true, pinned: false },
  { id: 'steps',         label: 'Bước chân',         emoji: '👣', size: '2x1', visible: true, pinned: false },
  { id: 'azm',           label: 'Active Zone',       emoji: '⚡', size: '2x1', visible: true, pinned: false },
  { id: 'sleep',         label: 'Giấc ngủ',          emoji: '🌙', size: '2x1', visible: true, pinned: false },
  { id: 'voice',         label: 'Voice Wellness',    emoji: '🎤', size: '2x1', visible: true, pinned: false },
  { id: 'stress',        label: 'Căng thẳng',        emoji: '🧘', size: '1x1', visible: true, pinned: false },
  { id: 'readiness',     label: 'Sẵn sàng',         emoji: '☀️', size: '1x1', visible: true, pinned: false },
  { id: 'water',         label: 'Nước',              emoji: '💧', size: '1x1', visible: true, pinned: false },
  { id: 'food',          label: 'Dinh dưỡng',       emoji: '🍎', size: '1x1', visible: true, pinned: false },
  { id: 'weight',        label: 'Cân nặng',         emoji: '⚖️', size: '1x1', visible: false, pinned: false },
  { id: 'female_health', label: 'Sức khoẻ nữ',     emoji: '🌸', size: '1x1', visible: false, pinned: false },
];

interface DashboardStore {
  widgets: WidgetConfig[];
  editMode: boolean;
  setWidgets: (w: WidgetConfig[]) => void;
  toggleWidget: (id: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  setEditMode: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'dashboard_layout';

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  widgets: DEFAULT_WIDGETS,
  editMode: false,

  setWidgets: (w) => {
    set({ widgets: w });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(w));
  },

  toggleWidget: (id) => {
    const widgets = get().widgets.map((w) =>
      w.id === id && !w.pinned ? { ...w, visible: !w.visible } : w
    );
    get().setWidgets(widgets);
  },

  reorder: (fromIdx, toIdx) => {
    const widgets = [...get().widgets];
    const [moved] = widgets.splice(fromIdx, 1);
    widgets.splice(toIdx, 0, moved);
    get().setWidgets(widgets);
  },

  setEditMode: (v) => set({ editMode: v }),

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved: WidgetConfig[] = JSON.parse(raw);
      // Merge with defaults for any new widgets added in updates
      const savedIds = new Set(saved.map((w) => w.id));
      const merged = [...saved, ...DEFAULT_WIDGETS.filter((d) => !savedIds.has(d.id))];
      set({ widgets: merged });
    }
  },
}));
