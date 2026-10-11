import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDesk } from "../desk";
import { formatWhen } from "../format";
import { deleteDraft, loadDrafts, type DraftItem } from "../library";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { Empty } from "../ui";

export function DraftsScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, "Drafts">) {
  const profile = useDesk();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const notes = drafts.filter((draft) => draft.kind === "post");
  const comments = drafts.filter((draft) => draft.kind === "comment");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDrafts(await loadDrafts(profile.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load drafts.");
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function remove(id: string) {
    setError(null);

    try {
      await deleteDraft(profile.id, id);
      setDrafts((current) => current.filter((draft) => draft.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this draft.");
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />
      }
    >
      <Text style={styles.lede}>Unpublished notes open in the composer. Comment drafts open the note.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && drafts.length === 0 ? <ActivityIndicator color={colors.fg} /> : null}
      <Text style={styles.heading}>Notes</Text>
      {notes.length === 0 ? <Empty label="No note drafts." /> : null}
      {notes.map((draft) => (
        <View key={draft.id} style={styles.row}>
          <Pressable
            style={styles.copy}
            onPress={() => navigation.navigate("Compose", { draftId: draft.id })}
          >
            <Text style={styles.title}>{draft.title.trim() || "Untitled draft"}</Text>
            <Text style={styles.meta}>
              {formatWhen(draft.updatedAt)}
              {draft.subTopic ? ` · ${draft.subTopic}` : ""}
            </Text>
            {draft.body ? (
              <Text numberOfLines={12} style={styles.body}>
                {draft.body}
              </Text>
            ) : null}
          </Pressable>
          <Pressable onPress={() => void remove(draft.id)} style={styles.delete}>
            <Text style={styles.deleteLabel}>Delete</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.heading}>Comments</Text>
      {comments.length === 0 ? <Empty label="No comment drafts." /> : null}
      {comments.map((draft) => (
        <View key={draft.id} style={styles.row}>
            <Pressable
              style={styles.copy}
              onPress={() => {
                if (draft.kind === "post") {
                  navigation.navigate("Compose", { draftId: draft.id });
                  return;
                }
                if (draft.postId) {
                  navigation.navigate("Thread", { postId: draft.postId });
                }
              }}
            >
            <Text style={styles.title}>{draft.body.trim().slice(0, 120) || "Empty comment draft"}</Text>
            <Text style={styles.meta}>{formatWhen(draft.updatedAt)}</Text>
          </Pressable>
          <Pressable onPress={() => void remove(draft.id)} style={styles.delete}>
            <Text style={styles.deleteLabel}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 40,
  },
  lede: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  error: {
    color: colors.loss,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heading: {
    color: colors.fg,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.fg,
    fontSize: 17,
    fontWeight: "600",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  delete: {
    alignSelf: "center",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: {
    color: colors.loss,
    fontSize: 14,
    fontWeight: "600",
  },
});
