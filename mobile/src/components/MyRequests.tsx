import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { H3, Muted, Panel, Pill, Txt } from './ui';
import { colors } from './theme';
import type { Correction } from '../lib/api';
import { useApi } from '../lib/useApi';

const status = {
  pending: { label: 'In behandeling', tone: 'yellow' },
  approved: { label: 'Goedgekeurd', tone: 'green' },
  rejected: { label: 'Afgewezen', tone: 'gray' },
} as const;

/** Eigen correctie-aanvragen van de medewerker, met de uitkomst. */
export function MyRequests() {
  const { data, reload } = useApi<{ items: Correction[] }>('/corrections/mine');
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const items = (data?.items ?? []).filter((c) => !c.automatic).slice(0, 5);
  if (!items.length) return null;

  return (
    <Panel style={{ marginBottom: 16 }}>
      <H3 style={{ marginBottom: 6 }}>Mijn aanvragen</H3>
      {items.map((c, i) => {
        const s = status[c.status];
        const target = c.status === 'approved' ? c.applied : c.requested;
        return (
          <View key={c.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14 }}>{c.typeLabel} · {c.dayShort}</Txt>
              <Muted style={{ fontSize: 13 }}>
                {target ? `${target.clockIn} – ${target.clockOut ?? '…'}` : '—'}
                {c.decision?.note ? ` · "${c.decision.note}"` : ''}
              </Muted>
            </View>
            <Pill label={s.label} tone={s.tone} />
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
});
