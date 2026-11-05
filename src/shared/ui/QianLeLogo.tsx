import React from 'react';
import Svg, {Path, Rect} from 'react-native-svg';

/** Shared geometry with the Android launcher mark. */
export default function QianLeLogo({size = 48}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Path
        d="M22 8H46Q54 8 54 16V48Q54 56 46 56H18Q10 56 10 48V20Z"
        fill="none"
        stroke="#459DEB"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <Rect x="20" y="24" width="6" height="7" rx="1" fill="#459DEB" />
      <Rect x="29" y="24" width="6" height="7" rx="1" fill="#459DEB" />
      <Rect x="38" y="24" width="6" height="7" rx="1" fill="#459DEB" />
      <Path d="M20 37H44M20 45H39" stroke="#459DEB" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}
