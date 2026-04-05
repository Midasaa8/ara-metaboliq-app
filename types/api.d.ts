export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  error?:  string;
}

// -- Auth --

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface LoginResponse {
  access_token:  string;
  refresh_token: string;
  user_id:       string;
}

export interface RefreshResponse {
  access_token:  string;
  refresh_token: string;
}

// -- Health --

export interface SubScores {
  exercise:   number;
  sleep:      number;
  voice:      number;
  nutrition:  number;
  discipline: number;
}

export interface HealthScoreResponse {
  score:      number;
  sub_scores: SubScores;
  computed_at: string; // ISO 8601
}

// -- Voice --

export interface VoiceAnalyzeRequest {
  audio:       string; // base64-encoded WAV
  sample_rate: number;
  duration_ms: number;
}

export interface VoiceAnalyzeResponse {
  conditions:            string[];
  confidence:            number[];
  overall_respiratory:   number;
  overall_neurological:  number;
  recovery_readiness:    number; // 0–100 composite
  flags:                 string[]; // e.g. ['low_snr']
}

// -- Insurance --

export interface PremiumResponse {
  base:         number;
  final:        number;
  cashback:     number;
  discount_pct: number;
  breakdown:    SubScores;
}

// -- HSA --

export interface HSABalanceResponse {
  balance:       number;
  target_amount: number;
  today_earned:  number;
}

export interface HSATransaction {
  id:            string;
  amount:        number;
  trigger_event: string;
  description:   string;
  created_at:    string;
}
