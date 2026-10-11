import { useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

const THUMB = 28;
const HIT = 44;

export function VoteScale({
  value,
  minimum,
  maximum,
  limit,
  disabled,
  onChange,
  onActiveChange,
  suffix = " HP",
  label = "Conviction",
}: {
  value: number;
  minimum: number;
  maximum: number;
  limit: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onActiveChange?: (active: boolean) => void;
  suffix?: string;
  label?: string;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const originX = useRef(0);
  const frameReady = useRef(false);
  const hitRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  const activeRef = useRef(onActiveChange);
  const disabledRef = useRef(Boolean(disabled));
  const boundsRef = useRef({ minimum, maximum, limit });
  onChangeRef.current = onChange;
  activeRef.current = onActiveChange;
  disabledRef.current = Boolean(disabled);
  boundsRef.current = { minimum, maximum, limit };
  widthRef.current = width;

  function apply(pageX: number) {
    if (disabledRef.current || !frameReady.current) {
      return;
    }

    const { minimum: min, maximum: max, limit: cap } = boundsRef.current;
    const inner = Math.max(1, widthRef.current - THUMB);
    const ratio = Math.min(1, Math.max(0, (pageX - originX.current - THUMB / 2) / inner));
    const next = min + Math.round(ratio * (max - min));
    onChangeRef.current(Math.min(cap, Math.max(min, next)));
  }

  function readFrame(pageX?: number) {
    hitRef.current?.measureInWindow((x, _y, nextWidth) => {
      originX.current = x;
      frameReady.current = nextWidth > 0;
      if (nextWidth > 0) {
        widthRef.current = nextWidth;
      }
      if (pageX != null) {
        apply(pageX);
      }
    });
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponderCapture: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        activeRef.current?.(true);
        readFrame(event.nativeEvent.pageX);
      },
      onPanResponderMove: (event) => apply(event.nativeEvent.pageX),
      onPanResponderRelease: () => activeRef.current?.(false),
      onPanResponderTerminate: () => activeRef.current?.(false),
    })
  ).current;

  const span = Math.max(1, maximum - minimum);
  const shown = Math.min(Math.max(minimum, limit), Math.max(minimum, value));
  const ratio = (Math.min(maximum, shown) - minimum) / span;
  const thumbLeft = ratio * Math.max(0, width - THUMB);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityValue={{ min: minimum, max: maximum, now: shown, text: `${shown}${suffix}` }}
      accessibilityActions={[
        { name: "increment", label: "Higher conviction" },
        { name: "decrement", label: "Lower conviction" },
      ]}
      onAccessibilityAction={(event) => {
        if (disabled) {
          return;
        }

        if (event.nativeEvent.actionName === "increment") {
          onChange(Math.min(limit, shown + 1));
        }

        if (event.nativeEvent.actionName === "decrement") {
          onChange(Math.max(minimum, shown - 1));
        }
      }}
      style={[styles.wrap, disabled && styles.disabled]}
    >
      <View style={styles.ends}>
        <Text style={styles.end}>{minimum}</Text>
        <Text style={styles.amount}>
          {shown}
          {suffix}
        </Text>
        <Text style={[styles.end, styles.endMax]}>{maximum}</Text>
      </View>
      <View
        ref={hitRef}
        collapsable={false}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          widthRef.current = next;
          setWidth(next);
          readFrame();
        }}
        style={styles.hit}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    gap: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  ends: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  end: {
    width: 24,
    color: colors.muted,
    fontSize: 12,
  },
  endMax: {
    textAlign: "right",
  },
  amount: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: "600",
  },
  hit: {
    height: HIT,
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    left: THUMB / 2,
    right: THUMB / 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.fg,
  },
  thumb: {
    position: "absolute",
    top: (HIT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.fg,
  },
});
