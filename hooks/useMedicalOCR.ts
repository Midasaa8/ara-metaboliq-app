/**
 * PART:   useMedicalOCR — OCR flow state + history management
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   State machine for camera→scan→display→correct→save flow
 * SCOPE:  IN: MedicalOCRService, userStore gender
 *         OUT: Health Score update trigger (Phase 32s backend integration)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getScanHistory, scanFromImage, scanFromText, updateScanResult, deleteScan,
  type LabScan,
} from '@/services/ocr/MedicalOCRService';
import { useUserStore } from '@/store/userStore';
import type { LabResult } from '@/services/api/ocrAPI';

export type OCRState = 'idle' | 'scanning' | 'result' | 'error';

export interface UseMedicalOCRResult {
  state: OCRState;
  activeScan: LabScan | null;
  history: LabScan[];
  errorMsg: string | null;
  isLoading: boolean;
  scanImage: (imageUri: string) => Promise<void>;
  scanText:  (rawText: string) => Promise<void>;
  updateResult: (scanId: string, results: LabResult[]) => Promise<void>;
  removeScan: (scanId: string) => Promise<void>;
  setActiveScan: (scan: LabScan) => void;
  reset: () => void;
}

export function useMedicalOCR(): UseMedicalOCRResult {
  const gender = useUserStore((s) => s.profile?.gender);
  const sex = gender === 'female' ? 'female' : 'male';

  const [state, setState] = useState<OCRState>('idle');
  const [activeScan, setActiveScan] = useState<LabScan | null>(null);
  const [history, setHistory] = useState<LabScan[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    const h = await getScanHistory();
    setHistory(h);
    setIsLoading(false);
  }, []);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const scanImage = useCallback(async (imageUri: string) => {
    setState('scanning');
    setErrorMsg(null);
    try {
      const scan = await scanFromImage(imageUri, sex);
      setActiveScan(scan);
      await refreshHistory();
      setState('result');
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi xử lý ảnh');
    }
  }, [sex, refreshHistory]);

  const scanText = useCallback(async (rawText: string) => {
    setState('scanning');
    setErrorMsg(null);
    try {
      const scan = await scanFromText(rawText, sex);
      setActiveScan(scan);
      await refreshHistory();
      setState('result');
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi phân tích văn bản');
    }
  }, [sex, refreshHistory]);

  const updateResult = useCallback(async (scanId: string, results: LabResult[]) => {
    await updateScanResult(scanId, results);
    await refreshHistory();
    if (activeScan?.id === scanId) setActiveScan((prev) => prev ? { ...prev, results } : null);
  }, [activeScan, refreshHistory]);

  const removeScan = useCallback(async (scanId: string) => {
    await deleteScan(scanId);
    if (activeScan?.id === scanId) { setActiveScan(null); setState('idle'); }
    await refreshHistory();
  }, [activeScan, refreshHistory]);

  const reset = useCallback(() => { setState('idle'); setActiveScan(null); setErrorMsg(null); }, []);

  return { state, activeScan, history, errorMsg, isLoading, scanImage, scanText, updateResult, removeScan, setActiveScan, reset };
}
