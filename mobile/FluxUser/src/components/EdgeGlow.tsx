import React from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

type Edge = 'top' | 'bottom' | 'left' | 'right';

/**
 * Ambient gradient "edge lighting" overlay (like premium dark UIs).
 * Renders soft glows that fade inward from the screen edges. It is purely
 * decorative: pointerEvents="none" so it never blocks touches.
 *
 * Props:
 *  - color: glow color (default white for the monochrome theme)
 *  - intensity: 0..1 max opacity of the glow (default 0.18)
 *  - spread: 0..0.5 how far the glow reaches inward (fraction of screen)
 *  - edges: which edges to light
 */
export default function EdgeGlow({
  color = '#FFFFFF',
  intensity = 0.18,
  spread = 0.22,
  edges = ['top', 'bottom', 'left', 'right'],
}: {
  color?: string;
  intensity?: number;
  spread?: number;
  edges?: Edge[];
}) {
  const {width, height} = useWindowDimensions();
  const vSpan = Math.round(height * spread);
  const hSpan = Math.round(width * spread);

  const has = (e: Edge) => edges.includes(e);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="glowTop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={intensity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="glowBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={intensity} />
          </LinearGradient>
          <LinearGradient id="glowLeft" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={intensity * 0.8} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="glowRight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={intensity * 0.8} />
          </LinearGradient>
        </Defs>

        {has('top') && <Rect x={0} y={0} width={width} height={vSpan} fill="url(#glowTop)" />}
        {has('bottom') && (
          <Rect x={0} y={height - vSpan} width={width} height={vSpan} fill="url(#glowBottom)" />
        )}
        {has('left') && <Rect x={0} y={0} width={hSpan} height={height} fill="url(#glowLeft)" />}
        {has('right') && (
          <Rect x={width - hSpan} y={0} width={hSpan} height={height} fill="url(#glowRight)" />
        )}
      </Svg>
    </View>
  );
}
