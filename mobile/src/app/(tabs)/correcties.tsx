import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { DateTimeField } from '../../components/DateTimeField';
import { Avatar, Button, ErrorText, H1, H3, Muted, Pill, Txt } from '../../components/ui';
import { colors, fonts, pills, radius } from '../../components/theme';
import { api, type Correction, type CorrectionStatus, type CorrectionsData, type TimeSpan } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';

const TABS: { key: CorrectionStatus; label: string }[] = [
  { key: 'pending', label: 'Open' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'rejected', label: 'Afgewezen' },
];

const statusPill: Record<CorrectionStatus, { tone: keyof typeof pills; label: string }> = {
  pending: { tone: 'red', label: 'Open' },
  approved: { tone: 'green', label: 'Goedgekeurd' },
  rejected: { tone: 'gray', label: 'Afgewezen' },
};

/** Correcties (Corrections.dc.html) voor de telefoon: lijst met aanvragen, tik voor details en besluit. */
export default function Correcties() {
  const { refresh } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const [status, setStatus] = useState<CorrectionStatus>('pending');
  const { data, error, loading, reload, refreshing, pullToRefresh } = useApi<CorrectionsData>(`/corrections?status=${status}`);
  const [openId, setOpenId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  // Vanuit het overzicht of urenoverzicht direct een correctie openen (?id=…).
  useEffect(() => {
    if (params.id) setOpenId(Number(params.id));
  }, [params.id]);

  const open = data?.items.find((c) => c.id === openId) ?? null;

  function close() {
    setOpenId(null);
    if (params.id) router.setParams({ id: undefined });
  }

  async function done(c: Correction) {
    close();
    setMessage(`${c.user.firstName}: ${c.status === 'approved' ? 'goedgekeurd' : 'afgewezen'}.`);
    await Promise.all([reload(), refresh()]);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={pullToRefresh}>
      <H1>Correcties</H1>
      <Muted style={{ marginBottom: 14 }}>Aanvragen van je team om een tijd aan te passen</Muted>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.key} onPress={() => { setStatus(t.key); setMessage(''); }}
            accessibilityRole="tab" accessibilityState={{ selected: status === t.key }}
            style={[styles.tab, status === t.key && styles.tabOn]}
          >
            <Txt weight="bold" style={{ fontSize: 14, color: status === t.key ? colors.deep : colors.mute }}>
              {t.label}{data ? ` (${data.counts[t.key]})` : ''}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>

      {message ? <Txt weight="semibold" style={styles.ok} accessibilityLiveRegion="polite">{message}</Txt> : null}
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Muted>Correcties laden…</Muted>}
      {data && data.items.length === 0 && (
        <Muted style={{ marginTop: 8 }}>{status === 'pending' ? 'Geen open correcties. Alles is bijgewerkt.' : 'Nog niets hier.'}</Muted>
      )}

      {data?.items.map((c) => (
        <Pressable
          key={c.id} onPress={() => setOpenId(c.id)} accessibilityRole="button"
          accessibilityLabel={`${c.user.name}, ${c.typeLabel}, ${c.dayShort}${c.delta ? `, ${c.delta}` : ''}`}
          style={({ pressed }) => [styles.req, pressed && { backgroundColor: colors.mintl }]}
        >
          <Avatar initials={c.user.initials} />
          <View style={{ flex: 1 }}>
            <Txt weight="bold">{c.user.name}</Txt>
            <Muted style={{ fontSize: 13 }}>{c.typeLabel} · {c.dayShort}</Muted>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {c.delta && <Pill label={c.delta} tone={c.status === 'pending' ? (c.current ? 'red' : 'yellow') : statusPill[c.status].tone} />}
            <Muted style={{ fontSize: 12 }}>{c.status === 'pending' ? c.createdAgo : c.decision?.ago}</Muted>
          </View>
        </Pressable>
      ))}

      <Modal
        visible={!!open} animationType="slide" onRequestClose={close}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      >
        {open && <Detail c={open} onClose={close} onDone={done} />}
      </Modal>
    </Screen>
  );
}

function Times({ title, span, empty, bg }: { title: string; span: TimeSpan | null; empty: string; bg: string }) {
  return (
    <View style={[styles.cmpBox, { backgroundColor: bg }]}>
      <Txt weight="bold" style={{ fontSize: 12, color: colors.mute }}>{title}</Txt>
      {span ? (
        <>
          <Txt weight="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 21, lineHeight: 28 }}>
            {span.clockIn} – {span.clockOut ?? '…'}
          </Txt>
          <Txt style={{ fontSize: 13 }}>{span.duration ? `${span.duration} uur` : 'nog niet uitgeklokt'}</Txt>
        </>
      ) : <Muted style={{ fontSize: 13, marginTop: 4 }}>{empty}</Muted>}
    </View>
  );
}

