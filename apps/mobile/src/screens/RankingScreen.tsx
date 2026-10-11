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
import { compareTierThenHp } from "../../../../src/types";
import { DeskAvatar } from "../avatar";
import { colors, radius } from "../theme";
import { TierName } from "../tier-mark";
import type { AppStackParamList, TabParamList } from "../types";
import { loadRanking, loadTopicRanks } from "../writes";

type Person = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  current_hp: number;
  avatar_url?: string | null;
};

type RankRow = {
  user_id: string;
  sub_topic: string;
  tier: string;
  current_hp: number;
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Ranking">,
  NativeStackScreenProps<AppStackParamList>
>;

export function RankingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>([]);
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [booksOpen, setBooksOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const topics = [...new Set(ranks.map((row) => row.sub_topic))].sort();
  const byId = new Map(people.map((person) => [person.id, person]));
  const rows = topic
    ? ranks
        .filter((row) => row.sub_topic === topic)
        .sort((a, b) => compareTierThenHp({ ...a, user_id: a.user_id }, { ...b, user_id: b.user_id }))
        .map((row) => ({
          id: row.user_id,
          username: byId.get(row.user_id)?.username ?? "",
          label: byId.get(row.user_id)?.display_name ?? "Desk",
          avatarUrl: byId.get(row.user_id)?.avatar_url ?? null,
          tier: row.tier,
          detail: `${row.current_hp} topic HP`,
        }))
    : people.map((person) => ({
        id: person.id,
        username: person.username,
        label: person.display_name,
        avatarUrl: person.avatar_url ?? null,
        tier: person.tier,
        detail: `${person.current_hp} HP`,
      }));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextPeople, nextRanks] = await Promise.all([loadRanking(), loadTopicRanks()]);
      setPeople(nextPeople as Person[]);
      setRanks(nextRanks as RankRow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load ranking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>Rank</Text>
      <Pressable onPress={() => setBooksOpen(true)} style={styles.book}>
        <Text style={styles.bookLabel}>{topic ?? "Overall ranking"}</Text>
        <Text style={styles.bookAction}>Book</Text>
      </Pressable>
      <FlatList
        data={rows}
        keyExtractor={(row) => `${topic ?? "all"}-${row.id}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.fg} /> : null}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (item.username) {
                navigation.navigate("Desk", { username: item.username });
              }
            }}
          >
            <Text style={styles.rankNo}>{index + 1}</Text>
            <DeskAvatar url={item.avatarUrl} name={item.label} size={36} />
            <View style={styles.person}>
              <Text style={styles.line} numberOfLines={1}>{item.label}</Text>
              <TierName tier={item.tier} />
            </View>
            <Text style={styles.detail}>{item.detail}</Text>
          </Pressable>
        )}
      />
      <Modal visible={booksOpen} animationType="slide" transparent onRequestClose={() => setBooksOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setBooksOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Topic book</Text>
              <Pressable onPress={() => setBooksOpen(false)} hitSlop={8} style={styles.done}>
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            </View>
            <ScrollView>
              <Pressable
                style={styles.choice}
                onPress={() => {
                  setTopic(null);
                  setBooksOpen(false);
                }}
              >
                <Text style={topic == null ? styles.choiceOn : styles.choiceOff}>Overall ranking</Text>
              </Pressable>
              {topics.map((item) => (
                <Pressable
                  key={item}
                  style={styles.choice}
                  onPress={() => {
                    setTopic(item);
                    setBooksOpen(false);
                  }}
                >
                  <Text style={topic === item ? styles.choiceOn : styles.choiceOff}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  book: {
    minHeight: 44,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookLabel: { color: colors.muted, fontSize: 14, flex: 1 },
  bookAction: { color: colors.fg, fontSize: 14, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "70%",
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
  sheetTitle: { color: colors.fg, fontSize: 17 },
  done: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    justifyContent: "center",
  },
  doneLabel: { color: colors.bg, fontSize: 14, fontWeight: "600" },
  choice: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  choiceOn: { color: colors.fg, fontSize: 16 },
  choiceOff: { color: colors.muted, fontSize: 16 },
  error: { color: colors.loss, padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankNo: { width: 22, color: colors.muted, fontSize: 13, fontWeight: "600" },
  person: { flex: 1, gap: 2 },
  line: { color: colors.fg, fontSize: 16, fontWeight: "600" },
  detail: { color: colors.fg, fontSize: 15, fontWeight: "600" },
});
