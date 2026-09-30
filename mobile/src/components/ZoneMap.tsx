import { Linking, StyleSheet, View } from 'react-native';
import { Muted, Txt } from './ui';
import { colors } from './theme';
import type { ZoneMapProps } from './ZoneMap.types';

/**
 * Browserversie van de app (expo start --web): react-native-maps werkt alleen op iOS/Android.
 * Op de telefoon wordt ZoneMap.native.tsx gebruikt. Voor de kaart in de browser: de website › Instellingen.
 */
export function ZoneMap({ location, radius, height = 300 }: ZoneMapProps) {
  return (
    <View style={[styles.box, { height }]}>
      <Txt weight="bold">Kaart alleen in de app op je telefoon</Txt>
      {location ? (
        <>
          <Muted style={{ fontSize: 14, textAlign: 'center' }}>
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)} · straal {radius} m
          </Muted>
          <Txt
            weight="bold" accessibilityRole="link" style={{ textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=18/${location.lat}/${location.lng}`)}
          >
            Open in kaart
          </Txt>
        </>
      ) : (
        <Muted style={{ fontSize: 14, textAlign: 'center' }}>Zoek je adres of gebruik je locatie om de pin te zetten.</Muted>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16, backgroundColor: colors.mintl, alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 16, borderWidth: 1, borderColor: colors.line,
  },
});
