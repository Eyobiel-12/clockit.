import { Platform } from 'react-native';
import * as Location from 'expo-location';

export class LocationError extends Error {
  /** `openSettings`: de gebruiker moet iets aanzetten in Instellingen. */
  constructor(message: string, public openSettings = false) {
    super(message);
  }
}

export type Position = { lat: number; lng: number; accuracy: number; mocked: boolean };

const GOOD_ENOUGH_M = 25;
const MAX_WAIT_MS = 8000;

/**
 * Vraagt toestemming en bepaalt de locatie zo nauwkeurig mogelijk.
 * Een iPhone geeft de eerste seconden vaak een grove positie (±65 m of meer), dus we luisteren
 * maximaal 8 seconden en nemen de nauwkeurigste meting, of stoppen zodra hij binnen 25 m zit.
 */
export async function getPosition(): Promise<Position> {
  if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) {
    throw new LocationError(
      Platform.OS === 'ios'
        ? 'Locatievoorzieningen staan uit. Zet ze aan via Instellingen › Privacy en beveiliging › Locatievoorzieningen.'
        : 'Locatie staat uit op je telefoon. Zet locatie aan en probeer het opnieuw.',
      true,
    );
  }

  let perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted' && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new LocationError('Klokit heeft je locatie nodig om in te klokken. Sta locatie toe voor deze app in Instellingen.', true);
  }
  if (Platform.OS === 'ios' && perm.ios?.accuracy === 'reduced') {
    throw new LocationError('Zet "Exacte locatie" aan voor deze app in Instellingen › Privacy › Locatievoorzieningen.', true);
  }

  const best = await new Promise<Location.LocationObject | null>((resolve) => {
    let bestSoFar: Location.LocationObject | null = null;
    let sub: Location.LocationSubscription | null = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub?.remove();
      resolve(bestSoFar);
    };
    const timer = setTimeout(finish, MAX_WAIT_MS);

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      (loc) => {
        const acc = loc.coords.accuracy ?? Infinity;
        if (!bestSoFar || acc < (bestSoFar.coords.accuracy ?? Infinity)) bestSoFar = loc;
        if (acc <= GOOD_ENOUGH_M) finish();
      },
    )
      .then((s) => {
        sub = s;
        if (done) s.remove();
      })
      .catch(finish);
  });

  const loc = best ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null));
  if (!loc) throw new LocationError('Je locatie kon niet bepaald worden. Probeer het buiten of bij een raam opnieuw.');

  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: Math.round(loc.coords.accuracy ?? 9999),
    mocked: loc.mocked === true,
  };
}
