import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { researchExcerpt, TIERS, type Tier } from "../domain";
import { useDesk } from "../desk";
import {
  DEFAULT_FEED_STATUSES,
  EMPTY_FEED_QUERY,
  FEED_POSTED,
  FEED_POSTED_LABELS,
  FEED_STATUS_LABELS,
  FEED_STATUSES,
  SUB_TOPICS,
  toggleStatus,
  toggleTier,
  toggleTopic,
  type FeedPosted,
  type FeedQuery,
  type FeedStatus,
} from "../feed-query";
import { loadFeed, type FloorNote } from "../floor";
import { colors, radius } from "../theme";
import type { AppStackParamList, TabParamList } from "../types";
import { DeskAvatar } from "../avatar";
import { TierMark, TierName } from "../tier-mark";
import { Chip, Empty, SectionLabel } from "../ui";
import { loadReactions, type ReactionCount } from "../writes";
import { ReactionTally } from "../reaction-tally";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Feed">,
  NativeStackScreenProps<AppStackParamList>
>;

function railColor(access: FloorNote["access"]) {
  if (access === "hidden") {
    return colors.loss;
  }

  if (access === "view_only") {
    return colors.warning;
  }

  return colors.gain;
}

function statusTone(status: FeedStatus): "warning" | "gain" | "loss" {
  if (status === "ascended") {
    return "gain";
  }

  if (status === "hunted") {
    return "loss";
  }

  return "warning";
}

function tapeLabel(query: FeedQuery) {
  const outcome =
    query.statuses == null
      ? "Live tape"
      : query.statuses.map((status) => FEED_STATUS_LABELS[status]).join(", ");
  const desk = query.tiers == null ? "All desks" : query.tiers.join(", ");
  const sectors =
    query.topics == null
      ? "All sectors"
      : query.topics.length === 1
        ? query.topics[0]
        : `${query.topics.length} sectors`;

  const posted = query.posted == null ? "Any time" : FEED_POSTED_LABELS[query.posted];

  return `${outcome} · ${desk} · ${sectors} · ${posted}`;
}

export function FeedScreen({ navigation }: Props) {
  const profile = useDesk();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<FeedQuery>(EMPTY_FEED_QUERY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notes, setNotes] = useState<FloorNote[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionCount[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeStatuses = query.statuses ?? DEFAULT_FEED_STATUSES;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await loadFeed(profile, query);
      setNotes(next);
      setReactions(await loadReactions("post", next.map((note) => note.id), profile.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the tape.");
    } finally {
      setLoading(false);
    }
  }, [profile, query]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Tape</Text>
        <Pressable onPress={() => setFiltersOpen(true)} style={styles.filter}>
          <Text style={styles.filterLabel}>{tapeLabel(query)}</Text>
          <Text style={styles.filterAction}>Filter</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && notes.length === 0 ? (
        <ActivityIndicator color={colors.fg} style={styles.spinner} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(note) => note.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty label="No notes match this tape." />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("Thread", { postId: item.id })}
              style={styles.card}
            >
              <Pressable
                onPress={() => {
                  if (item.authorUsername) {
                    navigation.navigate("Desk", { username: item.authorUsername });
                  }
                }}
              >
                <View style={styles.cardMetaRow}>
                  <DeskAvatar url={item.authorAvatar} name={item.authorName} size={28} />
                  <View style={styles.cardWho}>
                    <Text style={styles.cardAuthor}>{item.authorName}</Text>
                    <View style={styles.cardMetaLine}>
                      {item.authorTier ? <TierName tier={item.authorTier} /> : null}
                      <View style={[styles.access, { backgroundColor: railColor(item.access) }]} />
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {item.subTopic ? `${item.subTopic} · ` : ""}
                        {item.healthLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text numberOfLines={6} style={styles.cardBody}>
                {item.summary || researchExcerpt(item.body, 360)}
              </Text>
              <ReactionTally counts={reactions[item.id] ?? []} />
            </Pressable>
          )}
        />
      )}
      <Modal
        visible={filtersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Filter the tape</Text>
              <Pressable onPress={() => setFiltersOpen(false)} hitSlop={8} style={styles.done}>
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <SectionLabel label="Outcome" hint="Battleground is live. Hunted and ascended are settled." />
              <View style={styles.wrap}>
                <Chip
                  label="Live tape"
                  active={query.statuses == null}
                  onPress={() => setQuery((current) => ({ ...current, statuses: null }))}
                />
                {FEED_STATUSES.map((status) => (
                  <Chip
                    key={status}
                    label={FEED_STATUS_LABELS[status]}
                    tone={statusTone(status)}
                    active={activeStatuses.includes(status)}
                    onPress={() =>
                      setQuery((current) => ({
                        ...current,
                        statuses: toggleStatus(current.statuses, status),
                      }))
                    }
                  />
                ))}
              </View>
              <SectionLabel label="Posted" hint="Today starts at midnight. This week starts Monday." />
              <View style={styles.wrap}>
                <Chip
                  label="Any time"
                  active={query.posted == null}
                  onPress={() => setQuery((current) => ({ ...current, posted: null }))}
                />
                {FEED_POSTED.map((posted) => (
                  <Chip
                    key={posted}
                    label={FEED_POSTED_LABELS[posted]}
                    active={query.posted === posted}
                    onPress={() => setQuery((current) => ({ ...current, posted: posted as FeedPosted }))}
                  />
                ))}
              </View>
              <SectionLabel label="Desk" hint="Author overall tier." />
              <View style={styles.wrap}>
                <Chip
                  label="All"
                  active={query.tiers == null}
                  onPress={() => setQuery((current) => ({ ...current, tiers: null }))}
                />
                {TIERS.map((tier) => (
                  <Chip
                    key={tier}
                    label={tier}
                    mark={<TierMark tier={tier} size={12} />}
                    active={(query.tiers ?? TIERS).includes(tier as Tier)}
                    onPress={() =>
                      setQuery((current) => ({
                        ...current,
                        tiers: toggleTier(current.tiers, tier),
                      }))
                    }
                  />
                ))}
              </View>
              <SectionLabel label="Sectors" hint="Book the note was filed under." />
              <View style={styles.wrap}>
                <Chip
                  label="All sectors"
                  active={query.topics == null}
                  onPress={() => setQuery((current) => ({ ...current, topics: null }))}
                />
                {SUB_TOPICS.map((topic) => (
                  <Chip
                    key={topic}
                    label={topic}
                    active={(query.topics ?? SUB_TOPICS).includes(topic)}
                    onPress={() =>
                      setQuery((current) => ({
                        ...current,
                        topics: toggleTopic(current.topics, topic),
                      }))
                    }
                  />
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    color: colors.fg,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  filter: {
    minHeight: 44,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 13,
    flex: 1,
  },
  filterAction: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: colors.loss,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  spinner: {
    marginTop: 32,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardWho: {
    flex: 1,
  },
  cardAuthor: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: "600",
  },
  cardMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  access: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  cardTitle: {
    color: colors.fg,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginTop: 12,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "86%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  sheetHead: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: colors.fg,
    fontSize: 17,
  },
  done: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    justifyContent: "center",
  },
  doneLabel: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "600",
  },
  sheetBody: {
    paddingBottom: 24,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
  },
});
