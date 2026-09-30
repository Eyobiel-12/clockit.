import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Link, Redirect, router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { Button, ErrorText, Field, H1, Logo, Muted, Txt } from '../components/ui';
import { colors, radius } from '../components/theme';
import { api, API_URL, type AuthResponse } from '../lib/api';
import { homeFor, useAuth } from '../lib/auth';

export default function Login() {
  const { me, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<TextInput>(null);

  if (me) return <Redirect href={homeFor(me)} />;

  async function submit() {
    if (!email.trim() || !password) {
      setError('Vul je e-mailadres en wachtwoord in.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password, remember: keep } });
      const user = await signIn(res, keep);
      router.replace(homeFor(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt');
      setBusy(false);
    }
  }

  return (
    <Screen standalone background={colors.white} contentStyle={{ backgroundColor: colors.white, paddingTop: 24 }}>
      <Logo />

      <View style={styles.form}>
        <H1 style={{ fontSize: 36, lineHeight: 40, marginBottom: 6 }}>Welkom terug</H1>
        <Muted style={{ marginBottom: 26 }}>Log in om je team en uren te bekijken.</Muted>

        <Field
          label="E-mailadres" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
          placeholder="naam@restaurant.nl" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()}
        />
        <Field
          ref={pwRef} label="Wachtwoord" value={password} onChangeText={setPassword}
          secureTextEntry autoComplete="current-password" textContentType="password"
          returnKeyType="go" onSubmitEditing={submit}
        />

        <ErrorText>{error}</ErrorText>

        <View style={styles.row}>
          <Pressable
            onPress={() => setKeep((k) => !k)} style={styles.check}
            accessibilityRole="checkbox" accessibilityState={{ checked: keep }} hitSlop={8}
          >
            <View style={[styles.box, keep && styles.boxOn]}>
              {keep && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M4 12l5 5L20 6" />
                </Svg>
              )}
            </View>
            <Txt weight="medium" style={{ fontSize: 14 }}>Ingelogd blijven</Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button" hitSlop={8}
            onPress={() => Alert.alert('Wachtwoord vergeten', 'Wachtwoord herstellen komt binnenkort. Vraag voorlopig je leidinggevende om hulp.')}
          >
            <Txt weight="bold" style={{ fontSize: 14 }}>Wachtwoord vergeten?</Txt>
          </Pressable>
        </View>

        <Button title={busy ? 'Bezig met inloggen…' : 'Inloggen'} onPress={submit} loading={busy} full />

        <View style={styles.or}>
          <View style={styles.line} /><Muted style={{ fontSize: 14 }}>of</Muted><View style={styles.line} />
        </View>

        <View style={styles.code}>
          <Txt weight="bold">Heb je een uitnodigingscode?</Txt>
          <Txt style={{ fontSize: 14 }}>
            Maak een account als medewerker en je komt meteen in het juiste team.{' '}
            <Link href={{ pathname: '/registreren', params: { mode: 'code' } }}>
              <Txt weight="bold" style={{ fontSize: 14, textDecorationLine: 'underline' }}>Code invoeren</Txt>
            </Link>
          </Txt>
        </View>
      </View>

      <Muted style={{ fontSize: 14, marginTop: 28 }}>
        Nog geen account?{' '}
        <Link href="/registreren">
          <Txt weight="bold" style={{ fontSize: 14, textDecorationLine: 'underline' }}>Maak een restaurant aan</Txt>
        </Link>
      </Muted>
      {__DEV__ && <Muted style={{ fontSize: 11, marginTop: 16 }}>API: {API_URL}</Muted>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 36 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -4, marginBottom: 22, gap: 12, flexWrap: 'wrap' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.deep, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.deep },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  code: { backgroundColor: colors.mintl, borderRadius: radius.lg, padding: 16, gap: 2 },
});
