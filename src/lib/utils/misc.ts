export function generateUniqueId(): string {
  // Simple unique ID generator (timestamp + random number)
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 