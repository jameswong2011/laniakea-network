import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { askNote, requestCommentBrief, requestNoteBrief, type CommentBrief, type NoteBrief } from "./ai";
import { colors, radius } from "./theme";

export function NoteAssist({
  postId,
  locked,
  summary,
  ticker,
  conviction,
  claims,
  risks,
}: {
  postId: string;
  locked: boolean;
  summary: string | null;
  ticker: string | null;
  conviction: string | null;
  claims: string[];
  risks: string[];
}) {
  const [brief, setBrief] = useState<NoteBrief | null>(
    summary
      ? { summary, ticker, conviction, claims, risks }
      : null
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
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

  const shown = brief ?? (summary ? { summary, ticker, conviction, claims, risks } : null);

  return (
    <View style={styles.block}>
      {shown ? (
        <View style={styles.card}>
          {shown.ticker || shown.conviction ? (
            <Text style={styles.kicker}>
              {[shown.ticker, shown.conviction].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <Text style={styles.summary}>{shown.summary}</Text>
          {!locked && shown.claims.length > 0 ? (
            <View style={styles.list}>
              <Text style={styles.kicker}>Claims</Text>
              {shown.claims.map((claim) => (
                <Text key={claim} style={styles.item}>
                  {claim}
                </Text>
              ))}
            </View>
          ) : null}
          {!locked && shown.risks.length > 0 ? (
            <View style={styles.list}>
              <Text style={styles.kicker}>Risks</Text>
              {shown.risks.map((risk) => (
                <Text key={risk} style={styles.item}>
                  {risk}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder={locked ? "Ask the card" : "Ask this note"}
        placeholderTextColor={colors.muted}
        style={styles.input}
        onSubmitEditing={() => {
          void ask();
        }}
      />
      <Pressable
        disabled={pending || question.trim().length < 2}
        onPress={() => void ask()}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{pending ? "Reading" : "Ask"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {answer ? (
        <Text style={styles.answer}>
          {section ? `${section}. ` : ""}
          {answer}
        </Text>
      ) : null}
    </View>
  );

  async function ask() {
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

export function CommentRead({ postId, count }: { postId: string; count: number }) {
  const [brief, setBrief] = useState<CommentBrief | null>(null);

  useEffect(() => {
    if (count < 3) {
      setBrief(null);
      return;
    }

    void requestCommentBrief(postId).then((result) => {
      setBrief(result?.brief ?? null);
    });
  }, [count, postId]);

  if (!brief) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>The thread</Text>
      <Text style={styles.item}>Agreement. {brief.agreement}</Text>
      <Text style={styles.item}>Objection. {brief.objection}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 12,
    gap: 8,
  },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    padding: 12,
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
  input: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.fg,
    paddingHorizontal: 14,
  },
  button: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
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
});
