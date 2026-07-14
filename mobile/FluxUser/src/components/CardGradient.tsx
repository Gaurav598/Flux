import React, {useId, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

/**
 * Drop-in gradient "edge lighting" for a card / button ELEMENT (not the screen).
 * Renders an absolutely-positioned rounded rectangle behind a card's content:
 *  - a subtle vertical gradient fill (lighter top → darker bottom), and
 *  - a hairline border that glows brighter along the TOP edge and fades down,
 * giving the premium neumorphic look from the reference design.
 *
 * Usage: make the parent card's background transparent + add `overflow:'hidden'`,
 * then drop `<CardGradient radius={16} />` as its FIRST child. It is
 * pointerEvents="none", so it works inside Touchables without blocking taps.
 */
export default function CardGradient({
  radius = 18,
  from = '#323238',
  to = '#161618',
  glow = '#FFFFFF',
  borderOpacity = 0.32,
  strokeWidth = 1.5,
}: {
  radius?: number;
  from?: string;
  to?: string;
  /** Edge-glow color. Default white; pass an accent to tint the lit edge. */
  glow?: string;
  borderOpacity?: number;
  strokeWidth?: number;
}) {
  const [size, setSize] = useState({w: 0, h: 0});
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fillId = `cgF${uid}`;
  const strokeId = `cgS${uid}`;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={e =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }>
      {size.w > 1 && size.h > 1 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
            <LinearGradient id={strokeId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={glow} stopOpacity={borderOpacity} />
              <Stop offset="0.5" stopColor={glow} stopOpacity={borderOpacity * 0.22} />
              <Stop offset="1" stopColor={glow} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={size.w - strokeWidth}
            height={size.h - strokeWidth}
            rx={radius}
            ry={radius}
            fill={`url(#${fillId})`}
            stroke={`url(#${strokeId})`}
            strokeWidth={strokeWidth}
          />
        </Svg>
      )}
    </View>
  );
}
