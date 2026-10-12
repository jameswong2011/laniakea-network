import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { TIERS, resolveTier, type Tier } from "../domain";
import { DeskAvatar } from "../avatar";
import { colors } from "../theme";
import { TierMark, TierName } from "../tier-mark";
import type { AppStackParamList, TabParamList } from "../types";
import { Chip } from "../ui";
import { loadRanking } from "../writes";

type Person = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  current_hp: number;
  avatar_url?: string | null;
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Ranking">,
  NativeStackScreenProps<AppStackParamList>
>;

export function RankingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>([]);
  const [tier, setTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const rows = people
    .filter((person) => (tier == null ? true : resolveTier(person.tier) === tier))
    .map((person) => ({
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
      setPeople((await loadRanking()) as Person[]);
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tierScroll}
        contentContainerStyle={styles.tiers}
      >
        <Chip label="All" active={tier == null} onPress={() => setTier(null)} />
        {[...TIERS].reverse().map((item) => (
          <Chip
            key={item}
            label={item}
            mark={<TierMark tier={item} size={12} />}
            active={tier === item}
            onPress={() => setTier(item)}
          />
        ))}
      </ScrollView>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.fg} />
          ) : (
            <Text style={styles.empty}>{tier ? `No desks in ${tier}.` : "No desks."}</Text>
          )
        }
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
  tierScroll: {
    flexGrow: 0,
  },
  tiers: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  error: { color: colors.loss, padding: 16 },
  empty: { color: colors.muted, padding: 16 },
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
