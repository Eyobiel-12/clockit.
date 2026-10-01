import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { DateTimeField } from '../components/DateTimeField';
import { Button, ErrorText, H1, Muted, Txt } from '../components/ui';
import { colors, fonts, radius } from '../components/theme';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { today } from '../lib/format';

type Type = 'forgot_clock_out' | 'wrong_time' | 'forgot_clock_in';

/**
 * Correctie aanvragen door een medewerker. Met een dienst (shiftId): uitklokken vergeten of tijd klopt niet.
 * Zonder dienst: inklokken vergeten, dan maakt de eigenaar bij goedkeuren een nieuwe dienst aan.
 */
export default function CorrectieAanvragen() {
  const { me } = useAuth();
  const p = useLocalSearchParams<{ shiftId?: string; date?: string; clockIn?: string; clockOut?: string; day?: string; autoClosed?: string }>();
  const shiftId = p.shiftId ? Number(p.shiftId) : null;
  const options: { key: Type; label: string; help: string }[] = shiftId
    ? [
      { key: 'forgot_clock_out', label: 'Uitklokken vergeten', help: 'Je bent later of eerder gestopt dan er staat.' },
      { key: 'wrong_time', label: 'Tijd klopt niet', help: 'Bijvoorbeeld te laat ingeklokt of een pauze die er niet af staat.' },
    ]
    : [{ key: 'forgot_clock_in', label: 'Inklokken vergeten', help: 'Je hebt gewerkt maar niet ingeklokt.' }];

  const [type, setType] = useState<Type>(shiftId ? (p.autoClosed === '1' ? 'forgot_clock_out' : 'wrong_time') : 'forgot_clock_in');
  const [date, setDate] = useState(p.date ?? today());
  const [clockIn, setClockIn] = useState(p.clockIn ?? '');
  const [clockOut, setClockOut] = useState(p.autoClosed === '1' ? '' : p.clockOut ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!me) return <Redirect href="/login" />;

  async function submit() {
    if (!clockIn || !clockOut) return setError('Vul de juiste in- en uitkloktijd in.');
    if (reason.trim().length < 3) return setError('Leg kort uit wat er misging.');
    setBusy(true);
    setError('');
    try {
      await api('/corrections', {
        method: 'POST',
        body: { ...(shiftId ? { shiftId } : {}), type, date, clockIn, clockOut, reason: reason.trim() },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Versturen mislukt');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/klok');
  }

  if (sent) {
    return (
      <Screen standalone contentStyle={{ gap: 16, justifyContent: 'center' }}>
        <View style={styles.stamp}><Txt weight="display" style={styles.stampText}>VERSTUURD</Txt></View>
        <H1>Je aanvraag is verstuurd</H1>
        <Muted>Je leidinggevende bekijkt hem. Je ziet de status bij je diensten en onder &ldquo;Mijn aanvragen&rdquo;.</Muted>
        <Button title="Terug" onPress={back} full />
      </Screen>
    );
  }

  return (
    <Screen standalone>
      <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Terug" hitSlop={8} style={styles.back}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.deep} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
        <Txt weight="bold">Terug</Txt>
      </Pressable>

      <H1 style={{ marginBottom: 6 }}>Correctie aanvragen</H1>
      <Muted style={{ marginBottom: 18 }}>
        {shiftId && p.day ? `Dienst van ${p.day}: ${p.clockIn} – ${p.autoClosed === '1' ? 'niet uitgeklokt' : p.clockOut}` : 'Een dienst toevoegen die niet geregistreerd is.'}
      </Muted>

      <Txt weight="bold" style={{ fontSize: 14, marginBottom: 8 }}>Wat klopt er niet?</Txt>
      <View style={{ gap: 8, marginBottom: 18 }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = type === o.key;
          return (
            <Pressable key={o.key} onPress={() => setType(o.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.option, on && styles.optionOn]}>
              <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Txt weight="bold">{o.label}</Txt>
                <Muted style={{ fontSize: 13 }}>{o.help}</Muted>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!shiftId && <DateTimeField label="Datum" mode="date" value={date} maxToday onChange={setDate} />}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateTimeField style={{ flex: 1 }} label="Ingeklokt" mode="time" value={clockIn} onChange={setClockIn} />
        <DateTimeField style={{ flex: 1 }} label="Uitgeklokt" mode="time" value={clockOut} onChange={setClockOut} />
      </View>
      <Muted style={{ fontSize: 12, marginBottom: 16 }}>Vul de tijden in zoals ze hadden moeten zijn. Na middernacht gestopt? Dan telt de uitkloktijd voor de volgende dag.</Muted>

      <Txt weight="bold" style={{ fontSize: 14, marginBottom: 6 }}>Toelichting</Txt>
      <TextInput
        value={reason} onChangeText={setReason} multiline maxLength={500} accessibilityLabel="Toelichting"
        placeholder="Bijvoorbeeld: vergeten uit te klokken, ben om 19:00 gestopt. Mehmet kan dat bevestigen."
        placeholderTextColor={colors.placeholder} style={styles.reason}
      />

      <View style={{ marginTop: 14 }}><ErrorText>{error}</ErrorText></View>
      <Button title={busy ? 'Versturen…' : 'Aanvraag versturen'} onPress={submit} loading={busy} full />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start', marginBottom: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
  },
  optionOn: { borderColor: colors.deep, backgroundColor: colors.mintl },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mute, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.deep },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.deep },
  reason: {
    borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, padding: 12, minHeight: 90,
    fontSize: 15, color: colors.deep, fontFamily: fonts.body, textAlignVertical: 'top', backgroundColor: colors.white,
  },
  stamp: { alignSelf: 'flex-start', borderWidth: 3, borderColor: '#146B3A', paddingHorizontal: 10, transform: [{ rotate: '-4deg' }] },
  stampText: { color: '#146B3A', fontSize: 22, lineHeight: 30 },
});
