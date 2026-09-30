import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, H3, Muted, Panel, Pill, Txt } from './ui';
import { colors, radius } from './theme';
import { api, ApiError, type ClockStatus, type Shift } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getPosition, LocationError } from '../lib/location';
import { useApi } from '../lib/useApi';

const correctionLabel = { pending: 'aangevraagd', approved: 'goedgekeurd', rejected: 'afgewezen' } as const;

type Result = { ok: boolean; title: string; text: string; settings?: boolean };

function elapsed(fromIso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
}

/** In- en uitklokken met GPS. `showHistory` toont ook de laatste diensten (voor het medewerkerscherm). */
export function ClockCard({ showHistory, onChange }: { showHistory?: boolean; onChange?: () => void }) {
  const { refresh } = useAuth();
  const { data, error, reload } = useApi<ClockStatus>('/shifts/me', 60_000);
  const [step, setStep] = useState<'idle' | 'locating' | 'sending'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(Date.now());

  // Terug op dit scherm (bv. na een correctie-aanvraag): opnieuw ophalen.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function clockIn() {
    setResult(null);
    try {
      setStep('locating');
      const pos = await getPosition();
      setStep('sending');
      const shift = await api<Shift>('/shifts/clock-in', { method: 'POST', body: pos });
      setResult({ ok: true, title: 'GELUKT', text: `Ingeklokt om ${shift.clockIn} · ${shift.distance} van de zaak (${shift.accuracy})` });
    } catch (err) {
      if (err instanceof LocationError) {
        setResult({ ok: false, title: 'GEEN LOCATIE', text: err.message, settings: err.openSettings });
      } else if (err instanceof ApiError && err.code === 'outside') {
        setResult({ ok: false, title: 'BUITEN ZONE', text: err.message });
      } else {
        setResult({ ok: false, title: 'NIET GELUKT', text: err instanceof Error ? err.message : 'Inklokken mislukt' });
      }
    } finally {
      setStep('idle');
      await Promise.all([reload(), refresh()]);
      onChange?.();
    }
  }

  async function clockOut() {
    setResult(null);
    setStep('sending');
    try {
      const shift = await api<Shift>('/shifts/clock-out', { method: 'POST' });
      setResult({ ok: true, title: 'UITGEKLOKT', text: `Om ${shift.clockOut} · dienst van ${shift.duration} uur` });
    } catch (err) {
      setResult({ ok: false, title: 'NIET GELUKT', text: err instanceof Error ? err.message : 'Uitklokken mislukt' });
    } finally {
      setStep('idle');
      await Promise.all([reload(), refresh()]);
      onChange?.();
    }
  }

  const busy = step !== 'idle';
  const open = data?.open;

  return (
    <Panel style={styles.card}>
      <View style={styles.head}>
        <H3>{open ? 'Je bent ingeklokt' : 'Inklokken'}</H3>
        {open ? <Pill label="In dienst" tone="green" /> : data && <Pill label={`Straal ${data.restaurant.radius} m`} />}
      </View>

      {error && <Muted>{error}</Muted>}

      {data && (
        <>
          {open ? (
            <View style={styles.live}>
              <Txt weight="display" style={styles.timer} accessibilityLabel={`${elapsed(open.clockInAt, now)} uur in dienst`}>
                {elapsed(open.clockInAt, now)}
              </Txt>
              <Muted style={{ fontSize: 14 }}>Sinds {open.clockIn} · {open.distance} van de zaak ({open.accuracy})</Muted>
            </View>
          ) : (
            <Muted style={{ fontSize: 14, marginBottom: 14 }}>
              {data.blocked ?? `Sta binnen ${data.restaurant.radius} m van ${data.restaurant.name} en tik op inklokken. Je locatie wordt alleen nu gebruikt.`}
            </Muted>
          )}

          {open ? (
            <Button title={busy ? 'Uitklokken…' : 'Uitklokken'} variant="dark" onPress={clockOut} loading={busy} full />
          ) : (
            <Button
              title={step === 'locating' ? 'Locatie bepalen…' : step === 'sending' ? 'Inklokken…' : 'Inklokken'}
              variant="yellow" onPress={clockIn} loading={busy} disabled={!!data.blocked} full
              style={{ minHeight: 56 }}
            />
          )}

          {result && (
            <View style={[styles.ticket, !result.ok && styles.ticketNo]} accessibilityLiveRegion="polite" accessibilityRole="alert">
              <View style={[styles.stamp, !result.ok && styles.stampNo]}>
                <Txt weight="display" style={[styles.stampText, !result.ok && { color: '#5b6268' }]}>{result.title}</Txt>
              </View>
              <Txt style={{ fontSize: 14, flex: 1 }}>{result.text}</Txt>
              {result.settings && (
                <Button title="Open Instellingen" variant="outline" onPress={() => Linking.openSettings()} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
              )}
            </View>
          )}

          <View style={styles.totals}>
            <View style={styles.total}><Muted style={{ fontSize: 13 }}>Vandaag</Muted><Txt weight="bold">{data.today}</Txt></View>
            <View style={styles.total}><Muted style={{ fontSize: 13 }}>Deze week</Muted><Txt weight="bold">{data.week}</Txt></View>
          </View>

          {showHistory && (
            <View style={{ marginTop: 12 }}>
              <Txt weight="bold" style={{ marginBottom: 2 }}>Laatste diensten</Txt>
              <Muted style={{ fontSize: 12, marginBottom: 4 }}>Klopt een tijd niet? Tik op de dienst om een correctie aan te vragen.</Muted>
              {data.recent.length === 0 && <Muted style={{ fontSize: 13, paddingVertical: 8 }}>Nog geen afgeronde diensten.</Muted>}
              {data.recent.map((s) => {
                const c = s.correction;
                const canRequest = !c || c.status !== 'pending';
                return (
                  <Pressable
                    key={s.id} disabled={!canRequest} accessibilityRole="button"
                    accessibilityLabel={`${s.day}, ${s.clockIn} tot ${s.clockOut}, ${s.duration} uur${c ? `, correctie ${correctionLabel[c.status]}` : ''}`}
                    accessibilityHint={canRequest ? 'Correctie aanvragen' : undefined}
                    onPress={() => router.push({
                      pathname: '/correctie-aanvragen',
                      params: {
                        shiftId: String(s.id), date: s.local.date, clockIn: s.local.clockIn, clockOut: s.local.clockOut ?? '',
                        day: s.day, autoClosed: s.autoClosed ? '1' : '0',
                      },
                    })}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.mintl }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontSize: 14 }}>{s.day}</Txt>
                      <Muted style={{ fontSize: 13 }}>
                        {s.clockIn} – {s.autoClosed ? 'niet uitgeklokt' : s.clockOut}
                      </Muted>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Txt weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{s.duration}</Txt>
                      {c && <Pill label={`Correctie ${correctionLabel[c.status]}`} tone={c.status === 'pending' ? 'yellow' : c.status === 'approved' ? 'green' : 'gray'} />}
                    </View>
                  </Pressable>
                );
              })}
              <Button
                title="Inklokken vergeten? Dienst toevoegen" variant="outline" style={{ marginTop: 10 }} full
                onPress={() => router.push('/correctie-aanvragen')}
              />
            </View>
          )}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  live: { marginBottom: 14 },
  timer: { fontSize: 48, lineHeight: 54 },
  ticket: {
    marginTop: 14, padding: 14, borderRadius: radius.md, backgroundColor: '#DDF3E7', gap: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#9fd4b7',
  },
  ticketNo: { backgroundColor: '#EEF1F0', borderColor: '#c3c9c7' },
  stamp: {
    alignSelf: 'flex-start', borderWidth: 3, borderColor: '#146B3A', paddingHorizontal: 10, paddingVertical: 1,
    transform: [{ rotate: '-4deg' }],
  },
  stampNo: { borderColor: '#6f767c' },
  stampText: { color: '#146B3A', fontSize: 20, lineHeight: 26, letterSpacing: 0.5 },
  totals: { flexDirection: 'row', gap: 12, marginTop: 14 },
  total: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: colors.line, minHeight: 52 },
});
