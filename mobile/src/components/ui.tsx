import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, fonts, pills, radius } from './theme';

// ---- Tekst ----

type Weight = 'body' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'display';

export function Txt({ weight = 'body', style, ...props }: TextProps & { weight?: Weight }) {
  return <Text {...props} style={[styles.text, { fontFamily: fonts[weight] }, style]} />;
}

export function H1({ style, ...props }: TextProps) {
  return <Txt weight="display" accessibilityRole="header" {...props} style={[styles.h1, style]} />;
}

export function H3({ style, ...props }: TextProps) {
  return <Txt weight="display" accessibilityRole="header" {...props} style={[styles.h3, style]} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Txt {...props} style={[{ color: colors.mute }, style]} />;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Txt weight="semibold" accessibilityRole="alert" style={styles.error}>{children}</Txt>;
}

// ---- Logo (gele pin + naam) ----

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.logo} accessibilityLabel="Klokit">
      <View style={[styles.pin, { borderColor: light ? colors.white : colors.deep }]} />
      <Txt weight="display" style={[styles.logoText, { color: light ? colors.white : colors.deep }]}>Klokit</Txt>
    </View>
  );
}

// ---- Knoppen ----

type ButtonVariant = 'dark' | 'yellow' | 'outline' | 'danger';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; pressed: string; border?: string }> = {
  dark: { bg: colors.deep, fg: colors.white, pressed: colors.deepHover },
  yellow: { bg: colors.pin, fg: colors.deep, pressed: '#f5b92a' },
  outline: { bg: colors.white, fg: colors.deep, pressed: colors.mintl, border: colors.deep },
  danger: { bg: colors.white, fg: '#B03030', pressed: '#FDF1F1', border: '#F0C4C4' },
};

export function Button({ title, variant = 'dark', loading, full, disabled, style, ...props }: ButtonProps) {
  const c = buttonColors[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      {...props}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.pressed : c.bg },
        c.border && { borderWidth: 1.5, borderColor: c.border },
        full && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={c.fg} /> : <Txt weight="bold" style={{ color: c.fg, fontSize: 15 }}>{title}</Txt>}
    </Pressable>
  );
}

// ---- Kaarten en labels ----

export function Panel({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <View style={[styles.panel, dark && styles.panelDark, style]}>{children}</View>;
}

export function Pill({ label, tone = 'mint' }: { label: string; tone?: keyof typeof pills }) {
  const p = pills[tone];
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]}>
      <Txt weight="bold" style={{ color: p.fg, fontSize: 12.5 }}>{label}</Txt>
    </View>
  );
}

export function Avatar({ initials, yellow }: { initials: string; yellow?: boolean }) {
  return (
    <View style={[styles.avatar, yellow && { backgroundColor: colors.pin }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Txt weight="extrabold" style={{ color: colors.deep, fontSize: 14 }}>{initials}</Txt>
    </View>
  );
}

// ---- Invoervelden ----

type FieldProps = TextInputProps & { label: string; help?: string; inputStyle?: StyleProp<TextStyle> };

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, help, inputStyle, style, ...props }, ref) {
  return (
    <View style={[styles.field, style as StyleProp<ViewStyle>]}>
      <Txt weight="bold" style={styles.label} nativeID={`${label}-label`}>{label}</Txt>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        {...props}
        style={[styles.input, inputStyle]}
      />
      {help ? <Txt style={styles.help}>{help}</Txt> : null}
    </View>
  );
});

export const styles = StyleSheet.create({
  text: { color: colors.deep, fontSize: 15, lineHeight: 22 },
  h1: { fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  h3: { fontSize: 19, lineHeight: 24 },
  error: { color: '#9E2B2B', fontSize: 14, marginBottom: 14 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: {
    width: 22, height: 22, backgroundColor: colors.pin, borderWidth: 3,
    borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomRightRadius: 11, borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
  },
  logoText: { fontSize: 22, lineHeight: 26 },
  button: {
    minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  panel: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, borderWidth: 1, borderColor: colors.line },
  panelDark: { backgroundColor: colors.deep, borderColor: colors.deep },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: colors.deep, fontFamily: fonts.body,
  },
  help: { fontSize: 13, color: colors.mute, marginTop: 5 },
});
