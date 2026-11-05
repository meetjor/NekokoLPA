import React from 'react';
import Svg, {Defs, LinearGradient, Stop, Rect, Path, Circle} from 'react-native-svg';

/** Decorative scenery matched to the approved QianLesim concept poster. */
export default function Nightscape({
  height = 120,
  footer = false,
}: {
  height?: number;
  footer?: boolean;
}) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 400 125" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B1632" />
          <Stop offset="0.58" stopColor="#211F55" />
          <Stop offset="1" stopColor="#43317F" />
        </LinearGradient>
        <LinearGradient id="mountain" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#1E2C63" />
          <Stop offset="0.5" stopColor="#40419E" />
          <Stop offset="1" stopColor="#35205F" />
        </LinearGradient>
        <LinearGradient id="wave" x1="0" y1="0.4" x2="1" y2="0.6">
          <Stop offset="0" stopColor="#46DDFC" />
          <Stop offset="0.5" stopColor="#5B86FE" />
          <Stop offset="1" stopColor="#D478FF" />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="125" fill="url(#sky)" />
      {footer ? (
        <>
          <Circle cx="332" cy="26" r="2" fill="#A6B4FF" />
          <Circle cx="171" cy="35" r="1.5" fill="#8EA3FF" />
          <Circle cx="270" cy="15" r="1.1" fill="#E2B8FF" />
          <Path d="M0 82 Q49 55 107 74 T215 68 T313 54 T400 72 L400 125 L0 125 Z" fill="#392E8B" />
          <Path d="M0 96 Q58 73 131 91 T260 81 T400 79 L400 125 L0 125 Z" fill="#24245D" />
          <Path d="M0 107 Q66 91 131 104 T270 98 T400 87 L400 125 L0 125 Z" fill="#101B3A" />
          <Path d="M0 86 Q63 59 132 77 T270 75 T400 67" stroke="url(#wave)" strokeWidth="2.2" fill="none" />
        </>
      ) : (
        <>
          <Circle cx="326" cy="35" r="24" fill="#FFD7BD" />
          <Path d="M0 67 L33 50 L68 66 L109 43 L155 70 L196 52 L228 70 L271 47 L313 76 L348 41 L400 67 L400 125 L0 125Z" fill="url(#mountain)" />
          <Path d="M0 88 L51 64 L102 92 L151 69 L207 94 L267 70 L331 97 L365 74 L400 87 L400 125 L0 125Z" fill="#18264E" />
          <Path d="M0 106 L55 91 L110 108 L168 84 L219 109 L270 88 L332 105 L400 92 L400 125 L0 125Z" fill="#0C1732" />
        </>
      )}
    </Svg>
  );
}
