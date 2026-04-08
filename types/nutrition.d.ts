/**
 * PART:   Types — Nutrition domain
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  7 — Nutrition Scanner
 * TASK:   Kiểu dữ liệu cho scan receipt/bill + Z-score anomaly
 * SCOPE:  IN: type definitions only
 *         OUT: API call, image capture (NutritionScanner.ts)
 */

export interface NutritionItem {
  name: string;          // Tên sản phẩm / món ăn
  calories: number;      // kcal
  protein_g: number;     // Protein (g)
  carb_g: number;        // Carbohydrate (g)
  fat_g: number;         // Chất béo (g)
  price_vnd: number;     // Giá (VND)
  price_per_100kcal: number; // Giá/100kcal để tính market avg
  z_score: number;       // zᵢ = (xᵢ - μ_market) / σ_market (server trả về)
}

export interface NutritionScanResult {
  items: NutritionItem[];
  total_calories: number;
  total_protein_g: number;
  total_carb_g: number;
  total_fat_g: number;
  total_cost_vnd: number;
  market_avg_cost_vnd: number; // avg cost cho lượng calo tương đương trên thị trường
  scan_ts: number;             // Unix timestamp ms
  image_uri?: string;          // local URI của ảnh đã chụp
}
