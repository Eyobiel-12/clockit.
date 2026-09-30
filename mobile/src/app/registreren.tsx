import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, ErrorText, Field, H1, Logo, Muted, Txt } from '../components/ui';
import { colors, radius } from '../components/theme';
import { api, type AuthResponse } from '../lib/api';
import { homeFor, useAuth } from '../lib/auth';

type Mode = 'owner' | 'code';

const ownerSteps = [
  { title: 'Account maken', text: 'Je naam, e-mail en wachtwoord.' },
  { title: 'Restaurant op de kaart', text: 'Pin je zaak en kies een straal.' },
  { title: 'Team uitnodigen', text: 'Deel een code van 6 cijfers.' },
];

const codeSteps = [
  { title: 'Account maken', text: 'Met de code van je leidinggevende.' },
  { title: 'Bevestiging afwachten', text: 'Je leidinggevende keurt je aanmelding goed.' },
  { title: 'Inklokken', text: 'Klok in met je telefoon als je op de zaak bent.' },
];

export default function Register() {
  const { me, signIn } = useAuth();
  const params = useLocalSearchParams<{ mode?: string; code?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'code' || params.code ? 'code' : 'owner');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', restaurantName: '', code: params.code ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (me) return <Redirect href={homeFor(me)} />;

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    if (form.password.length < 8) {
      setError('Je wachtwoord moet minimaal 8 tekens hebben.');
      return;
    }
    setBusy(true);
    setError('');
    const { restaurantName, code, ...person } = form;
    try {
      const res = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: mode === 'owner' ? { mode, ...person, restaurantName } : { mode, ...person, code: code.replace(/\s/g, '') },
      });
      const user = await signIn(res);
      // Nieuwe eigenaar: eerst het restaurant op de kaart zetten (stap 2 van 3).
      if (mode === 'owner') router.replace({ pathname: '/werkzone', params: { stap: '1' } });
      else router.replace(homeFor(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account maken mislukt');
      setBusy(false);
    }
  }

  const steps = mode === 'owner' ? ownerSteps : codeSteps;

  return (
    <Screen standalone background={colors.mintl}>
      <View style={styles.top}>
        <Logo />
        <Muted style={{ fontSize: 14 }}>
          Al een account?{' '}
          <Link href="/login"><Txt weight="bold" style={{ fontSize: 14, textDecorationLine: 'underline' }}>Inloggen</Txt></Link>
        </Muted>
      </View>

      <View style={styles.box}>
        <View style={styles.form}>
          <H1 style={{ marginBottom: 6 }}>Account maken</H1>
          <Muted style={{ marginBottom: 22 }}>Gratis voor teams tot 5 medewerkers.</Muted>

          <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel="Soort account">
            {(['owner', 'code'] as const).map((m) => (
              <Pressable
                key={m} onPress={() => setMode(m)}
                accessibilityRole="radio" accessibilityState={{ selected: mode === m }}
                style={[styles.segBtn, mode === m && styles.segOn]}
              >
                <Txt weight="bold" style={{ fontSize: 14, color: mode === m ? colors.deep : colors.mute }}>
                  {m === 'owner' ? 'Ik ben eigenaar' : 'Ik heb een code'}
                </Txt>
              </Pressable>
            ))}
          </View>

          {mode === 'code' && (
            <Field
              label="Uitnodigingscode" value={form.code} onChangeText={set('code')}
              keyboardType="number-pad" maxLength={7} placeholder="123456" autoComplete="one-time-code"
              help="6 cijfers, die krijg je van je leidinggevende."
              inputStyle={styles.codeInput}
            />
          )}

          <View style={styles.two}>
            <Field label="Voornaam" value={form.firstName} onChangeText={set('firstName')} autoComplete="given-name" style={{ flex: 1 }} />
            <Field label="Achternaam" value={form.lastName} onChangeText={set('lastName')} autoComplete="family-name" style={{ flex: 1 }} />
          </View>

          {mode === 'owner' && (
            <Field label="Naam van je restaurant" value={form.restaurantName} onChangeText={set('restaurantName')} />
          )}

          <Field
            label="E-mailadres" value={form.email} onChangeText={set('email')}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          />
          <Field
            label="Wachtwoord" value={form.password} onChangeText={set('password')}
            secureTextEntry autoComplete="new-password" help="Minimaal 8 tekens"
          />

          <ErrorText>{error}</ErrorText>

          <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
            Door een account te maken ga je akkoord met de voorwaarden en het privacybeleid.
          </Muted>
          <Button title={busy ? 'Account maken…' : 'Account maken'} onPress={submit} loading={busy} full />
        </View>

        <View style={styles.steps}>
          <Txt weight="display" accessibilityRole="header" style={styles.stepsTitle}>Zo ben je klaar</Txt>
          {steps.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={[styles.n, i === 0 && styles.nOn]}>
                <Txt weight="extrabold" style={{ color: i === 0 ? colors.deep : colors.white }}>{i + 1}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="bold" style={{ color: colors.white, fontSize: 16 }}>{s.title}</Txt>
                <Txt style={{ color: colors.stepText, fontSize: 14 }}>{s.text}</Txt>
              </View>
            </View>
          ))}
          <View style={styles.note}>
            <Txt style={{ color: colors.sideText, fontSize: 14 }}>
              Klokit gebruikt de locatie van je team alleen op het moment van in- en uitklokken.
            </Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 8, marginBottom: 12 },
  box: { backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  form: { padding: 20, paddingTop: 26 },
  seg: { flexDirection: 'row', backgroundColor: colors.mintl, borderRadius: radius.pill, padding: 5, marginBottom: 22 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: radius.pill },
  segOn: {
    backgroundColor: colors.white,
    shadowColor: colors.deep, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  codeInput: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, letterSpacing: 6 },
  two: { flexDirection: 'row', gap: 12 },
  steps: { backgroundColor: colors.deep, padding: 24 },
  stepsTitle: { color: colors.white, fontSize: 22, lineHeight: 28, marginBottom: 20 },
  step: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  n: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  nOn: { backgroundColor: colors.pin, borderColor: colors.pin },
  note: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
});
