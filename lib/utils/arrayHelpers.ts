/**
 * Array Helper Utilities
 * Provides safe array operations to prevent "TypeError: map is not a function"
 */

/**
 * Ensures a value is an array, returns empty array if not
 * @param value - Any value that should be an array
 * @returns Array (original if already array, empty array otherwise)
 */
export function ensureArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Safely map over a value that might not be an array
 * @param value - Value to map over
 * @param mapper - Mapping function
 * @returns Mapped array or empty array
 */
export function safeMap<T, R>(value: any, mapper: (item: T, index: number) => R): R[] {
  const arr = ensureArray<T>(value);
  return arr.map(mapper);
}

/**
 * Safely filter a value that might not be an array
 * @param value - Value to filter
 * @param predicate - Filter predicate
 * @returns Filtered array or empty array
 */
export function safeFilter<T>(value: any, predicate: (item: T, index: number) => boolean): T[] {
  const arr = ensureArray<T>(value);
  return arr.filter(predicate);
}

/**
 * Get array length safely
 * @param value - Value to check length
 * @returns Length of array or 0
 */
export function safeLength(value: any): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Check if array is empty (handles null/undefined)
 * @param value - Value to check
 * @returns True if empty, null, or undefined
 */
export function isEmpty(value: any): boolean {
  return !Array.isArray(value) || value.length === 0;
}

/**
 * Check if array has items (handles null/undefined)
 * @param value - Value to check
 * @returns True if array with items
 */
export function hasItems(value: any): boolean {
  return Array.isArray(value) && value.length > 0;
}
