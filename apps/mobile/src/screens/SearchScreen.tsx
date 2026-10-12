import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeskAvatar } from "../avatar";
import { colors, radius } from "../theme";
import { TierName } from "../tier-mark";
import type { AppStackParamList, TabParamList } from "../types";
import { searchByMeaning } from "../ai";
import { searchFloor } from "../writes";

type Hit =
  | { kind: "label"; id: string; title: string }
  | { kind: "post"; id: string; postId?: string; title: string; meta: string; excerpt: string }
  | { kind: "comment"; id: string; postId: string; title: string; meta: string; excerpt: string }
  | { kind: "desk"; id: string; username: string; title: string; meta: string; tier: string; avatarUrl: string | null };

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Search">,
  NativeStackScreenProps<AppStackParamList>
>;

export function SearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (query.trim().length < 2) {
      setError("Type at least 2 characters.");
      return;
    }

    setError(null);
    const result = await searchFloor(query);
    const next: Hit[] = [];
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 3 || query.includes("?")) {
      const meaning = await searchByMeaning(query);
      if (meaning?.hits?.length) {
        next.push({ kind: "label", id: "meaning", title: "By meaning" });
        for (const hit of meaning.hits) {
          next.push({
            kind: "post",
            id: `meaning-${hit.id}`,
            postId: hit.id,
            title: hit.title,
            meta: "Summary",
            excerpt: hit.summary,
          });
        }
      }
    }
    if (result.titles.length > 0) {
      next.push({ kind: "label", id: "titles", title: "Titles" });
      next.push(
        ...result.titles.map((post) => ({
          kind: "post" as const,
          id: post.id,
          title: post.title,
          meta: post.subTopic ?? "Note",
          excerpt: post.excerpt,
        }))
      );
    }
    if (result.bodies.length > 0) {
      next.push({ kind: "label", id: "bodies", title: "In the note" });
      next.push(
        ...result.bodies.map((post) => ({
          kind: "post" as const,
          id: post.id,
          title: post.title,
          meta: post.subTopic ?? "Note",
          excerpt: post.excerpt,
        }))
      );
    }
    if (result.comments.length > 0) {
      next.push({ kind: "label", id: "comments", title: "Comments" });
      next.push(
        ...result.comments.map((comment) => ({
          kind: "comment" as const,
          id: comment.id,
          postId: comment.postId,
          title: comment.title,
          meta: "Comment",
          excerpt: comment.excerpt,
        }))
      );
    }
    if (result.desks.length > 0) {
      next.push({ kind: "label", id: "desks", title: "Desks" });
      next.push(
        ...result.desks.map((desk) => ({
          kind: "desk" as const,
          id: desk.id,
          username: desk.username,
          title: desk.displayName,
          meta: `@${desk.username}`,
          tier: desk.tier,
          avatarUrl: desk.avatarUrl,
        }))
      );
    }
    setHits(next);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>Search</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void run()}
        placeholder="Notes, comments, desks"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={hits}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        ListEmptyComponent={<Text style={styles.empty}>Search the same library as the website.</Text>}
        renderItem={({ item }) => {
          if (item.kind === "label") {
            return <Text style={styles.group}>{item.title}</Text>;
          }

          return (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (item.kind === "post") {
                  navigation.navigate("Thread", { postId: item.postId ?? item.id });
                }
                if (item.kind === "comment") {
                  navigation.navigate("Thread", { postId: item.postId });
                }
                if (item.kind === "desk") {
                  navigation.navigate("Desk", { username: item.username });
                }
              }}
            >
              <View style={styles.metaRow}>
                {item.kind === "desk" ? <DeskAvatar url={item.avatarUrl} name={item.title} size={28} /> : null}
                <Text style={styles.meta}>{item.meta}</Text>
                {item.kind === "desk" ? <TierName tier={item.tier} /> : null}
              </View>
              <Text style={styles.title}>{item.title}</Text>
              {"excerpt" in item && item.excerpt ? (
                <Text numberOfLines={4} style={styles.excerpt}>
                  {item.excerpt}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heading: {
    color: colors.fg,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
    paddingHorizontal: 16,
  },
  input: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.fg,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  error: { color: colors.loss, paddingHorizontal: 16 },
  empty: { color: colors.muted, padding: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  group: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { color: colors.muted, fontSize: 12 },
  title: { color: colors.fg, fontSize: 17, fontWeight: "600", marginTop: 4 },
  excerpt: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
});
