import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeskAvatar } from "../avatar";
import { useDesk } from "../desk";
import { useFocusRefresh } from "../focus-refresh";
import { loadProfile } from "../floor";
import { supabase } from "../supabase";
import { colors, radius } from "../theme";
import { TierName } from "../tier-mark";
import type { AppStackParamList } from "../types";

type HubRoute = "Inbox" | "Drafts" | "Saved" | "Wallet" | "Account" | "Overview" | "Landing";

const LINKS: { route: HubRoute; label: string; hint: string }[] = [
  { route: "Inbox", label: "Inbox", hint: "Replies and new notes from users you follow" },
  { route: "Drafts", label: "Drafts", hint: "Unpublished notes and comments" },
  { route: "Saved", label: "Saved", hint: "Notes you marked to come back to" },
  { route: "Wallet", label: "Wallet", hint: "HP, UTL, buy, and cash out" },
  { route: "Account", label: "Account", hint: "Invites and picture" },
  { route: "Overview", label: "How it works", hint: "Seats, rooms, Hunt, and Ascent" },
  { route: "Landing", label: "Landing", hint: "The picture sign-in page" },
];

export function YouScreen() {
  const profile = useDesk();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null);
  const loadAvatar = useCallback(async () => {
    setAvatarUrl((await loadProfile(profile.id)).avatar_url);
  }, [profile.id]);

  useFocusRefresh(loadAvatar);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24 }}>
      <View style={styles.identity}>
        <DeskAvatar url={avatarUrl} name={profile.display_name} size={64} />
        <Text style={styles.name}>{profile.display_name}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>@{profile.username}</Text>
        <TierName tier={profile.tier} />
      </View>
      <View style={styles.balances}>
        <View style={styles.balance}>
          <Text style={styles.kicker}>HP</Text>
          <Text style={styles.value}>{profile.current_hp}</Text>
        </View>
        <View style={styles.balance}>
          <Text style={styles.kicker}>UTL</Text>
          <Text style={styles.value}>{profile.utility_tokens}</Text>
        </View>
      </View>
      {LINKS.map((item) => (
        <Pressable
          key={item.route}
          style={styles.row}
          onPress={() => navigation.navigate(item.route)}
        >
          <View style={styles.rowCopy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.hint}>{item.hint}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        onPress={() => void supabase.auth.signOut()}
      >
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
  },
  name: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  meta: {
    color: colors.muted,
    fontSize: 15,
  },
  balances: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  balance: {
    flex: 1,
    minHeight: 72,
    justifyContent: "center",
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    color: colors.fg,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowCopy: {
    flex: 1,
  },
  label: {
    color: colors.fg,
    fontSize: 17,
    fontWeight: "600",
  },
  chevron: {
    color: colors.muted,
    fontSize: 22,
    marginLeft: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  signOutButton: {
    minHeight: 48,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  signOut: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
});
