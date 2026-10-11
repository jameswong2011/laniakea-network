import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";
import { REACTION_KEYS, REACTION_LABELS, type ReactionCount, type ReactionKey } from "./writes";

const MARKS: Record<ReactionKey, number> = {
  agree: require("../assets/reactions/agree.jpg"),
  disagree: require("../assets/reactions/disagree.jpg"),
  detailed: require("../assets/reactions/detailed.jpg"),
  non_consensus: require("../assets/reactions/non-consensus.jpg"),
  informative: require("../assets/reactions/informative.jpg"),
  funny: require("../assets/reactions/funny.jpg"),
};

export function ReactionMark({ reaction, size = 18 }: { reaction: ReactionKey; size?: number }) {
  return (
    <Image
      source={MARKS[reaction]}
      accessibilityIgnoresInvertColors
      style={{ width: size, height: size }}
    />
  );
}

export function ReactionTally({ counts }: { counts: ReactionCount[] }) {
  const visible = REACTION_KEYS.map((key) => counts.find((row) => row.key === key)).filter(
    (row): row is ReactionCount => row != null && row.count > 0
  );

  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {visible.map((row) => (
        <View
          key={row.key}
          accessibilityLabel={`${REACTION_LABELS[row.key]} ${row.count}`}
          style={[styles.item, row.mine && styles.mine]}
        >
          <ReactionMark reaction={row.key} size={18} />
          <Text style={[styles.count, row.mine && styles.countMine]}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 22,
  },
  mine: {
    backgroundColor: colors.surface,
    paddingLeft: 2,
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  countMine: {
    color: colors.fg,
  },
});
