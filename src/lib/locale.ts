/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 * @param str The string to truncate
 * @param len The maximum length including the ellipsis
 * @returns The truncated string
 */
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + "...";
}

/**
 * Capitalize the first letter of each word in a string.
 * @param str The string to titlecase
 * @returns The titlecased string
 */
export function titlecase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
