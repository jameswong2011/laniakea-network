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
import { DeskAvatar } from "../avatar";
import { useDesk } from "../desk";
import { formatWhen } from "../format";
import { ReactionTally } from "../reaction-tally";
import { TierName } from "../tier-mark";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { loadDesk, loadReactions, toggleFollow, type DeskCard, type ReactionCount } from "../writes";

type Shelf = "notes" | "comments";

export function DeskScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, "Desk">) {
  const viewer = useDesk();
  const [desk, setDesk] = useState<DeskCard | null>(null);
  const [postReactions, setPostReactions] = useState<Record<string, ReactionCount[]>>({});
  const [commentReactions, setCommentReactions] = useState<Record<string, ReactionCount[]>>({});
  const [shelf, setShelf] = useState<Shelf>("notes");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const next = await loadDesk(route.params.username, viewer.id);
    setDesk(next);
    setError(next ? null : "This desk was not found.");
    if (next) {
      const [posts, comments] = await Promise.all([
        loadReactions("post", next.posts.map((post) => post.id), viewer.id),
        loadReactions("comment", next.comments.map((comment) => comment.id), viewer.id),
      ]);
      setPostReactions(posts);
      setCommentReactions(comments);
    }
    setLoading(false);
  }, [route.params.username, viewer.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (loading && !desk) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.fg} style={styles.spinner} />
      </View>
    );
  }

  if (!desk) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const ownDesk = desk.id === viewer.id;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />}
    >
      <View style={styles.identity}>
        <DeskAvatar url={desk.avatarUrl} name={desk.displayName} size={64} />
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{desk.displayName}</Text>
          <Text style={styles.handle}>@{desk.username}</Text>
          <View style={styles.tierRow}>
            <TierName tier={desk.tier} />
            <Text style={styles.tier}>joined {formatWhen(desk.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{desk.followers}</Text>
          <Text style={styles.statLabel}>{desk.followers === 1 ? "Follower" : "Followers"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{desk.posts.length}</Text>
          <Text style={styles.statLabel}>{desk.posts.length === 1 ? "Note" : "Notes"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{desk.comments.length}</Text>
          <Text style={styles.statLabel}>{desk.comments.length === 1 ? "Comment" : "Comments"}</Text>
        </View>
      </View>

      {ownDesk ? null : (
        <Pressable
          onPress={() => {
            void toggleFollow(viewer.id, desk.id).then((following) => {
              setDesk((current) =>
                current
                  ? {
                      ...current,
                      following,
                      followers: Math.max(0, current.followers + (following ? 1 : -1)),
                    }
                  : current
              );
            });
          }}
          style={({ pressed }) => [
            styles.follow,
            desk.following && styles.followOn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.followLabel, desk.following && styles.followLabelOn]}>
            {desk.following ? "Following" : "Follow desk"}
          </Text>
        </Pressable>
      )}

      {desk.bio ? <Text style={styles.bio}>{desk.bio}</Text> : null}

      <View style={styles.switch}>
        <Pressable
          onPress={() => setShelf("notes")}
          style={[styles.switchItem, shelf === "notes" && styles.switchOn]}
        >
          <Text style={[styles.switchLabel, shelf === "notes" && styles.switchLabelOn]}>Notes</Text>
        </Pressable>
        <Pressable
          onPress={() => setShelf("comments")}
          style={[styles.switchItem, shelf === "comments" && styles.switchOn]}
        >
          <Text style={[styles.switchLabel, shelf === "comments" && styles.switchLabelOn]}>Comments</Text>
        </Pressable>
      </View>

      {shelf === "notes" ? (
        desk.posts.length === 0 ? (
          <Text style={styles.empty}>No published notes yet.</Text>
        ) : (
          desk.posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => navigation.navigate("Thread", { postId: post.id })}
              style={styles.card}
            >
              <Text style={styles.meta}>
                {post.subTopic ? `${post.subTopic} · ` : ""}
                {formatWhen(post.createdAt)}
              </Text>
              <Text style={styles.title}>{post.title}</Text>
              {post.excerpt ? (
                <Text numberOfLines={2} style={styles.excerpt}>
                  {post.excerpt}
                </Text>
              ) : null}
              <ReactionTally counts={postReactions[post.id] ?? []} />
            </Pressable>
          ))
        )
      ) : desk.comments.length === 0 ? (
        <Text style={styles.empty}>No comments yet.</Text>
      ) : (
        desk.comments.map((comment) => (
          <Pressable
            key={comment.id}
            onPress={() => navigation.navigate("Thread", { postId: comment.postId })}
            style={styles.card}
          >
            <Text style={styles.meta}>{formatWhen(comment.createdAt)}</Text>
            <Text numberOfLines={3} style={styles.excerpt}>
              {comment.body}
            </Text>
            <ReactionTally counts={commentReactions[comment.id] ?? []} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  spinner: { marginTop: 32 },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  identityCopy: { flex: 1 },
  name: { color: colors.fg, fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  handle: { color: colors.muted, fontSize: 14, marginTop: 2 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  tier: { color: colors.muted, fontSize: 13 },
  stats: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: { color: colors.fg, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  follow: {
    marginHorizontal: 16,
    marginTop: 16,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  followOn: {
    backgroundColor: colors.surface,
  },
  followLabel: { color: colors.bg, fontSize: 16, fontWeight: "600" },
  followLabelOn: { color: colors.fg },
  pressed: { opacity: 0.7 },
  bio: {
    color: colors.fg,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  switch: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  switchItem: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: colors.fg,
  },
  switchLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  switchLabelOn: { color: colors.bg },
  empty: { color: colors.muted, fontSize: 14, paddingHorizontal: 16, marginTop: 16 },
  card: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  meta: { color: colors.muted, fontSize: 12 },
  title: { color: colors.fg, fontSize: 17, fontWeight: "600", marginTop: 4 },
  excerpt: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  error: { color: colors.loss, padding: 16 },
});
