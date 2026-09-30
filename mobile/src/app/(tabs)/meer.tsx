import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Screen } from '../../components/Screen';
import { QrCode } from '../../components/QrCode';
import { ZoneMap } from '../../components/ZoneMap';
import { Avatar, Button, ErrorText, H1, H3, Muted, Panel, Pill, Txt } from '../../components/ui';
import { colors, radius } from '../../components/theme';
import { api, API_URL, roleLabel, type ClockRules, type Me, type RestaurantSettings } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';

/** Wat op de website in de zijbalk en bij Instellingen staat: profiel, restaurant, werkzone, klokregels, QR-code. */
export default function Meer() {
  const { me, logout } = useAuth();
  if (!me) return null;
  const isOwner = me.user.role === 'owner';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Screen>
      <H1 style={{ marginBottom: 16 }}>Meer</H1>

      <Panel style={styles.gap}>
        <View style={styles.me}>
          <Avatar initials={me.user.initials} yellow />
          <View style={{ flex: 1 }}>
            <Txt weight="bold">{me.user.firstName} {me.user.lastName}</Txt>
            <Muted style={{ fontSize: 14 }}>{roleLabel[me.user.role]} · {me.user.email}</Muted>
          </View>
        </View>
      </Panel>

      <RestaurantCard restaurant={me.restaurant} canEdit={isOwner} />
      <ClockRulesCard canEdit={isOwner} />
      <FloorQr restaurant={me.restaurant} />

      <Button title="Uitloggen" variant="danger" onPress={handleLogout} full />

      <Muted style={styles.version}>
        Klokit {Constants.expoConfig?.version}{__DEV__ ? ` · API ${API_URL}` : ''}
      </Muted>
    </Screen>
  );
}

/** Restaurant met een voorbeeld van de werkzone; aanpassen gebeurt in het volledige kaartscherm. */
function RestaurantCard({ restaurant, canEdit }: { restaurant: Me['restaurant']; canEdit: boolean }) {
  const loc = restaurant.location;
  return (
    <Panel style={styles.gap}>
      <View style={styles.cardHead}>
        <H3 style={{ flex: 1 }}>{restaurant.name}</H3>
        {loc ? <Pill label={`Straal ${restaurant.radius} m`} tone="green" /> : <Pill label="Geen werkzone" tone="red" />}
      </View>
      <Muted style={{ fontSize: 14, marginBottom: 12 }}>
        {restaurant.address ?? (loc ? 'Geen adres ingevuld' : 'Nog geen locatie op de kaart. Zonder werkzone kan niemand inklokken.')}
      </Muted>

      <Pressable
        onPress={() => router.push('/werkzone')} accessibilityRole="button"
        accessibilityLabel={canEdit ? 'Werkzone aanpassen' : 'Werkzone bekijken'}
      >
        <ZoneMap location={loc} radius={restaurant.radius} height={170} interactive={false} />
      </Pressable>

      <Button
        title={canEdit ? (loc ? 'Werkzone aanpassen' : 'Werkzone instellen') : 'Werkzone bekijken'}
        variant={loc || !canEdit ? 'outline' : 'yellow'} onPress={() => router.push('/werkzone')}
        style={{ marginTop: 12 }} full
      />
    </Panel>
  );
}

const WEAK_OPTIONS = [20, 30, 50, 75];

