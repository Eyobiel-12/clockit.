import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Txt } from './ui';
import { colors, radius } from './theme';
import { ClockIcon, GridIcon, PencilIcon, SlidersIcon, TeamIcon } from './icons';
import { useAuth } from '../lib/auth';

const items: Record<string, { label: string; icon: (color: string) => ReactNode }> = {
  index: { label: 'Overzicht', icon: (c) => <GridIcon color={c} /> },
  team: { label: 'Team', icon: (c) => <TeamIcon color={c} /> },
  uren: { label: 'Uren', icon: (c) => <ClockIcon color={c} /> },
  correcties: { label: 'Correcties', icon: (c) => <PencilIcon color={c} /> },
  meer: { label: 'Meer', icon: (c) => <SlidersIcon color={c} /> },
};

/** De footer van de app: tabbalk in de stijl van de zijbalk op de website. */
export function Footer({ state, navigation, insets }: BottomTabBarProps) {
  const { me } = useAuth();
  const badges: Record<string, number> = {
    team: me?.restaurant.pendingCount ?? 0,
    correcties: me?.restaurant.openCorrections ?? 0,
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const item = items[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const color = focused ? colors.deep : colors.sideText;
        const badge = badges[route.name];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${item.label}, ${badge} open` : item.label}
            style={styles.item}
          >
            <View style={[styles.inner, focused && styles.innerOn]}>
              <View>
                {item.icon(color)}
                {badge > 0 && (
                  <View style={[styles.badge, focused && { backgroundColor: colors.deep }]}>
                    <Txt weight="bold" style={styles.badgeText}>{badge}</Txt>
                  </View>
                )}
              </View>
              <Txt weight="semibold" numberOfLines={1} style={[styles.label, { color }]}>{item.label}</Txt>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.deep, paddingTop: 8, paddingHorizontal: 6,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  item: { flex: 1, alignItems: 'center' },
  inner: { alignItems: 'center', gap: 3, paddingVertical: 7, paddingHorizontal: 4, borderRadius: radius.md, minWidth: 64, minHeight: 52 },
  innerOn: { backgroundColor: colors.pin },
  label: { fontSize: 11.5, lineHeight: 14 },
  badge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: colors.white, fontSize: 11, lineHeight: 13 },
});
