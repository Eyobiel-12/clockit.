/** Nederlandse begroeting op basis van het uur van de dag. */
export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

/** "Donderdag 1 oktober" — met hoofdletter, zoals in de koptekst van het dashboard. */
export function formatLongDate(date: Date): string {
  const s = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
