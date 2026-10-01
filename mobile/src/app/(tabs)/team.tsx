import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { Avatar, ErrorText, H1, H3, Muted, Panel, Pill, Txt } from '../../components/ui';
import { DotsIcon, SearchIcon } from '../../components/icons';
import { QrCode } from '../../components/QrCode';
import { colors, fonts, radius } from '../../components/theme';
import { api, API_URL, roleLabel, type TeamData, type TeamMember } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';

type Action = { label: string; danger?: boolean; run: () => void };

const statusPill = {
  on: <Pill label="In dienst" tone="green" />,
  off: <Pill label="Niet in dienst" tone="gray" />,
  pending: <Pill label="Wacht op bevestiging" tone="yellow" />,
};

/** Bevestigen via een systeemvenster; in de browser via window.confirm. */
function confirm(title: string, message: string, label: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuleren', style: 'cancel', onPress: () => resolve(false) },
      { text: label, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Deel-link: de registratiepagina van de website (poort 8090 in Docker) met de code erin. */
function inviteUrl(code: string) {
  const webBase = process.env.EXPO_PUBLIC_WEB_URL || API_URL.replace(/:4000\/api$/, ':8090');
  return `${webBase}/registreren?code=${code}`;
}

export default function Team() {
  const { me, refresh } = useAuth();
  const { data, error, loading, reload, setData, refreshing, pullToRefresh } = useApi<TeamData>('/team');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [menuFor, setMenuFor] = useState<TeamMember | null>(null);

  const isOwner = me?.user.role === 'owner';

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.members.filter((m) =>
      (!dept || m.department === dept) &&
      (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)));
  }, [data, query, dept]);

  async function act(fn: () => Promise<unknown>) {
    setActionError('');
    try {
      await fn();
      await Promise.all([reload(), refresh()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Actie mislukt');
    }
  }

  function actionsFor(m: TeamMember): Action[] {
    if (m.role === 'owner' || m.id === me?.user.id) return [];
    if (m.status === 'pending') {
      return [
        { label: 'Aanmelding bevestigen', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { status: 'active' } })) },
        {
          label: 'Aanmelding weigeren', danger: true,
          run: () => act(async () => {
            if (await confirm('Aanmelding weigeren', `Aanmelding van ${m.name} weigeren?`, 'Weigeren')) {
              await api(`/team/${m.id}`, { method: 'DELETE' });
            }
          }),
        },
      ];
    }
    if (!isOwner) return [];
    return [
      m.role === 'manager'
        ? { label: 'Maak medewerker', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { role: 'employee' } })) }
        : { label: 'Maak manager', run: () => act(() => api(`/team/${m.id}`, { method: 'PATCH', body: { role: 'manager' } })) },
      {
        label: 'Verwijderen uit team', danger: true,
        run: () => act(async () => {
          if (await confirm('Verwijderen', `${m.name} verwijderen uit het team? Diens uren worden ook verwijderd.`, 'Verwijderen')) {
            await api(`/team/${m.id}`, { method: 'DELETE' });
          }
        }),
      },
    ];
  }

  async function newCode() {
    await act(async () => {
      const invite = await api<TeamData['invite']>('/team/invite-code', { method: 'POST' });
      setData((d) => (d ? { ...d, invite } : d));
    });
  }

  const pending = data?.members.filter((m) => m.status === 'pending').length ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={pullToRefresh}>
      <H1>Team</H1>
      {data && (
        <Muted style={{ marginBottom: 14 }}>
          {data.members.length} medewerkers
          {pending > 0 && ` · ${pending} ${pending === 1 ? 'wacht' : 'wachten'} op bevestiging`}
        </Muted>
      )}

      <View style={styles.search}>
        <SearchIcon size={18} color={colors.mute} />
        <TextInput
          value={query} onChangeText={setQuery} placeholder="Zoek op naam" placeholderTextColor={colors.placeholder}
          accessibilityLabel="Zoek op naam" style={styles.searchInput} autoCorrect={false} clearButtonMode="while-editing"
        />
      </View>

      <ErrorText>{error || actionError}</ErrorText>
      {loading && !data && <Muted>Team laden…</Muted>}

      {data && (
        <>
          <Panel style={styles.gap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}
              accessibilityRole="tablist" accessibilityLabel="Afdeling">
              {[null, ...data.departments].map((d) => (
                <Pressable
                  key={d ?? 'all'} onPress={() => setDept(d)}
                  accessibilityRole="tab" accessibilityState={{ selected: dept === d }}
                  style={[styles.tab, dept === d && styles.tabOn]}
                >
                  <Txt weight="bold" style={{ fontSize: 14, color: dept === d ? colors.deep : colors.mute }}>{d ?? 'Iedereen'}</Txt>
                </Pressable>
              ))}
            </ScrollView>

            {visible.map((m, i) => {
              const actions = actionsFor(m);
              return (
                <View key={m.id} style={[styles.member, i > 0 && styles.divider]}>
                  <Avatar initials={m.initials} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt weight="semibold" numberOfLines={1}>{m.name}</Txt>
                    <Muted numberOfLines={1} style={{ fontSize: 13 }}>{m.email}</Muted>
                    <Muted style={{ fontSize: 13 }}>{m.department ?? '—'} · {roleLabel[m.role]} · {m.weekHours} deze week</Muted>
                    <View style={{ marginTop: 4 }}>{statusPill[m.status]}</View>
                  </View>
                  {actions.length > 0 && (
                    <Pressable
                      onPress={() => setMenuFor(m)} accessibilityRole="button" accessibilityLabel={`Opties voor ${m.name}`}
                      style={({ pressed }) => [styles.more, pressed && { backgroundColor: colors.mintl }]}
                    >
                      <DotsIcon />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {visible.length === 0 && <Muted style={{ paddingVertical: 12 }}>Niemand gevonden.</Muted>}
          </Panel>

          <InvitePanel invite={data.invite} onNewCode={newCode} />

          <Panel>
            <H3 style={{ marginBottom: 8 }}>Rollen</H3>
            <Muted style={{ fontSize: 14 }}><Txt weight="bold" style={{ fontSize: 14 }}>Manager</Txt> keurt correcties goed en ziet wie er in dienst is.</Muted>
            <Muted style={{ fontSize: 14, marginTop: 10 }}><Txt weight="bold" style={{ fontSize: 14 }}>Medewerker</Txt> klokt in en uit en ziet alleen de eigen uren.</Muted>
          </Panel>
        </>
      )}

      <ActionSheet member={menuFor} actions={menuFor ? actionsFor(menuFor) : []} onClose={() => setMenuFor(null)} />
    </Screen>
  );
}

function InvitePanel({ invite, onNewCode }: { invite: TeamData['invite']; onNewCode: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(invite.code);
  const expires = new Date(invite.expiresAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });

  async function copy() {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await Share.share({ message: `Doe mee met ons team op Klokit. Je code is ${invite.code}: ${url}` });
    } catch {
      // Delen geannuleerd of niet beschikbaar.
    }
  }

  return (
    <Panel dark style={styles.gap}>
      <H3 style={{ color: colors.white, marginBottom: 6 }}>Nodig je team uit</H3>
      <Txt style={styles.invText}>Deel deze code. Nieuwe medewerkers voeren hem in bij het aanmelden en komen direct in je team.</Txt>

      <View style={styles.digits} accessible accessibilityLabel={`Uitnodigingscode ${invite.code.split('').join(' ')}`}>
        {invite.code.split('').map((d, i) => (
          <View key={i} style={styles.digit}><Txt weight="display" style={styles.digitText}>{d}</Txt></View>
        ))}
      </View>

      <Txt style={styles.invText}>
        Geldig tot {expires} ·{' '}
        <Txt weight="bold" style={{ color: colors.white, fontSize: 14, textDecorationLine: 'underline' }} onPress={onNewCode} accessibilityRole="button">
          Nieuwe code maken
        </Txt>
      </Txt>

      <View style={styles.link}>
        <Txt numberOfLines={1} style={{ color: colors.white, fontSize: 13, flex: 1 }}>{url.replace(/^https?:\/\//, '')}</Txt>
        <Pressable onPress={copy} style={styles.copy} accessibilityRole="button">
          <Txt weight="bold" style={{ fontSize: 14 }}>{copied ? 'Gekopieerd' : 'Kopiëren'}</Txt>
        </Pressable>
      </View>

      <View style={styles.qrRow}>
        <View style={styles.qr}><QrCode value={url} size={100} /></View>
        <Pressable onPress={share} style={styles.share} accessibilityRole="button">
          <Txt weight="bold" style={{ color: colors.deep }}>Delen…</Txt>
        </Pressable>
      </View>
    </Panel>
  );
}

function ActionSheet({ member, actions, onClose }: { member: TeamMember | null; actions: Action[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!member} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Sluiten" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {member && <Txt weight="display" style={{ fontSize: 18, marginBottom: 8 }}>{member.name}</Txt>}
        {actions.map((a) => (
          <Pressable
            key={a.label} accessibilityRole="button"
            onPress={() => { onClose(); a.run(); }}
            style={({ pressed }) => [styles.sheetItem, pressed && { backgroundColor: a.danger ? '#FDF1F1' : colors.mintl }]}
          >
            <Txt weight="semibold" style={{ color: a.danger ? '#9E2B2B' : colors.deep, fontSize: 16 }}>{a.label}</Txt>
          </Pressable>
        ))}
        <Pressable onPress={onClose} accessibilityRole="button" style={[styles.sheetItem, { alignItems: 'center', marginTop: 4 }]}>
          <Txt weight="bold" style={{ color: colors.mute, fontSize: 16 }}>Annuleren</Txt>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gap: { marginBottom: 16 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: 12, marginBottom: 14,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 16, color: colors.deep, fontFamily: fonts.body },
  tabs: { gap: 6, paddingBottom: 8 },
  tab: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.mintl },
  member: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  more: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  invText: { color: colors.stepText, fontSize: 14 },
  digits: { flexDirection: 'row', gap: 6, marginVertical: 14 },
  digit: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, alignItems: 'center', paddingVertical: 6 },
  digitText: { fontSize: 30, lineHeight: 38 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, paddingVertical: 6, paddingLeft: 12, paddingRight: 6,
  },
  copy: { backgroundColor: colors.pin, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qr: { backgroundColor: colors.white, borderRadius: radius.md, padding: 10 },
  share: { backgroundColor: colors.pin, borderRadius: radius.pill, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,59,67,0.35)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetItem: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md },
});
