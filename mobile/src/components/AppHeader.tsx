import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Avatar, Logo, Txt } from './ui';
import { colors } from './theme';
import { useAuth } from '../lib/auth';

/** Bovenbalk van de ingelogde schermen: logo, restaurant en de ingelogde gebruiker. */
export function AppHeader({ onAvatarPress = () => router.navigate('/meer') }: { onAvatarPress?: () => void }) {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  if (!me) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Logo light />
      <View style={styles.right}>
        <View style={styles.rest}>
          <Txt weight="bold" numberOfLines={1} style={styles.restName}>{me.restaurant.name}</Txt>
          <Txt numberOfLines={1} style={styles.restMeta}>
            Straal {me.restaurant.radius} m · {me.restaurant.memberCount} medewerkers
          </Txt>
        </View>
        <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel="Profiel en instellingen" hitSlop={6}>
          <Avatar initials={me.user.initials} yellow />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.deep, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  rest: { alignItems: 'flex-end', flexShrink: 1 },
  restName: { color: colors.white, fontSize: 14, lineHeight: 18 },
  restMeta: { color: colors.mint, fontSize: 12, lineHeight: 16 },
});
