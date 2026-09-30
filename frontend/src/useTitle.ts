import { useEffect } from 'react';

/** Titel in het browsertabblad: "Inloggen · Klokit". Zonder titel: de standaardtitel van de site. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Klokit` : 'Klokit — GPS-inklokken voor je restaurant';
  }, [title]);
}
