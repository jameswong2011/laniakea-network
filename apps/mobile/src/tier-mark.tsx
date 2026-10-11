import { StyleSheet, Text, View } from "react-native";
import { resolveTier, type Tier } from "./domain";

const TIER_COLOR: Record<Tier, string> = {
  Bronze: "#d4a574",
  Silver: "#d8d8dc",
  Gold: "#d4b45a",
  Platinum: "#dce3e8",
  Masters: "#7dba8a",
};

export function TierMark({ tier, size = 14 }: { tier: string; size?: number }) {
  const resolved = resolveTier(tier);
  if (!resolved) {
    return null;
  }

  const color = TIER_COLOR[resolved];

  if (resolved === "Masters") {
    return (
      <Text
        style={{
          color,
          fontSize: size,
          lineHeight: size,
          width: size,
          height: size,
          textAlign: "center",
        }}
      >
        ★
      </Text>
    );
  }

  const bars = resolved === "Bronze" ? 1 : resolved === "Silver" ? 2 : resolved === "Gold" ? 3 : 4;
  const gap = bars === 4 ? 1 : 2;
  return (
    <View style={[styles.bars, { width: size, height: size, gap }]}>
      {Array.from({ length: bars }, (_, index) => (
        <View key={index} style={[styles.bar, { backgroundColor: color, height: bars === 4 ? 1.5 : 2 }]} />
      ))}
    </View>
  );
}

export function TierName({ tier, size = 13 }: { tier: string; size?: number }) {
  const resolved = resolveTier(tier);
  if (!resolved) {
    return <Text style={{ color: "#a3a3ab", fontSize: size }}>{tier}</Text>;
  }

  return (
    <View style={styles.name}>
      <TierMark tier={resolved} size={size + 1} />
      <Text style={{ color: TIER_COLOR[resolved], fontSize: size, fontWeight: "600" }}>{resolved}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { justifyContent: "center" },
  bar: { borderRadius: 1 },
  name: { flexDirection: "row", alignItems: "center", gap: 4 },
});
