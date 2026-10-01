import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';

type Props = {
  children: ReactNode;
  /** Losse schermen (inloggen, registreren) hebben zelf de veilige marges nodig; tab-schermen niet. */
  standalone?: boolean;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, standalone, background = colors.bg, refreshing, onRefresh, contentStyle }: Props) {
  const scroll = (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.deep} /> : undefined}
    >
      {children}
    </ScrollView>
  );

  const body = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll}
    </KeyboardAvoidingView>
  );

  if (!standalone) return <>{body}</>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: background }}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
});
