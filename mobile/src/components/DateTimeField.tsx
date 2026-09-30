import { Platform, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Txt } from './ui';
import { colors, fonts, radius } from './theme';

type Mode = 'date' | 'time';

const pad = (n: number) => String(n).padStart(2, '0');

/** '2026-09-29' / '19:00' ↔ Date (telefoontijd). */
function toDate(mode: Mode, value: string): Date {
  const now = new Date();
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0);
  }
  if (mode === 'time' && /^\d{2}:\d{2}$/.test(value)) {
    const [h, min] = value.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
  }
  return now;
}

function fromDate(mode: Mode, d: Date): string {
  return mode === 'date'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function display(mode: Mode, value: string): string {
  if (!value) return mode === 'date' ? 'Kies een datum' : 'Kies een tijd';
  if (mode === 'time') return value;
  return toDate('date', value).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

type Props = {
  label: string;
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
  /** Datum niet na vandaag. */
  maxToday?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Datum- of tijdveld: compacte kiezer op iPhone, dialoog op Android, tekstveld in de browser. */
export function DateTimeField({ label, mode, value, onChange, maxToday, disabled, style }: Props) {
  const date = toDate(mode, value);
  const maximumDate = maxToday && mode === 'date' ? new Date() : undefined;

  let control;
  if (Platform.OS === 'ios') {
    control = (
      <DateTimePicker
        value={date} mode={mode} display="compact" locale="nl-NL" maximumDate={maximumDate} disabled={disabled}
        accentColor={colors.deep} accessibilityLabel={label}
        onValueChange={(_e, d) => onChange(fromDate(mode, d))}
      />
    );
  } else if (Platform.OS === 'android') {
    control = (
      <Pressable
        disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${display(mode, value)}`}
        style={styles.box}
        onPress={() => DateTimePickerAndroid.open({
          value: date, mode, is24Hour: true, maximumDate,
          onValueChange: (_e, d) => onChange(fromDate(mode, d)),
        })}
      >
        <Txt>{display(mode, value)}</Txt>
      </Pressable>
    );
  } else {
    control = (
      <TextInput
        value={value} onChangeText={onChange} editable={!disabled} accessibilityLabel={label}
        placeholder={mode === 'date' ? 'jjjj-mm-dd' : 'uu:mm'} placeholderTextColor={colors.placeholder}
        style={[styles.box, styles.input]}
      />
    );
  }

  return (
    <View style={[styles.field, style]}>
      <Txt weight="bold" style={styles.label}>{label}</Txt>
      <View style={{ alignItems: 'flex-start' }}>{control}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 14, marginBottom: 6 },
  box: {
    borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.md, backgroundColor: colors.white,
    paddingHorizontal: 14, minHeight: 48, justifyContent: 'center', alignSelf: 'stretch',
  },
  input: { fontSize: 16, color: colors.deep, fontFamily: fonts.body },
});
