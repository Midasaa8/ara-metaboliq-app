/**
 * PART:   useDashboardLayout — widget layout helpers for BentoGrid
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  35s — Dashboard Customization
 * TASK:   Expose visible widgets sorted, column count, edit actions
 * SCOPE:  IN: dashboardStore
 *         OUT: BentoGrid component
 */

import { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useDashboardStore, type WidgetConfig } from '@/store/dashboardStore';

export interface UseDashboardLayoutResult {
  visibleWidgets: WidgetConfig[];
  allWidgets: WidgetConfig[];
  columns: number;
  editMode: boolean;
  toggleWidget: (id: string) => void;
  reorder: (from: number, to: number) => void;
  setEditMode: (v: boolean) => void;
}

export function useDashboardLayout(): UseDashboardLayoutResult {
  const { widgets, editMode, toggleWidget, reorder, setEditMode, hydrate } = useDashboardStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  const visibleWidgets = useMemo(
    () => widgets.filter((w) => w.visible),
    [widgets]
  );

  const screenWidth = Dimensions.get('window').width;
  const columns = screenWidth >= 768 ? 4 : 2;

  return {
    visibleWidgets,
    allWidgets: widgets,
    columns,
    editMode,
    toggleWidget,
    reorder,
    setEditMode,
  };
}
