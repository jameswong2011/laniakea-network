import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  askNote,
  requestNoteBrief,
  type NoteBrief,
} from "./ai";
import { colors, radius } from "./theme";
import type { AppStackParamList } from "./types";

// Metro resolves bundled React Native image assets through require().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BOT = require("../assets/bot-stars.jpg");

async function loadSavedBrief(postId: string) {
  let result = await requestNoteBrief(postId);

  for (
    let attempt = 0;
    !result?.brief &&
    result?.error?.includes("still being written") &&
    attempt < 5;
    attempt += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    result = await requestNoteBrief(postId);
  }

  return result;
}

export function AiButton({
  aboveTabs = false,
  onPress,
}: {
  aboveTabs?: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bottom = aboveTabs ? 16 : insets.bottom + 16;

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom, right: 16 }]}>
      <View style={styles.glow}>
        <Pressable accessibilityLabel="Open assistant" onPress={onPress} style={styles.button}>
          {/* React Native supplies accessibility text on the pressable rather than an HTML alt prop. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image source={BOT} accessibilityIgnoresInvertColors style={styles.bot} />
        </Pressable>
      </View>
    </View>
  );
}

export function AssistantScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, "Assistant">) {
  const insets = useSafeAreaInsets();
  const params = route.params;
  const postId = params?.postId;
  const locked = params?.locked ?? false;
  const summary = params?.summary ?? null;
  const ticker = params?.ticker ?? null;
  const conviction = params?.conviction ?? null;
  const claims = params?.claims;
  const risks = params?.risks;
  const agreement = params?.agreement;
  const objection = params?.objection;
  const meaning = params?.meaning ?? null;
  const scrollRef = useRef<ScrollView>(null);
  const passedBrief: NoteBrief | null = summary
    ? {
        summary,
        ticker,
        conviction,
        claims: claims ?? [],
        risks: risks ?? [],
        agreement: agreement ?? null,
        objection: objection ?? null,
      }
    : null;
  const [briefResponse, setBriefResponse] = useState<{
    postId: string;
    brief: NoteBrief | null;
    error: string | null;
  } | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!postId) {
      return;
    }

    let active = true;
    void loadSavedBrief(postId).then((result) => {
      if (!active) {
        return;
      }

      setBriefResponse({
        postId,
        brief: result?.brief ?? null,
        error: result?.error ?? (result?.brief ? null : "The AI summary is still being written."),
      });
    });

    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    if (!answer) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [answer]);

  const response = briefResponse?.postId === postId ? briefResponse : null;
  const shown = response?.brief ?? passedBrief;
  const briefLoading = Boolean(postId && !response);
  const briefError = response?.error ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        {postId && !shown ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>Summary</Text>
            <Text style={styles.item}>
              {briefLoading
                ? "Writing and saving the AI summary…"
                : briefError ?? "The AI summary is still being written."}
            </Text>
          </View>
        ) : null}
        {shown ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>Summary</Text>
            {shown.ticker || shown.conviction ? (
              <Text style={styles.meta}>{[shown.ticker, shown.conviction].filter(Boolean).join(" · ")}</Text>
            ) : null}
            <Text style={styles.summary}>{shown.summary}</Text>
            {!locked && shown.claims.length > 0 ? (
              <View style={styles.list}>
                <Text style={styles.meta}>Claims</Text>
                {shown.claims.map((claim) => (
                  <Text key={claim} style={styles.item}>{claim}</Text>
                ))}
              </View>
            ) : null}
            {!locked && shown.risks.length > 0 ? (
              <View style={styles.list}>
                <Text style={styles.meta}>Risks</Text>
                {shown.risks.map((risk) => (
                  <Text key={risk} style={styles.item}>{risk}</Text>
                ))}
              </View>
              ) : null}
            {shown.agreement ? (
              <Text style={styles.item}>
                <Text style={styles.agree}>Agreement. </Text>
                {shown.agreement}
              </Text>
            ) : null}
            {shown.objection ? (
              <Text style={styles.item}>
                <Text style={styles.object}>Objection. </Text>
                {shown.objection}
              </Text>
            ) : null}
          </View>
        ) : null}
        {!postId || meaning != null ? (
          <View style={styles.meaningCard}>
            <Text style={styles.kicker}>By meaning</Text>
            {!meaning || meaning.length === 0 ? (
              <Text style={styles.item}>Ask a question, or use three or more words.</Text>
            ) : (
              meaning.map((hit) => (
                <Pressable key={hit.id} onPress={() => navigation.navigate("Thread", { postId: hit.id })}>
                  <Text style={styles.hit}>{hit.title}</Text>
                  <Text style={styles.item}>{hit.summary}</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
        {answer ? (
          <View style={styles.answerCard}>
            <Text style={styles.askKicker}>Answer</Text>
            <Text style={styles.answer}>
              {section ? `${section}. ` : ""}
              {answer}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      {postId ? (
        <View style={[styles.askCard, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.askKicker}>{locked ? "Ask the card" : "Ask"}</Text>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="What are you curious about"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            disabled={pending || question.trim().length < 2}
            onPress={() => void ask()}
            style={styles.ask}
          >
            <Text style={styles.askLabel}>{pending ? "Reading" : "Ask"}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );

  async function ask() {
    if (!postId) {
      return;
    }

    setPending(true);
    setError(null);
    const result = await askNote(postId, question);
    setPending(false);

    if (!result?.answer) {
      setAnswer(null);
      setError(result?.error ?? "No answer came back.");
      return;
    }

    setAnswer(result.answer);
    setSection(result.section ?? null);
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dock: {
    position: "absolute",
    zIndex: 20,
    alignItems: "flex-end",
  },
  scroll: {
    flex: 1,
  },
  panelContent: {
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    gap: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#3dd68c66",
    backgroundColor: "#3dd68c18",
    padding: 12,
  },
  summaryKicker: {
    color: colors.gain,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  commentCard: {
    gap: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#e6b45066",
    backgroundColor: "#e6b45018",
    padding: 12,
  },
  commentKicker: {
    color: colors.warning,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  meaningCard: {
    gap: 6,
  },
  askCard: {
    flexShrink: 0,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    padding: 12,
  },
  askKicker: {
    color: colors.fg,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  agree: {
    color: colors.warning,
    fontWeight: "600",
  },
  object: {
    color: colors.loss,
    fontWeight: "600",
  },
  summary: {
    color: colors.fg,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 4,
    marginTop: 6,
  },
  item: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  hit: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  ask: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  askLabel: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: colors.loss,
    fontSize: 13,
  },
  answerCard: {
    gap: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.fg,
    backgroundColor: colors.bg,
    padding: 12,
  },
  answer: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  glow: {
    borderRadius: 28,
    shadowColor: "#c4c4cc",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  bot: {
    width: 56,
    height: 56,
  },
});
