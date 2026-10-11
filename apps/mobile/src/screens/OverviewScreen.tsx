import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ARENA, FLOOR_RULES, OVERVIEW, SEATS } from "../overview";
import { colors, radius } from "../theme";

export function OverviewScreen({
  onSignIn,
  onSignUp,
  onOpenTape,
}: {
  onSignIn?: () => void;
  onSignUp?: () => void;
  onOpenTape?: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{OVERVIEW.kicker}</Text>
      <Text style={styles.title}>{OVERVIEW.title}</Text>
      <Text style={styles.body}>{OVERVIEW.lead}</Text>
      <Text style={styles.body}>{OVERVIEW.close}</Text>

      <Text style={styles.section}>Two seats</Text>
      {SEATS.map((seat) => (
        <View key={seat.id} style={styles.card}>
          <Text style={styles.kicker}>{seat.kicker}</Text>
          <Text style={styles.cardTitle}>{seat.title}</Text>
          <Text style={styles.body}>{seat.lede}</Text>
          {seat.points.map((point) => (
            <View key={point.title} style={styles.point}>
              <Text style={styles.pointTitle}>{point.title}</Text>
              <Text style={styles.body}>{point.body}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.section}>Shared rules</Text>
      {FLOOR_RULES.map((rule) => (
        <View key={rule.title} style={styles.point}>
          <Text style={styles.pointTitle}>{rule.title}</Text>
          <Text style={styles.body}>{rule.body}</Text>
        </View>
      ))}

      <Text style={styles.section}>{ARENA.kicker}</Text>
      <Text style={styles.cardTitle}>{ARENA.title}</Text>
      <Text style={styles.body}>{ARENA.body}</Text>

      {onSignIn ? (
        <Pressable onPress={onSignIn} style={styles.button}>
          <Text style={styles.buttonLabel}>Sign in</Text>
        </Pressable>
      ) : null}
      {onSignUp ? (
        <Pressable onPress={onSignUp} style={styles.secondary}>
          <Text style={styles.secondaryLabel}>Create account</Text>
        </Pressable>
      ) : null}
      {onOpenTape ? (
        <Pressable onPress={onOpenTape} style={styles.button}>
          <Text style={styles.buttonLabel}>Open the tape</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.fg,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginTop: 8,
  },
  section: {
    color: colors.fg,
    fontSize: 22,
    marginTop: 28,
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    color: colors.fg,
    fontSize: 20,
    marginTop: 6,
  },
  point: {
    marginTop: 14,
  },
  pointTitle: {
    color: colors.fg,
    fontSize: 16,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  button: {
    marginTop: 28,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  secondary: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "600",
  },
});
