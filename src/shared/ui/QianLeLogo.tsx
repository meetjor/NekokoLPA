import React from 'react';
import Svg, {Defs, LinearGradient, Stop, Rect, Path, Circle, Ellipse} from 'react-native-svg';

/** QianLesim's orbiting eSIM mark, redrawn as a resolution-independent vector. */
export default function QianLeLogo({size = 48}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#385DB9" />
          <Stop offset="0.52" stopColor="#14265B" />
          <Stop offset="1" stopColor="#392267" />
        </LinearGradient>
        <LinearGradient id="orbit" x1="0" y1="0.7" x2="1" y2="0.1">
          <Stop offset="0" stopColor="#42E2FF" />
          <Stop offset="0.56" stopColor="#559CFF" />
          <Stop offset="1" stopColor="#DA72FF" />
        </LinearGradient>
      </Defs>
      <Rect x="1" y="1" width="98" height="98" rx="23" fill="url(#tile)" stroke="#778EFC" strokeWidth="1.5" />
      <Path d="M36 22 L66 22 L75 33 L75 77 Q75 82 70 82 L36 82 Q31 82 31 77 L31 30 Q31 22 36 22" fill="#F2F5FF" />
      <Rect x="38" y="40" width="30" height="29" rx="5" fill="#EFC477" stroke="#89653E" strokeWidth="1.8" />
      <Path d="M48 40 V69 M58 40 V69 M38 54 H68" stroke="#A57741" strokeWidth="1.8" />
      <Ellipse cx="50" cy="61" rx="47" ry="15" rotation="-25" origin="50,61" fill="none" stroke="url(#orbit)" strokeWidth="7" strokeLinecap="round" />
      <Circle cx="83" cy="40" r="3.2" fill="#D59AFF" />
    </Svg>
  );
}
