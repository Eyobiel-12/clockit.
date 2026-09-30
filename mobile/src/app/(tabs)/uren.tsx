import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { Avatar, Button, ErrorText, H1, H3, Muted, Panel, Pill, Txt } from '../../components/ui';
import { colors, pills, radius } from '../../components/theme';
import type { Period, ShiftDetail, TimesheetData } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Dag' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Maand' },
];

function statusOf(s: ShiftDetail): { label: string; tone: keyof typeof pills } {
  if (s.correctionId) return { label: 'Correctie open', tone: 'red' };
  if (s.open) return { label: 'Loopt nog', tone: 'yellow' };
  if (s.manual) return { label: 'Handmatig', tone: 'mint' };
  if (s.corrected) return { label: 'Gecorrigeerd', tone: 'mint' };
  if (s.autoClosed) return { label: 'Automatisch gestopt', tone: 'gray' };
  return { label: 'Oké', tone: 'green' };
}

/** Urenoverzicht (Timesheet.dc.html) voor de telefoon: per medewerker een kaart met de dagen. */
export default function Uren() {
  const [period, setPeriod] = useState<Period>('week');
  const [date, setDate] = useState('');
  const { data, error, loading, refreshing, pullToRefresh } = useApi<TimesheetData>(
    `/timesheet?period=${period}${date ? `&date=${date}` : ''}`, 60_000,
  );
  const [sheet, setSheet] = useState<{ title: string; shifts: ShiftDetail[] } | null>(null);

  const dayShifts = data?.period === 'day' ? data.rows.flatMap((r) => r.shifts) : [];

  return (
    <Screen refreshing={refreshing} onRefresh={pullToRefresh}>
      <H1>Urenoverzicht</H1>
      <Muted style={{ marginBottom: 14 }}>Alle tijden zijn servertijd</Muted>

      <View style={styles.seg} accessibilityRole="tablist" accessibilityLabel="Periode">
        {PERIODS.map((p) => (
          <Pressable
            key={p.key} onPress={() => { setPeriod(p.key); setDate(''); }}
            accessibilityRole="tab" accessibilityState={{ selected: period === p.key }}
            style={[styles.segBtn, period === p.key && styles.segOn]}
          >
            <Txt weight="bold" style={{ fontSize: 14, color: period === p.key ? colors.white : colors.mute }}>{p.label}</Txt>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => data && setDate(data.range.prev)} accessibilityRole="button" accessibilityLabel="Vorige periode" style={styles.navBtn}>
          <Txt weight="bold" style={{ fontSize: 20 }}>‹</Txt>
        </Pressable>
        <Txt weight="bold" style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">{data?.range.label ?? '…'}</Txt>
        <Pressable onPress={() => data && setDate(data.range.next)} accessibilityRole="button" accessibilityLabel="Volgende periode" style={styles.navBtn}>
          <Txt weight="bold" style={{ fontSize: 20 }}>›</Txt>
        </Pressable>
      </View>
      {data && !data.range.isCurrent && (
        <Button title="Naar vandaag" variant="outline" onPress={() => setDate('')} style={{ alignSelf: 'center', marginBottom: 12, minHeight: 40 }} />
      )}

      <ErrorText>{error}</ErrorText>
      {loading && !data && <Muted>Uren laden…</Muted>}

      {data && (
        <>
          <View style={styles.total}>
            <Txt weight="semibold" style={{ color: colors.deep }}>Totaal team</Txt>
            <Txt weight="display" style={{ fontSize: 30, lineHeight: 36 }}>{data.totals.total}</Txt>
          </View>

          {data.period !== 'day' && data.rows.map((r) => (
            <Panel key={r.userId} style={styles.gap}>
              <View style={styles.rowHead}>
                <Avatar initials={r.initials} />
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{r.name}</Txt>
                  <Muted style={{ fontSize: 13 }}>{r.department ?? '—'}</Muted>
                </View>
                <Txt weight="display" style={{ fontSize: 20 }}>{r.total}</Txt>
              </View>
              <View style={styles.cells}>
                {r.cells.map((c, i) => {
                  const col = data.columns[i];
                  const has = !!c.text;
                  return (
                    <Pressable
                      key={col.key} disabled={!has}
                      onPress={() => setSheet({ title: `${r.name} · ${c.shifts[0]?.day ?? col.label}`, shifts: c.shifts })}
                      accessibilityRole="button"
                      accessibilityLabel={`${col.label}: ${c.text ?? 'niet gewerkt'}${c.open ? ', loopt nog' : ''}${c.correction ? ', correctie open' : ''}`}
                      style={[styles.cell, c.open && styles.cellOpen, c.correction && styles.cellBad, col.today && styles.cellToday]}
                    >
                      <Txt style={[styles.cellLabel, col.today && { color: colors.deep, fontFamily: 'Figtree_800ExtraBold' }]}>{col.label}</Txt>
                      <Txt weight={has ? 'bold' : 'body'} style={[styles.cellValue, !has && { color: '#9aa9a6' }, c.correction && { color: '#9E2B2B' }]}>
                        {c.text ?? '—'}{c.correction ? '*' : ''}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Panel>
          ))}

          {data.period === 'day' && (
            <Panel style={styles.gap}>
              {dayShifts.length === 0 && <Muted>Op deze dag is niet gewerkt.</Muted>}
              {dayShifts.map((s, i) => {
                const st = statusOf(s);
                return (
                  <Pressable key={s.id} onPress={() => setSheet({ title: `${s.name} · ${s.day}`, shifts: [s] })}
                    accessibilityRole="button" style={[styles.dayRow, i > 0 && styles.divider]}>
                    <Avatar initials={s.initials} />
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold">{s.name}</Txt>
                      <Muted style={{ fontSize: 13 }}>{s.clockIn} – {s.open ? 'nu' : s.clockOut}{s.distance ? ` · ${s.distance}` : ''}</Muted>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Txt weight="bold">{s.duration}</Txt>
                      <Pill label={st.label} tone={st.tone} />
                    </View>
                  </Pressable>
                );
              })}
            </Panel>
          )}

          <View style={styles.legend}>
            <Muted style={{ fontSize: 12 }}><Txt weight="bold" style={{ fontSize: 12, color: '#7A5800' }}>Geel</Txt> = loopt nog</Muted>
            <Muted style={{ fontSize: 12 }}><Txt weight="bold" style={{ fontSize: 12, color: '#9E2B2B' }}>* Rood</Txt> = correctie open</Muted>
          </View>

          <Panel style={styles.gap}>
            <H3 style={{ marginBottom: 6 }}>Top {period === 'day' ? 'vandaag' : period === 'week' ? 'deze week' : 'deze maand'}</H3>
            {data.top.length === 0 && <Muted>Nog geen uren.</Muted>}
            {data.top.map((t, i) => (
              <View key={t.userId} style={[styles.ent, i > 0 && styles.divider]}>
                <Txt style={{ fontSize: 14 }}>{t.name}</Txt><Txt weight="bold">{t.total}</Txt>
              </View>
            ))}
          </Panel>

          <Panel>
            <H3 style={{ marginBottom: 6 }}>Gemarkeerde punches</H3>
            {data.flagged.length === 0 && (
              <Muted style={{ fontSize: 14 }}>{data.weakGpsM === null ? 'Zwakke GPS markeren staat uit.' : 'Geen punches met zwakke of nep-GPS.'}</Muted>
            )}
            {data.flagged.map((f, i) => (
              <View key={f.shiftId} style={[styles.ent, i > 0 && styles.divider]}>
                <Txt style={{ fontSize: 14 }}>{f.label}</Txt>
                <Pill label={f.badge} tone={f.tone === 'red' ? 'red' : 'yellow'} />
              </View>
            ))}
          </Panel>
        </>
      )}

      <ShiftSheet sheet={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function ShiftSheet({ sheet, onClose }: { sheet: { title: string; shifts: ShiftDetail[] } | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Sluiten" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {sheet && (
          <ScrollView>
            <H3 style={{ marginBottom: 8 }}>{sheet.title}</H3>
            {sheet.shifts.map((s, i) => {
              const st = statusOf(s);
              return (
                <View key={s.id} style={i > 0 ? { marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: colors.line } : undefined}>
                  <Ent label="Ingeklokt" value={`${s.clockIn}${s.distance ? ` · ${s.distance}` : ''}`} />
                  <Ent label="Uitgeklokt" value={s.open ? 'Nog in dienst' : s.autoClosed ? 'Niet gedaan' : s.clockOut ?? '—'} bad={s.autoClosed} />
                  {s.autoClosed && <Ent label="Automatisch gestopt" value={s.clockOut ?? '00:00'} />}
                  <Ent label="Duur" value={s.duration} />
                  {s.accuracy && <Ent label="GPS" value={`${s.accuracy}${s.mocked ? ' · nep-GPS' : s.weak ? ' · zwak' : ''}`} />}
                  <View style={styles.ent}><Txt style={{ fontSize: 14 }}>Status</Txt><Pill label={st.label} tone={st.tone} /></View>
                  {s.correctionId && (
                    <Button title="Correctie bekijken" variant="outline" style={{ marginTop: 8 }}
                      onPress={() => { onClose(); router.navigate({ pathname: '/correcties', params: { id: String(s.correctionId) } }); }} />
                  )}
                </View>
              );
            })}
            <Button title="Sluiten" variant="outline" onPress={onClose} style={{ marginTop: 16 }} full />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Ent({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <View style={styles.ent}>
      <Txt style={{ fontSize: 14 }}>{label}</Txt>
      <Txt weight="bold" style={bad ? { color: '#9E2B2B' } : undefined}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginBottom: 14 },
  seg: { flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, padding: 4, marginBottom: 12 },
  segBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segOn: { backgroundColor: colors.deep },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  navBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  total: { backgroundColor: colors.mintl, borderRadius: 20, padding: 16, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: {
    flexGrow: 1, flexBasis: '12%', minWidth: 40, minHeight: 52, borderRadius: 10, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 2,
  },
  cellOpen: { backgroundColor: '#FFF1C6' },
  cellBad: { backgroundColor: '#FBE3E3' },
  cellToday: { borderWidth: 1.5, borderColor: colors.deep },
  cellLabel: { fontSize: 11, lineHeight: 14, color: colors.mute },
  cellValue: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 14 },
  ent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,59,67,0.35)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
});
