/**
 * PART:   OpenFoodFacts API — external food database (2.8M products)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Search by text + fetch by barcode from world.openfoodfacts.org
 * SCOPE:  IN: text query or barcode string → FoodItem
 *         OUT: our backend, auth (public API, no key needed)
 */

import axios from 'axios';

const OFF = axios.create({
  baseURL: 'https://world.openfoodfacts.org',
  timeout: 8_000,
  headers: { 'User-Agent': 'ARA-MetaboliQ/1.0' },
});

export interface OFFFoodItem {
  barcode: string;
  name: string;
  brand: string;
  serving_size_g: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  image_url: string;
}

function parseProduct(p: Record<string, unknown>): OFFFoodItem {
  const n = (p.nutriments ?? {}) as Record<string, number>;
  return {
    barcode: String(p.code ?? p._id ?? ''),
    name: String(p.product_name ?? p.product_name_vi ?? p.generic_name ?? 'Unknown'),
    brand: String(p.brands ?? ''),
    serving_size_g: Number(p.serving_quantity) || 100,
    calories_per_100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
    protein_per_100g: n.proteins_100g ?? n.proteins ?? 0,
    carbs_per_100g: n.carbohydrates_100g ?? n.carbohydrates ?? 0,
    fat_per_100g: n.fat_100g ?? n.fat ?? 0,
    fiber_per_100g: n.fiber_100g ?? n.fiber ?? 0,
    image_url: String(p.image_front_small_url ?? p.image_url ?? ''),
  };
}

/** Full-text search — returns up to 20 results */
export async function searchFood(query: string): Promise<OFFFoodItem[]> {
  const res = await OFF.get('/cgi/search.pl', {
    params: { search_terms: query, json: 1, page_size: 20, fields: 'code,product_name,product_name_vi,brands,nutriments,serving_quantity,image_front_small_url' },
  });
  const products: unknown[] = res.data?.products ?? [];
  return (products as Record<string, unknown>[]).map(parseProduct).filter((f) => f.name !== 'Unknown');
}

/** Barcode lookup — returns single item or null */
export async function fetchByBarcode(barcode: string): Promise<OFFFoodItem | null> {
  const res = await OFF.get(`/api/v2/product/${barcode}.json`, {
    params: { fields: 'code,product_name,product_name_vi,brands,nutriments,serving_quantity,image_front_small_url' },
  });
  if (res.data?.status !== 1) return null;
  return parseProduct(res.data.product as Record<string, unknown>);
}
