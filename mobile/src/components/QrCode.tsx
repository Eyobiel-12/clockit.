import { useMemo } from 'react';
import QRCode from 'qrcode';
import Svg, { Path } from 'react-native-svg';

/** Echte QR-code, getekend met react-native-svg (werkt in Expo Go zonder extra native modules). */
export function QrCode({ value, size = 120, color = '#0E3B43' }: { value: string; size?: number; color?: string }) {
  const { path, count } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="QR-code met de uitnodigingslink">
      <Path d={path} fill={color} />
    </Svg>
  );
}