/** Klokregels (zoals op de website bij Instellingen). Elke wijziging wordt direct opgeslagen. */
function ClockRulesCard({ canEdit }: { canEdit: boolean }) {
  const { data, error: loadError, setData } = useApi<RestaurantSettings>('/restaurant');
  const [rules, setRules] = useState<ClockRules | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (data) setRules(data.rules);
  }, [data]);

  async function change(patch: Partial<ClockRules>, label: string) {
    if (!rules) return;
    const previous = rules;
    setRules({ ...rules, ...patch });
    setError('');
    setSaved('');
    try {
      const next = await api<RestaurantSettings>('/restaurant', { method: 'PATCH', body: { rules: patch } });
      setData(next);
      setSaved(`${label} opgeslagen`);
    } catch (err) {
      setRules(previous);
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  }

  return (
    <Panel style={styles.gap}>
      <H3 style={{ marginBottom: 4 }}>Klokregels</H3>
      {!canEdit && <Muted style={{ fontSize: 13, marginBottom: 4 }}>Alleen de eigenaar kan dit aanpassen.</Muted>}
      <ErrorText>{loadError || error}</ErrorText>

      {rules && (
        <>
          <Rule
            title="Nep-locaties blokkeren" help="Inklokken met nep-GPS weigeren waar het toestel dat meldt (Android)."
            value={rules.blockMocked} disabled={!canEdit}
            onChange={(blockMocked) => change({ blockMocked }, 'Nep-locaties blokkeren')}
          />
          <Rule
            title="Zwakke GPS markeren"
            help={rules.weakGpsM !== null ? `Markeer punches met een nauwkeurigheid slechter dan ${rules.weakGpsM} m.` : 'Punches met zwakke GPS worden niet gemarkeerd.'}
            value={rules.weakGpsM !== null} disabled={!canEdit}
            onChange={(on) => change({ weakGpsM: on ? 30 : null }, 'Zwakke GPS markeren')}
          >
            {rules.weakGpsM !== null && (
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Grens voor zwakke GPS">
                {WEAK_OPTIONS.map((m) => {
                  const on = rules.weakGpsM === m;
                  return (
                    <Pressable
                      key={m} disabled={!canEdit} onPress={() => change({ weakGpsM: m }, `Grens ${m} m`)}
                      accessibilityRole="radio" accessibilityState={{ selected: on, disabled: !canEdit }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Txt weight="bold" style={{ fontSize: 13, color: on ? colors.deep : colors.mute }}>{m} m</Txt>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Rule>
          <Rule
            title="Automatisch uitklokken" help="Stop een dienst om middernacht als niemand uitklokt. Er komt dan een correctie klaar om na te kijken."
            value={rules.autoClockOut} disabled={!canEdit} last
            onChange={(autoClockOut) => change({ autoClockOut }, 'Automatisch uitklokken')}
          />
        </>
      )}
      {saved ? <Txt weight="semibold" style={{ fontSize: 13, color: '#146B3A', marginTop: 8 }} accessibilityLiveRegion="polite">{saved}</Txt> : null}
    </Panel>
  );
}

function Rule({ title, help, value, onChange, disabled, last, children }: {
  title: string; help: string; value: boolean; onChange: (v: boolean) => void;
  disabled?: boolean; last?: boolean; children?: ReactNode;
}) {
  return (
    <View style={[styles.rule, !last && styles.ruleDivider]}>
      <View style={styles.ruleRow}>
        <View style={{ flex: 1 }}>
          <Txt weight="bold">{title}</Txt>
          <Muted style={{ fontSize: 13 }}>{help}</Muted>
        </View>
        <Switch
          value={value} onValueChange={onChange} disabled={disabled}
          trackColor={{ false: '#C9DCD3', true: colors.deep }} thumbColor={colors.white} ios_backgroundColor="#C9DCD3"
          accessibilityLabel={title}
        />
      </View>
      {children}
    </View>
  );
}

/**
 * QR-code om op te hangen in het restaurant. Scannen met de iPhone-camera opent de app direct in het
 * inklokscherm. De link maakt de app zelf: in Expo Go is dat exp://<computer>:8081/--/klok,
 * in een App Store-versie klokit://klok.
 */
function FloorQr({ restaurant }: { restaurant: Me['restaurant'] }) {
  const url = Linking.createURL('/klok');
  const isDevLink = url.startsWith('exp://') || url.startsWith('http');

  return (
    <Panel dark style={styles.gap}>
      <H3 style={{ color: colors.white, marginBottom: 6 }}>QR-code voor de werkvloer</H3>
      <Txt style={{ color: colors.stepText, fontSize: 14 }}>
        Hang deze code op bij {restaurant.name}. Medewerkers scannen hem met de camera van hun iPhone en komen direct in het inklokscherm van de app.
      </Txt>
      <View style={styles.qrWrap}>
        <View style={styles.qr}><QrCode value={url} size={180} /></View>
      </View>
      <Txt numberOfLines={1} style={{ color: colors.mint, fontSize: 12, textAlign: 'center' }}>{url}</Txt>
      {isDevLink && (
        <Txt style={{ color: colors.stepText, fontSize: 12, marginTop: 8 }}>
          Testversie: deze code werkt met Expo Go zolang de ontwikkelserver draait. De App Store-versie krijgt een vaste code.
        </Txt>
      )}
      <Button
        title="Link delen…" variant="yellow" style={{ marginTop: 14 }}
        onPress={() => Share.share({ message: `Inklokken bij ${restaurant.name}: ${url}` }).catch(() => {})}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  gap: { marginBottom: 16 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  rule: { paddingVertical: 12 },
  ruleDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.pin, borderColor: colors.pin },
  qrWrap: { alignItems: 'center', marginVertical: 16 },
  qr: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 20 },
});
