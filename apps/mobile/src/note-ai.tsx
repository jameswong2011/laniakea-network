import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  askNote,
  requestCommentBrief,
  requestNoteBrief,
  type CommentBrief,
  type MeaningHit,
  type NoteBrief,
} from "./ai";
import { colors, radius } from "./theme";

export function AiButton({
  postId,
  locked = false,
  summary = null,
  ticker = null,
  conviction = null,
  claims = [],
  risks = [],
  commentCount = 0,
  meaning = null,
  aboveTabs = false,
  onOpenNote,
}: {
  postId?: string;
  locked?: boolean;
  summary?: string | null;
  ticker?: string | null;
  conviction?: string | null;
  claims?: string[];
  risks?: string[];
  commentCount?: number;
  meaning?: MeaningHit[] | null;
  aboveTabs?: boolean;
  onOpenNote?: (postId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<NoteBrief | null>(
    summary ? { summary, ticker, conviction, claims, risks } : null
  );
  const [thread, setThread] = useState<CommentBrief | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!postId) {
      return;
    }

    if (summary) {
      setBrief({ summary, ticker, conviction, claims, risks });
      return;
    }

    void requestNoteBrief(postId).then((result) => {
      if (result?.brief) {
        setBrief(result.brief);
      }
    });
  }, [claims, conviction, postId, risks, summary, ticker]);

  useEffect(() => {
    if (!postId || locked || commentCount < 3) {
      setThread(null);
      return;
    }

    void requestCommentBrief(postId).then((result) => {
      setThread(result?.brief ?? null);
    });
  }, [commentCount, locked, postId]);

  const shown = brief;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { bottom: (aboveTabs ? 16 : insets.bottom + 16), right: 16 }]}
    >
      {open ? (
        <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
          {postId && !shown ? (
            <Text style={styles.item}>Summary, claims, and risks show here after this note is opened.</Text>
          ) : null}
          {shown ? (
            <View style={styles.card}>
              {shown.ticker || shown.conviction ? (
                <Text style={styles.kicker}>{[shown.ticker, shown.conviction].filter(Boolean).join(" · ")}</Text>
              ) : null}
              <Text style={styles.summary}>{shown.summary}</Text>
              {!locked && shown.claims.length > 0 ? (
                <View style={styles.list}>
                  <Text style={styles.kicker}>Claims</Text>
                  {shown.claims.map((claim) => (
                    <Text key={claim} style={styles.item}>{claim}</Text>
                  ))}
                </View>
              ) : null}
              {!locked && shown.risks.length > 0 ? (
                <View style={styles.list}>
                  <Text style={styles.kicker}>Risks</Text>
                  {shown.risks.map((risk) => (
                    <Text key={risk} style={styles.item}>{risk}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          {postId ? (
            <>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder={locked ? "Ask the card" : "Ask this note"}
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
              {answer ? (
                <Text style={styles.answer}>
                  {section ? `${section}. ` : ""}
                  {answer}
                </Text>
              ) : null}
            </>
          ) : null}
          {postId && !thread ? (
            <Text style={styles.item}>Agreement and objection show here after three comments.</Text>
          ) : null}
          {thread ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>The thread</Text>
              <Text style={styles.item}>Agreement. {thread.agreement}</Text>
              <Text style={styles.item}>Objection. {thread.objection}</Text>
            </View>
          ) : null}
          {meaning != null || !postId ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>By meaning</Text>
              {!meaning || meaning.length === 0 ? (
                <Text style={styles.item}>Ask a question, or use three or more words.</Text>
              ) : (
                meaning.map((hit) => (
                  <Pressable key={hit.id} onPress={() => onOpenNote?.(hit.id)}>
                    <Text style={styles.hit}>{hit.title}</Text>
                    <Text style={styles.item}>{hit.summary}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
      <Pressable
        accessibilityLabel={open ? "Close assistant" : "Open assistant"}
        onPress={() => setOpen((current) => !current)}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>AI</Text>
      </Pressable>
    </View>
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
  dock: {
    position: "absolute",
    zIndex: 20,
    alignItems: "flex-end",
    gap: 10,
    maxWidth: "100%",
  },
  panel: {
    width: 320,
    maxHeight: 420,
    borderRadius: radius.sheet,
    backgroundColor: colors.surface,
  },
  panelContent: {
    padding: 14,
    gap: 10,
  },
  card: {
    gap: 6,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
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
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    color: colors.fg,
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
  answer: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "700",
  },
});
