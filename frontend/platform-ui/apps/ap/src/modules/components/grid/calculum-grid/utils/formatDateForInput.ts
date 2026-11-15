/**
 * Formats a Date for `<input type="date">` as YYYY-MM-DD.
 */

export function formatDateForInput(date: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}
