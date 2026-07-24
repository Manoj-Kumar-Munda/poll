/**
 * General-purpose utility functions.
 * Add helpers here that don't belong to a specific module.
 */

/** Concatenate class names, filtering out falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
