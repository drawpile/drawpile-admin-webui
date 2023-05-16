// SPDX-License-Identifier: MIT
const dateTimeFormat = new Intl.DateTimeFormat();

export function formatDate(date: Date): string {
  return dateTimeFormat.format(date);
}

export function ucfirst(s: string): string {
  return s.length == 0 ? s : s.charAt(0).toUpperCase() + s.substring(1);
}

export function killEvent(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}
