export const FEATURES = {
  PRODUCTS: 'PRODUCTS',
  INVOICES: 'INVOICES',
  USERS: 'USERS',
  REPORTS: 'REPORTS',
  CATEGORIES: 'CATEGORIES',
  UPLOADS: 'UPLOADS',
} as const;

export type Feature = keyof typeof FEATURES;

export const DEFAULT_FEATURES: Feature[] = [
  'PRODUCTS',
  'INVOICES',
  'USERS',
  'CATEGORIES',
  'UPLOADS',
];
