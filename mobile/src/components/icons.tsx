import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ReactNode } from 'react';

type IconProps = { size?: number; color?: string };

function Icon({ size = 22, color = '#fff', children }: IconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

// Dezelfde iconen als de zijbalk op de website.
export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const TeamIcon = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="9" cy="8" r="3.5" />
    <Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <Path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <Path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3 2" />
  </Icon>
);

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 20h4L19 9l-4-4L4 16z" />
    <Path d="M13.5 6.5l4 4" />
  </Icon>
);

export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
    <Circle cx="16" cy="6" r="2" />
    <Circle cx="10" cy="12" r="2" />
    <Circle cx="18" cy="18" r="2" />
  </Icon>
);

export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="M16 17l5-5-5-5" />
    <Path d="M21 12H9" />
  </Icon>
);

export const DotsIcon = ({ size = 20, color = '#4F6F74' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Circle cx="5" cy="12" r="2" />
    <Circle cx="12" cy="12" r="2" />
    <Circle cx="19" cy="12" r="2" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="11" cy="11" r="7" />
    <Path d="M20 20l-3.5-3.5" />
  </Icon>
);
