import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDesk } from "../desk";
import { useFocusRefresh } from "../focus-refresh";
import { formatWhen } from "../format";
import { loadSaved, type SavedItem } from "../library";
import { ReactionTally } from "../reaction-tally";
import { colors } from "../theme";
import type { AppStackParamList } from "../types";
import { Empty } from "../ui";
import { loadReactions, type ReactionCount } from "../writes";

export function SavedScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, "Saved">) {
  const profile = useDesk();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionCount[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await loadSaved(profile.id);
      setItems(next);
      setReactions(await loadReactions("post", next.map((item) => item.id), profile.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load saved notes.");
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  const { refreshing, onRefresh } = useFocusRefresh(refresh);

  if (loading && items.length === 0) {
    return <ActivityIndicator color={colors.fg} style={styles.spinner} />;
  }

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fg} />
      }
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Empty label="Nothing saved yet. Use Save on a note." />}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate("Thread", { postId: item.id })}
        >
          <Text style={styles.meta}>
            {item.subTopic ? `${item.subTopic} · ` : ""}
            {formatWhen(item.createdAt)}
          </Text>
          <Text style={styles.title}>{item.title}</Text>
          <ReactionTally counts={reactions[item.id] ?? []} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  spinner: {
    marginTop: 32,
  },
  error: {
    color: colors.loss,
    padding: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.fg,
    fontSize: 17,
    fontWeight: "600",
    marginTop: 4,
  },
});
