import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { compareTierThenHp } from "../../../../src/types";
import { INVITE_PURCHASE_UTL, inviteSharePath } from "../../../../src/lib/research/referral";
import { DeskAvatar } from "../avatar";
import { useDesk } from "../desk";
import { formatWhen } from "../format";
import { loadProfile, type DeskProfile } from "../floor";
import { loadAccountNotes, loadInvites, type AccountNote, type InviteCode } from "../library";
import { TierName } from "../tier-mark";
import { pickImage } from "../media";
import { ReactionTally } from "../reaction-tally";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { Empty } from "../ui";
import {
  buyInvite,
  loadBio,
  loadInvitees,
  loadReactions,
  loadReferralLines,
  loadTopicRanks,
  saveBio,
  uploadAvatar,
  type ReactionCount,
} from "../writes";

export function AccountScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, "Account">) {
  const signedIn = useDesk();
  const [profile, setProfile] = useState<DeskProfile>(signedIn);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [notes, setNotes] = useState<AccountNote[]>([]);
  const [noteReactions, setNoteReactions] = useState<Record<string, ReactionCount[]>>({});
  const [bio, setBio] = useState("");
  const [invitees, setInvitees] = useState<{ id: string; username: string; displayName: string; tier: string }[]>([]);
  const [books, setBooks] = useState<{ topic: string; rank: number; of: number; hp: number; tier: string }[]>([]);
  const [residuals, setResiduals] = useState<{ id: string; amount: number; depth: number; createdAt: string }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextCodes, nextNotes] = await Promise.all([
        loadProfile(signedIn.id),
        loadInvites(signedIn.id),
        loadAccountNotes(signedIn.id),
      ]);
      setProfile(nextProfile);
      setCodes(nextCodes);
      setNotes(nextNotes);
      setNoteReactions(await loadReactions("post", nextNotes.map((note) => note.id), signedIn.id));
      setBio(await loadBio(signedIn.id));
      const [nextInvitees, ranks] = await Promise.all([
        loadInvitees(signedIn.id),
        loadTopicRanks(),
      ]);
      setInvitees(nextInvitees);
      const grouped = new Map<string, { user_id: string; tier: string; current_hp: number }[]>();
      for (const rank of ranks) {
        const row = rank as { user_id: string; sub_topic: string; tier: string; current_hp: number };
        const list = grouped.get(row.sub_topic) ?? [];
        list.push(row);
        grouped.set(row.sub_topic, list);
      }
      const standings: { topic: string; rank: number; of: number; hp: number; tier: string }[] = [];
      for (const [topic, list] of grouped) {
        const sorted = [...list].sort((a, b) =>
          compareTierThenHp({ ...a, user_id: a.user_id }, { ...b, user_id: b.user_id })
        );
        const index = sorted.findIndex((row) => row.user_id === signedIn.id);
        if (index >= 0) {
          standings.push({
            topic,
            rank: index + 1,
            of: sorted.length,
            hp: sorted[index].current_hp,
            tier: sorted[index].tier,
          });
        }
      }
      setBooks(standings);
      setResiduals(await loadReferralLines(signedIn.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this account.");
    } finally {
      setLoading(false);
    }
  }, [signedIn.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />
      }
    >
      <Pressable
        onPress={() => {
          void pickImage().then(async (picked) => {
            if (!picked.uri) {
              setError(picked.error);
              return;
            }
            const result = await uploadAvatar(profile.id, picked.uri, picked.mime);
            setError(result.error ?? null);
            setNotice(result.message ?? null);
            if (result.id) {
              setProfile((current) => ({ ...current, avatar_url: result.id ?? null }));
            }
          });
        }}
        style={styles.picture}
      >
        <DeskAvatar url={profile.avatar_url} name={profile.display_name} size={72} />
        <View style={styles.pictureButton}>
          <Text style={styles.buttonLabel}>Change picture</Text>
        </View>
      </Pressable>
      <Text style={styles.name}>{profile.display_name}</Text>
      <Text style={styles.meta}>@{profile.username}</Text>
      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.kicker}>Room</Text>
          <TierName tier={profile.tier} />
        </View>
        <Stat label="Role" value={profile.role} />
        <Stat label="HP" value={String(profile.current_hp)} />
        <Stat label="UTL" value={String(profile.utility_tokens)} />
      </View>
      <TextInput
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="Bio"
        placeholderTextColor={colors.muted}
        style={styles.bio}
      />
      <Pressable
        onPress={() => {
          void saveBio(profile.id, bio).then((result) => {
            setError(result.error ?? null);
            setNotice(result.message ?? null);
          });
        }}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryLabel}>Save bio</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && notes.length === 0 && codes.length === 0 ? (
        <ActivityIndicator color={colors.fg} />
      ) : null}
      <Text style={styles.heading}>Invites</Text>
      <Pressable
        onPress={() => {
          void buyInvite().then(async (result) => {
            setError(result.error ?? null);
            setNotice(result.message ?? null);
            if (!result.error) {
              await refresh();
            }
          });
        }}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryLabel}>
          Buy an invite code · {INVITE_PURCHASE_UTL} UTL, free for elite
        </Text>
      </Pressable>
      {codes.length === 0 ? <Empty label="No invite codes on this desk." /> : null}
      {codes.map((code) => (
        <View key={code.id} style={styles.row}>
          <Text style={styles.title}>{code.code}</Text>
          <Text style={styles.meta}>{code.status}</Text>
          {code.status === "available" ? (
            <Pressable
              onPress={() => {
                const link = `https://www.laniakea.finance${inviteSharePath(code.code)}`;
                void Clipboard.setStringAsync(link).then(() => setNotice("Invite link copied."));
              }}
              style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonLabel}>Copy link</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Text style={styles.heading}>Direct invitees</Text>
      {invitees.length === 0 ? <Empty label="Nobody has redeemed your codes yet." /> : null}
      {invitees.map((invitee) => (
        <Pressable
          key={invitee.id}
          style={styles.row}
          onPress={() => navigation.navigate("Desk", { username: invitee.username })}
        >
          <Text style={styles.title}>{invitee.displayName}</Text>
          <View style={styles.inline}>
            <Text style={styles.inlineMeta}>@{invitee.username}</Text>
            <TierName tier={invitee.tier} />
          </View>
        </Pressable>
      ))}
      <Text style={styles.heading}>Invite residual</Text>
      {residuals.length === 0 ? <Empty label="No UTL residual yet." /> : null}
      {residuals.map((line) => (
        <View key={line.id} style={styles.row}>
          <Text style={styles.title}>{line.amount} UTL</Text>
          <Text style={styles.meta}>
            Depth {line.depth} · {formatWhen(line.createdAt)}
          </Text>
        </View>
      ))}
      <Text style={styles.heading}>Topic books</Text>
      {books.length === 0 ? <Empty label="Publish or vote in a sector to open a topic book." /> : null}
      {books.map((book) => (
        <View key={book.topic} style={styles.row}>
          <Text style={styles.title}>{book.topic}</Text>
          <View style={styles.inline}>
            <Text style={styles.inlineMeta}>
              {book.rank}/{book.of}
            </Text>
            <TierName tier={book.tier} />
            <Text style={styles.inlineMeta}>{book.hp} topic HP</Text>
          </View>
        </View>
      ))}
      <Text style={styles.heading}>Your notes</Text>
      {notes.length === 0 ? (
        <Empty label="Published notes stay here after they leave the tape." />
      ) : null}
      {notes.map((note) => (
        <Pressable
          key={note.id}
          style={styles.row}
          onPress={() => navigation.navigate("Thread", { postId: note.id })}
        >
          <Text style={styles.title}>{note.title}</Text>
          <ReactionTally counts={noteReactions[note.id] ?? []} />
          <Text style={styles.meta}>
            {note.status}
            {note.subTopic ? ` · ${note.subTopic}` : ""} · {formatWhen(note.createdAt)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  picture: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pictureButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: "600",
  },
  name: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  inlineMeta: { color: colors.muted, fontSize: 14 },
  meta: {
    color: colors.muted,
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 10,
  },
  stat: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.fg,
    fontSize: 18,
    marginTop: 4,
  },
  error: {
    color: colors.loss,
    paddingHorizontal: 16,
  },
  notice: {
    color: colors.gain,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  bio: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 88,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    padding: 14,
    textAlignVertical: "top",
  },
  primary: {
    minHeight: 50,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  copyButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    color: colors.fg,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.fg,
    fontSize: 16,
  },
});
