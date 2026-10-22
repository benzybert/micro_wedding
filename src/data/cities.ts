/**
 * Cities used for sunset / nightfall / candle-lighting times. Coordinates are city centres
 * (good to a minute or two — plenty for "must end before Shabbat").
 * `candleMinutes` follows the common local custom: Jerusalem 40, Haifa 30, elsewhere 20.
 */
export type City = { key: string; he: string; lat: number; lon: number; candleMinutes: number };

export const CITIES: City[] = [
  { key: "Tel Aviv", he: "תל אביב", lat: 32.0853, lon: 34.7818, candleMinutes: 20 },
  { key: "Jerusalem", he: "ירושלים", lat: 31.7683, lon: 35.2137, candleMinutes: 40 },
  { key: "Haifa", he: "חיפה", lat: 32.794, lon: 34.9896, candleMinutes: 30 },
  { key: "Beer Sheva", he: "באר שבע", lat: 31.2518, lon: 34.7913, candleMinutes: 20 },
  { key: "Eilat", he: "אילת", lat: 29.5577, lon: 34.9519, candleMinutes: 20 },
  { key: "Tiberias", he: "טבריה", lat: 32.7959, lon: 35.5312, candleMinutes: 20 },
  { key: "Ashdod", he: "אשדוד", lat: 31.8044, lon: 34.6553, candleMinutes: 20 },
  { key: "Ashkelon", he: "אשקלון", lat: 31.6688, lon: 34.5743, candleMinutes: 20 },
  { key: "Netanya", he: "נתניה", lat: 32.3215, lon: 34.8532, candleMinutes: 20 },
  { key: "Rishon LeZion", he: "ראשון לציון", lat: 31.973, lon: 34.7925, candleMinutes: 20 },
  { key: "Petah Tikva", he: "פתח תקווה", lat: 32.084, lon: 34.8878, candleMinutes: 20 },
  { key: "Herzliya", he: "הרצליה", lat: 32.1624, lon: 34.8447, candleMinutes: 20 },
  { key: "Raanana", he: "רעננה", lat: 32.1848, lon: 34.8713, candleMinutes: 20 },
  { key: "Modiin", he: "מודיעין", lat: 31.8969, lon: 35.0104, candleMinutes: 20 },
  { key: "Rehovot", he: "רחובות", lat: 31.8928, lon: 34.8113, candleMinutes: 20 },
  { key: "Hadera", he: "חדרה", lat: 32.434, lon: 34.9196, candleMinutes: 20 },
  { key: "Caesarea", he: "קיסריה", lat: 32.519, lon: 34.9043, candleMinutes: 20 },
  { key: "Zichron Yaakov", he: "זכרון יעקב", lat: 32.5722, lon: 34.9533, candleMinutes: 30 },
  { key: "Nazareth", he: "נצרת", lat: 32.6996, lon: 35.3035, candleMinutes: 20 },
  { key: "Karmiel", he: "כרמיאל", lat: 32.919, lon: 35.2926, candleMinutes: 20 },
  { key: "Safed", he: "צפת", lat: 32.9646, lon: 35.496, candleMinutes: 20 },
  { key: "Dead Sea", he: "ים המלח", lat: 31.461, lon: 35.394, candleMinutes: 20 },
];

export const DEFAULT_CITY = CITIES[0]!;

export function cityByKey(key: string | null | undefined): City {
  return CITIES.find((c) => c.key === key) ?? DEFAULT_CITY;
}
