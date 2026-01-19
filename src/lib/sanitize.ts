/**
 * Security utilities for input sanitization
 */

/**
 * Escapes SQL LIKE pattern metacharacters to prevent SQL injection
 * @param input - User-provided input that will be used in LIKE patterns
 * @returns Escaped string safe for use in LIKE queries
 */
export function escapeLikePattern(input: string): string {
  if (!input) return '';
  // Escape LIKE metacharacters: %, _, and backslash
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validates and sanitizes search input
 * @param input - User-provided search input
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized input or empty string if invalid
 */
export function sanitizeSearchInput(input: string, maxLength = 100): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and limit length
  const trimmed = input.trim().substring(0, maxLength);
  
  // Escape LIKE metacharacters
  return escapeLikePattern(trimmed);
}

/**
 * Validates that input is one of the allowed values
 * @param input - User-provided input
 * @param allowedValues - Array of allowed values
 * @returns The input if valid, undefined otherwise
 */
export function validateAllowedValue<T extends string>(
  input: string | undefined,
  allowedValues: readonly T[]
): T | undefined {
  if (!input) return undefined;
  return allowedValues.includes(input as T) ? (input as T) : undefined;
}
