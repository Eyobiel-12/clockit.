import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { colors } from './theme';
import type { ZoneMapProps } from './ZoneMap.types';

/** Midden van Nederland, als er nog geen locatie is. */
const FALLBACK = { lat: 52.15, lng: 5.3 };

/** Kaartuitsnede waarin de hele cirkel (plus wat marge) past. */
export function regionFor(lat: number, lng: number, radius: number): Region {
  const latitudeDelta = (radius * 2 * 1.8) / 111_320;
  return { latitude: lat, longitude: lng, latitudeDelta, longitudeDelta: latitudeDelta / Math.cos((lat * Math.PI) / 180) };
}

/** De gele pin uit het design. */
function Pin() {
  return (
    <Svg width={40} height={52} viewBox="-44 -118 88 122">
      <Path d="M0 0 C-26 -36 -40 -52 -40 -74 A40 40 0 1 1 40 -74 C40 -52 26 -36 0 0Z" fill={colors.pin} stroke={colors.deep} strokeWidth={6} />
      <SvgCircle cy={-74} r={14} fill={colors.deep} />
    </Svg>
  );
}

/** Kaart met pin en werkzone-cirkel. Met `onMove` kun je de pin slepen of op de kaart tikken. */
export function ZoneMap({ location, radius, onMove, height = 300, interactive = true }: ZoneMapProps) {
  const ref = useRef<MapView>(null);
  const center = location ?? FALLBACK;
  const key = location ? `${location.lat.toFixed(6)},${location.lng.toFixed(6)}` : 'none';
  const dragging = useRef(false);

  // Naar de nieuwe locatie of straal bewegen (adres gekozen, mijn locatie, schuifregelaar).
  useEffect(() => {
    if (!location || dragging.current) return;
    ref.current?.animateToRegion(regionFor(location.lat, location.lng, radius), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, radius]);

  return (
    <View style={[styles.wrap, { height }]} pointerEvents={interactive ? 'auto' : 'none'}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={location ? regionFor(center.lat, center.lng, radius) : { latitude: center.lat, longitude: center.lng, latitudeDelta: 3, longitudeDelta: 3 }}
        onPress={onMove ? (e) => onMove({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }) : undefined}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={interactive}
        showsPointsOfInterests={false}
        accessibilityLabel={location ? `Kaart van de werkzone, straal ${radius} meter` : 'Kaart, nog geen locatie ingesteld'}
      >
        {location && (
          <>
            <Circle
              center={{ latitude: location.lat, longitude: location.lng }}
              radius={radius}
              strokeColor={colors.deep}
              strokeWidth={3}
              lineDashPattern={[10, 8]}
              fillColor="rgba(255,200,69,0.22)"
            />
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lng }}
              anchor={{ x: 0.5, y: 1 }}
              draggable={!!onMove}
              onDragStart={() => { dragging.current = true; }}
              onDragEnd={(e) => {
                onMove?.({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
                setTimeout(() => { dragging.current = false; }, 400);
              }}
            >
              <Pin />
            </Marker>
          </>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.mintl },
});
