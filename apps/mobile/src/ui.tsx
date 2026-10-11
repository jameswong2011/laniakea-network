import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "./theme";

export function Chip({
  label,
  mark,
  active,
  tone,
  onPress,
}: {
  label: string;
  mark?: ReactNode;
  active: boolean;
  tone?: "gain" | "loss" | "warning";
  onPress: () => void;
}) {
  const activeColor =
    tone === "gain" ? colors.gain : tone === "loss" ? colors.loss : tone === "warning" ? colors.warning : colors.fg;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && tone ? { borderWidth: 1, borderColor: activeColor } : null,
        active && !tone ? styles.chipOn : null,
      ]}
    >
      <View style={styles.chipInner}>
        {mark}
        <Text
          style={[
            styles.chipLabel,
            active && tone ? { color: activeColor } : null,
            active && !tone ? styles.chipLabelOn : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

export function Empty({ label }: { label: string }) {
  return <Text style={styles.empty}>{label}</Text>;
}

export function SectionLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: {
    backgroundColor: colors.fg,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  chipLabelOn: {
    color: colors.bg,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    padding: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionLabel: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
