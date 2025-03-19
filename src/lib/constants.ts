// App constants
export const APP_NAME = 'Funny Kitchen Cotizador';

// API endpoints
export const API_ENDPOINTS = {
  banxico: '/api/banxico',
  cotizaciones: '/api/cotizaciones',
  pdf: '/api/pdf',
};

// Default values
export const DEFAULT_EXCHANGE_RATE = 17.5; // MXN to USD
export const DEFAULT_COTIZACION_EXPIRY_DAYS = 30;

// Storage keys
export const STORAGE_KEYS = {
  exchangeRate: 'funny-kitchen-exchange-rate',
  draftCotizacion: 'funny-kitchen-draft-cotizacion',
};

// Cotizacion status
export const COTIZACION_STATUS = {
  PENDING: 'pendiente',
  APPROVED: 'aprobada',
  REJECTED: 'rechazada',
  EXPIRED: 'expirada',
} as const;

// Currency options
export const CURRENCY_OPTIONS = [
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
];