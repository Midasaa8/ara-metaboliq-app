/**
 * PART:   ocrAPI — POST to backend OCR endpoint
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   Wrapper around POST /api/v1/wave1/ocr/text (text fallback, hackathon mode)
 *         Future: POST /api/v1/wave1/ocr/scan (image mode, Phase 25 Opus backend)
 * SCOPE:  IN: raw lab text or base64 image
 *         OUT: LOINC mapping, PaddleOCR (server handles)
 */

import APIClient from '@/services/api/APIClient';

export interface LabResult {
  test:          string;
  value:         string;
  unit:          string;
  normal_range:  string;
  status:        'normal' | 'borderline' | 'abnormal';
  status_display: string;
  loinc:         string | null;    // hidden from UI, for data interop
  confidence:    number;           // 0-1
}

export interface OCRResponse {
  results:     LabResult[];
  count:       number;
  disclaimer:  string;
}

const BASE = '/api/v1/wave1';

/** Text-based OCR (works without camera, for hackathon demo) */
export async function parseLabText(rawText: string, sex?: string): Promise<OCRResponse> {
  const res = await APIClient.post<OCRResponse>(`${BASE}/ocr/text`, {
    raw_text: rawText,
    sex: sex ?? null,
  });
  return res.data;
}

/**
 * Image-based OCR — sends base64 JPEG to server PaddleOCR.
 * Server endpoint: POST /api/v1/wave1/ocr/scan (stub for now — returns 501 if not deployed)
 */
export async function scanLabImage(imageBase64: string, sex?: string): Promise<OCRResponse> {
  const res = await APIClient.post<OCRResponse>(`${BASE}/ocr/scan`, {
    image_b64: imageBase64,
    format: 'jpeg',
    sex: sex ?? null,
  });
  return res.data;
}
