import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ClockCard } from '../../components/ClockCard';
import { Screen } from '../../components/Screen';
import { Avatar, Button, ErrorText, H1, H3, Muted, Panel, Pill, Txt } from '../../components/ui';
import { colors, pills } from '../../components/theme';
import type { DashboardData } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { formatLongDate, greeting } from '../../lib/format';

const alertStyle = {
  error: { icon: '!', ...pills.red },
  warning: { icon: '~', ...pills.yellow },
  info: { icon: '+', ...pills.mint },
} as const;

export default function Overzicht() {
  const { me } = useAuth();
  const { data, error, loading, refreshing, pullToRefresh, reload } = useApi<DashboardData>('/dashboard', 30_000);
  const now = new Date();

  return (
    <Screen refreshing={refreshing} onRefresh={pullToRefresh}>
      <Muted>{formatLongDate(now)}</Muted>
      <H1 style={{ marginBottom: 16 }}>{greeting(now)}, {me?.user.firstName}</H1>

      <View style={styles.actions}>
        <Button title="Exporteren" variant="outline" onPress={() => router.navigate('/uren')} style={{ flex: 1 }} />
        <Button title="+ Uitnodigen" variant="yellow" onPress={() => router.navigate('/team')} style={{ flex: 1 }} />
      </View>

      {me && !me.restaurant.location && (
        <Pressable onPress={() => router.push('/werkzone')} accessibilityRole="button" style={styles.banner}>
          <Txt weight="bold" style={{ color: colors.white, fontSize: 16 }}>Stel de werkzone van je restaurant in</Txt>
          <Txt style={{ color: colors.mint, fontSize: 14 }}>
            {me.user.role === 'owner' ? 'Zonder locatie op de kaart kan niemand inklokken. Tik om de pin te zetten.' : 'Zonder locatie kan niemand inklokken. Vraag de eigenaar dit te doen.'}
          </Txt>
        </Pressable>
      )}

      <ClockCard onChange={reload} />

      <ErrorText>{error}</ErrorText>
      {loading && !data && <Muted>Overzicht laden…</Muted>}

      {data && (
        <>
          <View style={styles.stats}>
            <Stat label="Nu in dienst" value={`${data.stats.onShift} van ${data.stats.activeMembers}`} yellow />
            <Stat label="Uren vandaag" value={data.stats.hoursToday} />
            <Stat label="Uren deze week" value={data.stats.hoursWeek} />
            <Stat label="Open correcties" value={String(data.stats.openCorrections)} />
          </View>

          <Panel style={styles.gap}>
            <View style={styles.panelHead}>
              <H3>Nu in dienst</H3>
              <Pill label="Live" />
            </View>
            {data.onShift.length === 0 && <Muted>Er is nu niemand ingeklokt.</Muted>}
            {data.onShift.map((r, i) => (
              <View key={r.id} style={[styles.shift, i > 0 && styles.divider]}>
                <Avatar initials={r.initials} />
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold">{r.name}</Txt>
                  <Muted style={{ fontSize: 13 }}>
                    {r.department ?? '—'} · <Txt style={{ color: colors.green }}>●</Txt> {r.clockedIn} · {r.distance}{' '}
                    <Txt style={{ color: colors.placeholder, fontSize: 13 }}>{r.accuracy}</Txt>
                  </Muted>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{r.duration}</Txt>
                  {r.check === 'ok' ? <Pill label="Oké" tone="green" /> : <Pill label="Zwakke GPS" tone="yellow" />}
                </View>
              </View>
            ))}
          </Panel>

          <Panel style={styles.gap}>
            <H3 style={{ marginBottom: 6 }}>Aandacht nodig</H3>
            {data.alerts.length === 0 && <Muted>Alles in orde.</Muted>}
            {data.alerts.map((a, i) => {
              const s = alertStyle[a.kind];
              const content = (
                <View style={[styles.alert, i > 0 && styles.divider]}>
                  <View style={[styles.alertIcon, { backgroundColor: s.bg }]}>
                    <Txt weight="extrabold" style={{ color: s.fg }}>{s.icon}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt weight="bold" style={a.to ? { textDecorationLine: 'underline' } : undefined}>{a.title}</Txt>
                    <Muted style={{ fontSize: 13 }}>{a.detail}</Muted>
                  </View>
                </View>
              );
              return a.to ? (
                <Pressable key={i} accessibilityRole="link" onPress={() => {
                  const id = a.to?.match(/id=(\d+)/)?.[1];
                  if (a.to?.startsWith('/correcties')) router.navigate({ pathname: '/correcties', params: id ? { id } : {} });
                  else router.navigate('/team');
                }}>
                  {content}
                </Pressable>
              ) : <View key={i}>{content}</View>;
            })}
          </Panel>

          <Panel>
            <H3 style={{ marginBottom: 6 }}>Uren deze week</H3>
            <View style={styles.bars} accessibilityRole="image"
              accessibilityLabel={`Gewerkte uren per dag: ${data.week.bars.map((b) => `${b.day} ${b.hours}`).join(', ')}`}>
              {data.week.bars.map((b, i) => (
                <View key={b.day} style={styles.barCol}>
                  <View style={[styles.bar, { height: `${b.pct}%` }, i === data.week.todayIndex && { backgroundColor: colors.deep }]} />
                </View>
              ))}
            </View>
            <View style={styles.barLabels}>
              {data.week.bars.map((b) => <Muted key={b.day} style={styles.barLabel}>{b.day}</Muted>)}
            </View>
          </Panel>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, yellow }: { label: string; value: string; yellow?: boolean }) {
  return (
    <View style={[styles.stat, yellow && { backgroundColor: colors.pin, borderColor: colors.pin }]}>
      <Txt weight="semibold" style={{ color: yellow ? colors.deep : colors.mute, fontSize: 14 }}>{label}</Txt>
      <Txt weight="display" style={styles.statValue}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  banner: { backgroundColor: colors.deep, borderRadius: 20, padding: 18, marginBottom: 16, gap: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  stat: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line,
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18,
  },
  statValue: { fontSize: 30, lineHeight: 36, marginTop: 2 },
  gap: { marginBottom: 16 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shift: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  alert: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  alertIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, marginTop: 10 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.mint, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabels: { flexDirection: 'row', gap: 10, marginTop: 6 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 13 },
});
