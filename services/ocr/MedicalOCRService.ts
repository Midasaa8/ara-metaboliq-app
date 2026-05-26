/**
 * PART:   MedicalOCRService — camera capture + upload + local scan history
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   Capture image via expo-camera, encode base64, call ocrAPI, persist history
 * SCOPE:  IN: expo-camera + expo-file-system + ocrAPI
 *         OUT: PaddleOCR model (server), LOINC mapping (server)
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseLabText, scanLabImage, type LabResult } from '@/services/api/ocrAPI';

export interface LabScan {
  id: string;
  scanned_at: string;   // ISO
  image_uri?: string;   // local file URI (for gallery)
  results: LabResult[]; // may be user-corrected
  source: 'image' | 'text';
  disclaimer: string;
}

const HISTORY_KEY = 'ocr_scan_history';

export async function getScanHistory(): Promise<LabScan[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history: LabScan[] = raw ? JSON.parse(raw) : [];
  return history.sort((a, b) => b.scanned_at.localeCompare(a.scanned_at));
}

async function saveScan(scan: LabScan): Promise<void> {
  const history = await getScanHistory();
  history.unshift(scan);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export async function scanFromImage(imageUri: string, sex?: string): Promise<LabScan> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  let response;
  try {
    response = await scanLabImage(base64, sex);
  } catch {
    // Fallback: if image endpoint not available, return a mock error state
    throw new Error('Image OCR server not available. Try text mode.');
  }
  const scan: LabScan = {
    id: `${Date.now()}`,
    scanned_at: new Date().toISOString(),
    image_uri: imageUri,
    results: response.results,
    source: 'image',
    disclaimer: response.disclaimer,
  };
  await saveScan(scan);
  return scan;
}

export async function scanFromText(rawText: string, sex?: string): Promise<LabScan> {
  const response = await parseLabText(rawText, sex);
  const scan: LabScan = {
    id: `${Date.now()}`,
    scanned_at: new Date().toISOString(),
    results: response.results,
    source: 'text',
    disclaimer: response.disclaimer,
  };
  await saveScan(scan);
  return scan;
}

export async function updateScanResult(scanId: string, updatedResults: LabResult[]): Promise<void> {
  const history = await getScanHistory();
  const idx = history.findIndex((s) => s.id === scanId);
  if (idx >= 0) {
    history[idx] = { ...history[idx], results: updatedResults };
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export async function deleteScan(scanId: string): Promise<void> {
  const history = await getScanHistory();
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((s) => s.id !== scanId)));
}
