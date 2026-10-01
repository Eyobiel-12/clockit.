import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Field, Muted, Txt } from './ui';
import { colors, radius } from './theme';
import { api, type Place } from '../lib/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPick: (place: Place) => void;
  editable?: boolean;
  label?: string;
  placeholder?: string;
  help?: string;
};

/** Adresveld met suggesties uit OpenStreetMap (via de API). Kiezen zet de pin op de kaart. */
export function AddressSearch({
  value, onChange, onPick, editable = true, label = 'Adres',
  placeholder = 'Straat en huisnummer, plaats', help = 'Sleep de pin op de kaart naar je ingang als hij niet goed staat.',
}: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || value.trim().length < 3) {
      setResults([]);
      setMessage('');
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await api<{ results: Place[] }>(`/restaurant/geocode?q=${encodeURIComponent(value)}`);
        setResults(results);
        setMessage(results.length ? '' : 'Geen adres gevonden. Tik op de kaart om de pin te zetten.');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Zoeken mislukt');
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value]);

  function pick(p: Place) {
    typed.current = false;
    setResults([]);
    setMessage('');
    onChange(p.label);
    onPick(p);
  }

  return (
    <View>
      <Field
        label={label} value={value} editable={editable} placeholder={placeholder}
        onChangeText={(v) => { typed.current = true; onChange(v); }}
        autoCorrect={false} textContentType="fullStreetAddress" returnKeyType="search"
        help={results.length ? undefined : help}
        style={{ marginBottom: results.length || message || searching ? 6 : 16 }}
      />
      {searching && <ActivityIndicator color={colors.deep} style={{ alignSelf: 'flex-start', marginBottom: 10 }} />}
      {results.length > 0 && (
        <View style={styles.list} accessibilityRole="list" accessibilityLabel="Gevonden adressen">
          {results.map((p, i) => (
            <Pressable
              key={`${p.lat},${p.lng}`} onPress={() => pick(p)} accessibilityRole="button"
              style={({ pressed }) => [styles.item, i > 0 && styles.divider, pressed && { backgroundColor: colors.mintl }]}
            >
              <Txt style={{ fontSize: 15 }}>{p.label}</Txt>
            </Pressable>
          ))}
        </View>
      )}
      {message ? <Muted style={{ fontSize: 13, marginBottom: 14 }} accessibilityLiveRegion="polite">{message}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, marginBottom: 16, overflow: 'hidden' },
  item: { paddingHorizontal: 14, minHeight: 48, justifyContent: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
});