function Detail({ c, onClose, onDone }: { c: Correction; onClose: () => void; onDone: (c: Correction) => void }) {
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [times, setTimes] = useState(c.prefill);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const pill = statusPill[c.status];

  async function decide(decision: 'approve' | 'reject') {
    setBusy(decision);
    setError('');
    try {
      const next = await api<Correction>(`/corrections/${c.id}/decide`, {
        method: 'POST',
        body: { decision, note: note.trim() || undefined, ...(decision === 'approve' && editing ? { times } : {}) },
      });
      onDone(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
      if (decision === 'approve' && !editing && !c.requested) setEditing(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top', 'bottom']}>
      <View style={styles.sheetHead}>
        <Pill label={pill.label} tone={pill.tone} />
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Txt weight="bold">Sluiten</Txt>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
        <H1 style={{ fontSize: 26, lineHeight: 30 }}>{c.user.name}</H1>
        <Muted style={{ marginBottom: 14 }}>{c.dayLong} · {c.typeLabel}{c.automatic ? ' · automatisch' : ''}</Muted>

        <View style={styles.cmp}>
          <Times title={c.status === 'pending' ? 'Nu geregistreerd' : 'Was geregistreerd'} span={c.current} empty="Geen dienst geregistreerd" bg="#FBE3E3" />
          <Times
            title={c.status === 'approved' ? 'Goedgekeurd' : 'Aangevraagd'} span={c.status === 'approved' ? c.applied : c.requested}
            empty={c.automatic ? 'Nog geen tijd: vul de juiste uitkloktijd in' : 'Geen tijden opgegeven'} bg="#DDF3E7"
          />
        </View>

        <View style={styles.msg}>
          <Txt weight="bold" style={{ fontSize: 12, color: colors.mute }}>{c.automatic ? 'Waarom deze correctie' : `Toelichting van ${c.user.firstName}`}</Txt>
          <Txt style={{ fontSize: 14 }}>
            {c.automatic ? `${c.user.firstName} klokte niet uit. Klokit stopte de dienst om middernacht. Controleer de uitkloktijd.` : c.reason || '—'}
          </Txt>
        </View>

        <H3 style={{ fontSize: 16, marginTop: 6, marginBottom: 6 }}>Geschiedenis</H3>
        <View style={styles.log}>
          {c.history.map((h, i) => (
            <View key={i} style={styles.logItem}>
              <View style={styles.dot} />
              <Txt style={{ fontSize: 14, flex: 1 }}>
                <Txt weight="bold" style={{ fontSize: 14 }}>{h.title}</Txt> {h.detail}
                {h.note ? <Txt style={{ fontSize: 12, color: colors.mute }}> ({h.note})</Txt> : null}
              </Txt>
            </View>
          ))}
        </View>

        {c.decision?.note && (
          <View style={styles.msg}>
            <Txt weight="bold" style={{ fontSize: 12, color: colors.mute }}>Opmerking van {c.decision.by}</Txt>
            <Txt style={{ fontSize: 14 }}>{c.decision.note}</Txt>
          </View>
        )}

        {c.status === 'pending' && (
          <>
            {editing && (
              <View style={styles.edit}>
                <Txt weight="extrabold" style={{ marginBottom: 10 }}>Tijd aanpassen</Txt>
                <DateTimeField label="Datum" mode="date" value={times.date} maxToday onChange={(date) => setTimes({ ...times, date })} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <DateTimeField style={{ flex: 1 }} label="Ingeklokt" mode="time" value={times.clockIn} onChange={(clockIn) => setTimes({ ...times, clockIn })} />
                  <DateTimeField style={{ flex: 1 }} label="Uitgeklokt" mode="time" value={times.clockOut} onChange={(clockOut) => setTimes({ ...times, clockOut })} />
                </View>
                <Muted style={{ fontSize: 12 }}>Uitklokken vóór de inkloktijd telt als de volgende dag (nachtdienst).</Muted>
              </View>
            )}

            <Txt weight="bold" style={{ fontSize: 14, marginTop: 16, marginBottom: 6 }}>Opmerking (optioneel)</Txt>
            <TextInput
              value={note} onChangeText={setNote} placeholder="Bijvoorbeeld: bevestigd met Mehmet" placeholderTextColor={colors.placeholder}
              multiline maxLength={500} accessibilityLabel="Opmerking" style={styles.note}
            />

            <View style={{ marginTop: 12 }}><ErrorText>{error}</ErrorText></View>
            <View style={{ gap: 10 }}>
              <Button title={busy === 'approve' ? 'Opslaan…' : editing ? 'Opslaan en goedkeuren' : 'Goedkeuren'} onPress={() => decide('approve')} loading={busy === 'approve'} disabled={!!busy} full />
              <Button title={editing ? 'Annuleren' : 'Tijd aanpassen'} variant="outline" onPress={() => setEditing((e) => !e)} disabled={!!busy} full />
              <Button title={busy === 'reject' ? 'Afwijzen…' : 'Afwijzen'} variant="danger" onPress={() => decide('reject')} loading={busy === 'reject'} disabled={!!busy} full />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 6, paddingBottom: 12 },
  tab: { paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.mintl },
  ok: { color: '#146B3A', fontSize: 14, marginBottom: 10 },
  req: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8,
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  cmp: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cmpBox: { flex: 1, borderRadius: 16, padding: 14 },
  msg: { backgroundColor: colors.bg, borderRadius: 16, padding: 14, marginBottom: 12, gap: 4 },
  log: { borderLeftWidth: 2, borderLeftColor: colors.line, marginLeft: 6, paddingLeft: 16 },
  logItem: { flexDirection: 'row', paddingVertical: 6 },
  dot: { position: 'absolute', left: -22, top: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.deep },
  edit: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, padding: 14, marginTop: 16 },
  note: {
    borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, padding: 12, minHeight: 70,
    fontSize: 15, color: colors.deep, fontFamily: fonts.body, textAlignVertical: 'top',
  },
});
