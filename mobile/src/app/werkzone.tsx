import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { ZoneMap } from '../components/ZoneMap';
import { AddressSearch } from '../components/AddressSearch';
import { Button, ErrorText, Field, H1, Muted, Pill, Txt } from '../components/ui';
import { colors, radius as radii } from '../components/theme';
import { api, type LatLng, type RestaurantSettings } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getPosition, LocationError } from '../lib/location';
import { useApi } from '../lib/useApi';

/**
 * Werkzone instellen: naam, adres, pin en straal (Onboarding.dc.html, voor de telefoon).
 * Met ?stap=1 is dit stap 2 van 3 direct na het registreren.
 */
export default function Werkzone() {
  const { me, refresh } = useAuth();
  const { stap } = useLocalSearchParams<{ stap?: string }>();
  const onboarding = stap === '1';
  const { data, error: loadError } = useApi<RestaurantSettings>('/restaurant');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(120);
  const [error, setError] = useState('');
  const [needsSettings, setNeedsSettings] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setAddress(data.address ?? '');
    setLocation(data.location);
    setRadius(data.radius);
  }, [data]);

  if (!me) return <Redirect href="/login" />;
  const canEdit = me.user.role === 'owner';

  function close() {
    if (onboarding) router.replace('/team');
    else if (router.canGoBack()) router.back();
    else router.replace('/meer');
  }

  async function reverse(pos: LatLng) {
    if (address.trim()) return;
    try {
      const { result } = await api<{ result: { label: string } | null }>(`/restaurant/geocode/reverse?lat=${pos.lat}&lng=${pos.lng}`);
      if (result) setAddress((a) => (a.trim() ? a : result.label));
    } catch {
      // Geen adres gevonden: de gebruiker kan het zelf invullen.
    }
  }

  function moveTo(pos: LatLng) {
    setLocation(pos);
    setError('');
    reverse(pos);
  }

  async function useMyLocation() {
    setLocating(true);
    setError('');
    setNeedsSettings(false);
    try {
      const pos = await getPosition();
      moveTo({ lat: pos.lat, lng: pos.lng });
      if (pos.accuracy > 50) {
        setError(`Je locatie is onnauwkeurig (±${pos.accuracy} m). Controleer de pin en sleep hem zo nodig naar je ingang.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Locatie bepalen mislukt');
      setNeedsSettings(err instanceof LocationError && err.openSettings);
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!location) {
      setError('Zet eerst de pin: zoek je adres, gebruik je locatie of tik op de kaart.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/restaurant', {
        method: 'PATCH',
        body: { name, address: address.trim() || null, lat: location.lat, lng: location.lng, radius },
      });
      await refresh();
      if (onboarding) router.replace('/team');
      else close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
      setSaving(false);
    }
  }

  const min = data?.limits.radiusMin ?? 25;
  const max = data?.limits.radiusMax ?? 300;

  return (
    <Screen standalone background={colors.white} contentStyle={{ backgroundColor: colors.white }}>
      <View style={styles.top}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={onboarding ? 'Later doen' : 'Terug'} hitSlop={8} style={styles.back}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.deep} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
          <Txt weight="bold">{onboarding ? 'Later' : 'Terug'}</Txt>
        </Pressable>
        {location ? <Pill label="Ingesteld" tone="green" /> : <Pill label="Nog niet ingesteld" tone="red" />}
      </View>

      {onboarding && (
        <>
          <View style={styles.prog} accessibilityLabel="Stap 2 van 3">
            <View style={[styles.progBar, styles.progOn]} /><View style={[styles.progBar, styles.progOn]} /><View style={styles.progBar} />
          </View>
          <Muted style={{ fontSize: 13, marginBottom: 10 }}>Stap 2 van 3</Muted>
        </>
      )}

      <H1 style={{ marginBottom: 6 }}>{onboarding ? 'Waar staat je restaurant?' : 'Werkzone'}</H1>
      <Muted style={{ marginBottom: 16 }}>Je team kan alleen inklokken binnen de cirkel op de kaart.</Muted>

      {/* Adres zoeken direct bij de kaart: kiezen zet de pin. */}
      <AddressSearch
        value={address} onChange={setAddress} editable={canEdit} label="Adres zoeken"
        placeholder="Bijv. Kadestraat 12 Amsterdam"
        help="Kies een adres uit de lijst: de pin springt ernaartoe."
        onPick={(p) => { setLocation({ lat: p.lat, lng: p.lng }); setError(''); }}
      />

      <View>
        <ZoneMap location={location} radius={radius} onMove={canEdit ? moveTo : undefined} height={300} />
        {canEdit && (
          <Pressable onPress={useMyLocation} disabled={locating} accessibilityRole="button" accessibilityLabel="Pin op mijn locatie" style={styles.locate}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.deep} strokeWidth={2} strokeLinecap="round">
              <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <Path d="M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14z" />
              <Path d="M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z" fill={colors.deep} />
            </Svg>
          </Pressable>
        )}
      </View>
      <Muted style={{ fontSize: 13, marginTop: 8, marginBottom: 18 }}>
        {canEdit
          ? location ? 'Houd de pin vast en sleep hem naar je ingang, of tik op de kaart.' : 'Tik op de kaart, zoek je adres of gebruik je locatie.'
          : 'Alleen de eigenaar kan de werkzone aanpassen.'}
      </Muted>

      <ErrorText>{loadError || error}</ErrorText>
      {needsSettings && <Button title="Open Instellingen" variant="outline" onPress={() => Linking.openSettings()} style={{ marginBottom: 16, alignSelf: 'flex-start' }} />}

      <Field label="Naam van je restaurant" value={name} onChangeText={setName} editable={canEdit} />

      <View style={styles.radiusHead}>
        <Txt weight="bold" style={{ fontSize: 14 }}>Straal</Txt>
        <Txt weight="display" style={{ fontSize: 22 }}>{radius} m</Txt>
      </View>
      <Slider
        minimumValue={min} maximumValue={max} step={5} value={radius} disabled={!canEdit}
        onValueChange={(v) => setRadius(Math.round(v))}
        minimumTrackTintColor={colors.deep} maximumTrackTintColor={colors.line} thumbTintColor={colors.deep}
        accessibilityLabel="Straal" accessibilityValue={{ min, max, now: radius, text: `${radius} meter` }}
        style={{ height: 40 }}
      />
      <View style={styles.sl}><Muted style={{ fontSize: 13 }}>{min} m</Muted><Muted style={{ fontSize: 13 }}>{max} m</Muted></View>

      <View style={styles.tip}>
        <Txt style={{ fontSize: 14 }}>
          <Txt weight="bold" style={{ fontSize: 14 }}>Tip: </Txt>
          binnen is GPS minder nauwkeurig. Heb je een grote zaak of terras, kies dan minimaal 100 meter.
        </Txt>
      </View>

      {canEdit && (
        <View style={{ gap: 10, marginTop: 20 }}>
          <Button title={saving ? 'Opslaan…' : onboarding ? 'Opslaan en verder' : 'Opslaan'} onPress={save} loading={saving} full />
          <Button title={locating ? 'Locatie bepalen…' : 'Pin op mijn locatie'} variant="outline" onPress={useMyLocation} loading={locating} full />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  prog: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  progBar: { flex: 1, height: 6, borderRadius: 9, backgroundColor: colors.line },
  progOn: { backgroundColor: colors.deep },
  locate: {
    position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.deep, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  radiusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sl: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tip: { backgroundColor: '#FFF7DA', borderRadius: radii.lg, padding: 14 },
});
