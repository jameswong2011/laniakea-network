import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ascentLine, canWriteDesk, DEFAULT_COMMENT_STAKE_HP, MAX_STAKE_HP, RESEARCH_POST_STATUS_LIVE, VOTE_STRENGTH_MAX, VOTE_STRENGTH_MIN, voteCostHp, voteStrength } from "../domain";
import { useDesk } from "../desk";
import {
  loadThread,
  unlockNote,
  type FloorComment,
  type FloorNote,
} from "../floor";
import { isPostSaved, toggleSaved } from "../library";
import { NoteAssist, CommentRead } from "../note-ai";
import { NoteBody } from "../note-body";
import { DeskAvatar } from "../avatar";
import { ReactionMark, ReactionTally } from "../reaction-tally";
import { TierName } from "../tier-mark";
import { colors, radius } from "../theme";
import { VoteScale } from "../vote-scale";
import type { AppStackParamList } from "../types";
import {
  editCommentBody,
  editPostBody,
  editReplyBody,
  isFollowing,
  isThreadFollowed,
  applyReactionToggle,
  emptyReactionCounts,
  loadCommentVotes,
  loadReactions,
  publishComment,
  publishReply,
  REACTION_KEYS,
  REACTION_LABELS,
  saveCommentDraft,
  toggleFollow,
  toggleReaction,
  toggleThreadFollow,
  voteOnComment,
  voteOnNote,
  type ReactionCount,
  type ReactionKey,
} from "../writes";
import type { VoteDirection } from "../../../../src/types";

function ReactMenu({
  counts,
  onToggle,
  inline = false,
}: {
  counts: ReactionCount[];
  onToggle: (key: ReactionKey) => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = counts.some((row) => row.mine);

  const button = (
    <Pressable
      onPress={() => setOpen((current) => !current)}
      style={({ pressed }) => [
        inline ? styles.replyChip : styles.toolButton,
        (open || active) && styles.actionButtonOn,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[inline ? styles.replyChipLabel : styles.actionLabel, (open || active) && styles.actionLabelOn]}>
        React
      </Text>
    </Pressable>
  );

  if (inline) {
    return (
      <>
        {button}
        {open ? (
          <View style={styles.inlineReactions}>
            <ReactionRow counts={counts} onToggle={onToggle} />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.disclosure}>
      {button}
      {open ? <ReactionRow counts={counts} onToggle={onToggle} /> : null}
    </View>
  );
}

function ReactionRow({
  counts,
  onToggle,
}: {
  counts: ReactionCount[];
  onToggle: (key: ReactionKey) => void;
}) {
  const byKey = new Map(counts.map((row) => [row.key, row]));

  return (
    <View style={styles.reactions}>
      {REACTION_KEYS.map((key) => {
        const row = byKey.get(key);
        const mine = row?.mine ?? false;
        const count = row?.count ?? 0;

        return (
          <Pressable
            key={key}
            accessibilityLabel={`${REACTION_LABELS[key]}${count > 0 ? ` ${count}` : ""}`}
            onPress={() => onToggle(key)}
            style={[styles.reaction, mine && styles.reactionOn]}
          >
            <ReactionMark reaction={key} size={18} />
            {count > 0 ? (
              <Text style={mine ? styles.reactionOnLabel : styles.reactionLabel}>{count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const REPLY_MARK = require("../../assets/reply.jpg");

function ReplyButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Reply"
      onPress={onPress}
      style={({ pressed }) => [styles.replyButton, open && styles.replyButtonOn, pressed && styles.pressed]}
    >
      <Image source={REPLY_MARK} accessibilityIgnoresInvertColors style={styles.replyMark} />
    </Pressable>
  );
}

function ActionBar({
  onReply,
  replyOpen = false,
  onComment,
  commentOpen = false,
  onEdit,
  editOnRight = false,
  showReact,
  counts,
  onToggle,
  showVote,
  amount,
  maxAmount,
  recorded,
  pending,
  error,
  onAmount,
  onCast,
  onScaleActive,
  onVoteOpenChange,
}: {
  onReply?: () => void;
  replyOpen?: boolean;
  onComment?: () => void;
  commentOpen?: boolean;
  onEdit?: () => void;
  editOnRight?: boolean;
  showReact: boolean;
  counts: ReactionCount[];
  onToggle: (key: ReactionKey) => void;
  showVote: boolean;
  amount: number;
  maxAmount: number;
  recorded: number | null;
  pending: boolean;
  error: string | null;
  onAmount: (amount: number) => void;
  onCast: (direction: VoteDirection) => void;
  onScaleActive?: (active: boolean) => void;
  onVoteOpenChange?: (open: boolean) => void;
}) {
  const [panel, setPanel] = useState<"react" | "vote" | null>(null);
  const onVoteOpenChangeRef = useRef(onVoteOpenChange);
  onVoteOpenChangeRef.current = onVoteOpenChange;

  useEffect(() => {
    onVoteOpenChangeRef.current?.(panel === "vote");
    return () => onVoteOpenChangeRef.current?.(false);
  }, [panel]);

  const active = counts.some((row) => row.mine);
  const recordedLabel =
    recorded == null ? "Vote" : `${recorded > 0 ? "Up" : "Down"} ${voteCostHp(voteStrength(recorded))} HP`;

  return (
    <View style={styles.actionBlock}>
      <View style={styles.iconRow}>
        {onEdit && !editOnRight ? (
          <Pressable onPress={onEdit} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
            <Text style={styles.menuItemLabel}>Edit</Text>
          </Pressable>
        ) : null}
        <View style={styles.iconCluster}>
          {onComment ? (
            <Pressable
              accessibilityLabel="Comment"
              onPress={onComment}
              style={({ pressed }) => [styles.menuItem, commentOpen && styles.actionButtonOn, pressed && styles.pressed]}
            >
              <Text style={[styles.menuItemLabel, commentOpen && styles.actionLabelOn]}>Comment</Text>
            </Pressable>
          ) : null}
          {onReply ? <ReplyButton open={replyOpen} onPress={onReply} /> : null}
          {showReact ? (
            <Pressable
              accessibilityLabel="React"
              onPress={() => setPanel((current) => (current === "react" ? null : "react"))}
              style={({ pressed }) => [
                styles.menuItem,
                (panel === "react" || active) && styles.actionButtonOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.menuItemLabel, (panel === "react" || active) && styles.actionLabelOn]}>React</Text>
            </Pressable>
          ) : null}
          {showVote ? (
            <Pressable
              accessibilityLabel="Vote"
              onPress={() => {
                if (recorded == null) {
                  setPanel((current) => (current === "vote" ? null : "vote"));
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                (panel === "vote" || recorded != null) && styles.actionButtonOn,
                pressed && recorded == null && styles.pressed,
              ]}
            >
              <Text style={[styles.menuItemLabel, (panel === "vote" || recorded != null) && styles.actionLabelOn]}>
                {pending ? "Voting" : recordedLabel}
              </Text>
            </Pressable>
          ) : null}
          {onEdit && editOnRight ? (
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <Text style={styles.menuItemLabel}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {panel === "react" ? <ReactionRow counts={counts} onToggle={onToggle} /> : null}
      {panel === "vote" && recorded == null ? (
        <View style={styles.commentVote}>
          <VoteScale
            value={amount}
            minimum={VOTE_STRENGTH_MIN}
            maximum={VOTE_STRENGTH_MAX}
            limit={Math.max(VOTE_STRENGTH_MIN, maxAmount)}
            disabled={pending || maxAmount < VOTE_STRENGTH_MIN}
            onChange={onAmount}
            onActiveChange={onScaleActive}
          />
          <View style={styles.row}>
            <Pressable disabled={pending || maxAmount < VOTE_STRENGTH_MIN} onPress={() => onCast("up")} style={[styles.voteButton, styles.voteUp]}>
              <Text style={styles.voteButtonLabel}>Up</Text>
            </Pressable>
            <Pressable disabled={pending || maxAmount < VOTE_STRENGTH_MIN} onPress={() => onCast("down")} style={[styles.voteButton, styles.voteDown]}>
              <Text style={styles.voteButtonLabel}>Down</Text>
            </Pressable>
          </View>
          {maxAmount < VOTE_STRENGTH_MIN ? <Text style={styles.voteHint}>Need 1 HP to vote.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function ThreadScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, "Thread">) {
  const profile = useDesk();
  const insets = useSafeAreaInsets();
  const { postId } = route.params;
  const [note, setNote] = useState<FloorNote | null>(null);
  const [comments, setComments] = useState<FloorComment[]>([]);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [threadFollow, setThreadFollow] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [strength, setStrength] = useState(VOTE_STRENGTH_MIN);
  const [scaleDragging, setScaleDragging] = useState(false);
  const [postVoteOpen, setPostVoteOpen] = useState(false);
  const [commentVoteOpen, setCommentVoteOpen] = useState(false);
  const openCommentVotes = useRef(new Set<string>());

  const setCommentVotePanel = useCallback((commentId: string, open: boolean) => {
    if (open) {
      openCommentVotes.current.add(commentId);
    } else {
      openCommentVotes.current.delete(commentId);
    }
    setCommentVoteOpen(openCommentVotes.current.size > 0);
  }, []);

  const [commentBody, setCommentBody] = useState("");
  const commentStakeMax = Math.min(MAX_STAKE_HP, Math.max(1, profile.current_hp));
  const [commentStake, setCommentStake] = useState(() =>
    Math.min(DEFAULT_COMMENT_STAKE_HP, Math.min(MAX_STAKE_HP, Math.max(1, profile.current_hp)))
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dock, setDock] = useState<"comment" | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      fullScreenGestureEnabled: false,
      gestureEnabled: dock == null && !commentVoteOpen && !postVoteOpen,
    });
  }, [commentVoteOpen, dock, navigation, postVoteOpen]);
  const [commentVotes, setCommentVotes] = useState<Record<string, number>>({});
  const [commentAmounts, setCommentAmounts] = useState<Record<string, number>>({});
  const [commentVoteErrors, setCommentVoteErrors] = useState<Record<string, string | null>>({});
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [postReactions, setPostReactions] = useState<ReactionCount[]>(emptyReactionCounts());
  const [commentReactions, setCommentReactions] = useState<Record<string, ReactionCount[]>>({});
  const [replyReactions, setReplyReactions] = useState<Record<string, ReactionCount[]>>({});
  const reactionLocks = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const thread = await loadThread(profile, postId);
      setNote(thread.note);
      setComments(thread.comments);
      setSaved(await isPostSaved(profile.id, postId));
      setFollowing(await isFollowing(profile.id, thread.note.authorId));
      setThreadFollow(await isThreadFollowed(profile.id, postId));
      const replyIds = thread.comments.flatMap((comment) => comment.replies.map((reply) => reply.id));
      const [postMap, commentMap, replyMap] = await Promise.all([
        loadReactions("post", [postId], profile.id),
        loadReactions(
          "comment",
          thread.comments.map((comment) => comment.id),
          profile.id
        ),
        loadReactions("reply", replyIds, profile.id),
      ]);
      setPostReactions(postMap[postId] ?? emptyReactionCounts());
      setCommentReactions(commentMap);
      setReplyReactions(replyMap);
      setCommentVotes(
        await loadCommentVotes(
          profile.id,
          thread.comments.map((comment) => comment.id)
        )
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this note.");
    }
  }, [postId, profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function react(targetType: "post" | "comment" | "reply", targetId: string, key: ReactionKey) {
    const lock = `${targetType}:${targetId}:${key}`;

    if (reactionLocks.current.has(lock)) {
      return;
    }

    reactionLocks.current.add(lock);

    if (targetType === "post") {
      setPostReactions((current) => applyReactionToggle(current, key));
    } else if (targetType === "comment") {
      setCommentReactions((current) => ({
        ...current,
        [targetId]: applyReactionToggle(current[targetId] ?? emptyReactionCounts(), key),
      }));
    } else {
      setReplyReactions((current) => ({
        ...current,
        [targetId]: applyReactionToggle(current[targetId] ?? emptyReactionCounts(), key),
      }));
    }

    const result = await toggleReaction(profile.id, targetType, targetId, key);
    reactionLocks.current.delete(lock);

    if (!result.error) {
      setError(null);
      return;
    }

    setError(result.error);
    const fresh = await loadReactions(targetType, [targetId], profile.id);
    const counts = fresh[targetId] ?? emptyReactionCounts();

    if (targetType === "post") {
      setPostReactions(counts);
    } else if (targetType === "comment") {
      setCommentReactions((current) => ({ ...current, [targetId]: counts }));
    } else {
      setReplyReactions((current) => ({ ...current, [targetId]: counts }));
    }
  }

  async function unlock() {
    setPending(true);
    setError(null);

    try {
      await unlockNote(postId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unlock failed.");
    } finally {
      setPending(false);
    }
  }

  if (!note) {
    return (
      <View style={styles.screen}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.fg} />}
      </View>
    );
  }

  const canEngage = note.status === RESEARCH_POST_STATUS_LIVE && canWriteDesk(note.access);

  async function castVote(voteDirection: VoteDirection) {
    setPending(true);
    setError(null);
    setNotice(null);
    const affordable = Math.min(VOTE_STRENGTH_MAX, profile.current_hp);
    if (affordable < VOTE_STRENGTH_MIN) {
      setPending(false);
      setError("Need 1 HP to vote.");
      return;
    }

    const result = await voteOnNote({
      userId: profile.id,
      postId,
      direction: voteDirection,
      strength: Math.min(strength, affordable),
      access: note.access,
    });
    setPending(false);
    setError(result.error ?? null);
    setNotice(result.message ?? null);

    if (!result.error) {
      setPostVoteOpen(false);
      await refresh();
    }
  }

  async function castCommentVote(commentId: string, voteDirection: VoteDirection) {
    const maxAmount = Math.min(VOTE_STRENGTH_MAX, Math.max(0, profile.current_hp));
    const amount = Math.min(maxAmount, Math.max(VOTE_STRENGTH_MIN, commentAmounts[commentId] ?? VOTE_STRENGTH_MIN));
    setVotingCommentId(commentId);
    setCommentVoteErrors((current) => ({ ...current, [commentId]: null }));
    const result = await voteOnComment({
      userId: profile.id,
      postId,
      commentId,
      direction: voteDirection,
      strength: amount,
      access: note.access,
      postStatus: note.status,
      subTopic: note.subTopic,
    });
    setVotingCommentId(null);
    setCommentVoteErrors((current) => ({ ...current, [commentId]: result.error ?? null }));
    setNotice(result.error ? null : (result.message ?? null));

    if (!result.error) {
      await refresh();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      directionalLockEnabled
      scrollEnabled={!scaleDragging}
    >
      <Pressable
        onPress={() => navigation.navigate("Desk", { username: note.authorUsername })}
        style={styles.byline}
      >
        <DeskAvatar url={note.authorAvatar} name={note.authorName} size={28} />
        <Text style={styles.meta}>{note.authorName}</Text>
        {note.authorTier ? <TierName tier={note.authorTier} /> : null}
        {note.subTopic ? <Text style={styles.meta}>{note.subTopic}</Text> : null}
      </Pressable>
      <Text style={styles.title}>{note.title}</Text>
      <View style={styles.actions}>
      <Pressable
        onPress={() => {
          void toggleSaved(profile.id, postId)
            .then(setSaved)
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "Could not save this note.");
            });
        }}
        style={({ pressed }) => [styles.actionButton, saved && styles.actionButtonOn, pressed && styles.pressed]}
      >
        <Text numberOfLines={2} style={[styles.actionLabel, saved && styles.actionLabelOn]}>
          {saved ? "Saved" : "Save"}
        </Text>
      </Pressable>
      {note.authorId !== profile.id ? (
        <Pressable
          onPress={() => {
            void toggleFollow(profile.id, note.authorId).then(setFollowing);
          }}
          style={({ pressed }) => [styles.actionButton, following && styles.actionButtonOn, pressed && styles.pressed]}
        >
          <Text numberOfLines={2} style={[styles.actionLabel, following && styles.actionLabelOn]}>
            {following ? "Following" : "Follow desk"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          void toggleThreadFollow(profile.id, postId).then(setThreadFollow);
        }}
        style={({ pressed }) => [styles.actionButton, threadFollow && styles.actionButtonOn, pressed && styles.pressed]}
      >
        <Text numberOfLines={2} style={[styles.actionLabel, threadFollow && styles.actionLabelOn]}>
          {threadFollow ? "Following thread" : "Follow thread"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          const url = `https://www.laniakea.finance/feed/${postId}`;
          void Clipboard.setStringAsync(url).then(() => Share.share({ message: url }));
        }}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        <Text numberOfLines={2} style={styles.actionLabel}>Share</Text>
      </Pressable>
      </View>
      <Text style={styles.health}>
        {note.healthLabel} · {note.currentHealth} / {ascentLine(note.originalStake)} HP
      </Text>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${note.healthPercent}%` }]} />
      </View>
      <NoteAssist
        postId={postId}
        locked={note.access === "hidden"}
        summary={note.summary}
        ticker={note.ticker}
        conviction={note.conviction}
        claims={note.claims}
        risks={note.risks}
      />
      {editingPost ? (
        <View>
          <TextInput value={draftBody} onChangeText={setDraftBody} multiline style={styles.area} />
          <Pressable
            onPress={() => {
              void editPostBody(profile.id, postId, draftBody).then(async (result) => {
                setError(result.error ?? null);
                setNotice(result.message ?? null);
                if (!result.error) {
                  setEditingPost(false);
                  await refresh();
                }
              });
            }}
            style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
          >
            <Text style={styles.inlineActionLabel}>Save edit</Text>
          </Pressable>
        </View>
      ) : (
        <NoteBody body={note.body} />
      )}
      <ReactionTally counts={postReactions} />
      {(note.authorId === profile.id && note.access !== "hidden" && !editingPost) || canWriteDesk(note.access) || canEngage ? (
        <ActionBar
          onComment={
            canEngage
              ? () => setDock((current) => (current === "comment" ? null : "comment"))
              : undefined
          }
          commentOpen={dock === "comment"}
          onEdit={
            note.authorId === profile.id && note.access !== "hidden" && !editingPost
              ? () => {
                  setDraftBody(note.body);
                  setEditingPost(true);
                }
              : undefined
          }
          showReact={canWriteDesk(note.access)}
          counts={postReactions}
          onToggle={(key) => void react("post", postId, key)}
          showVote={canEngage}
          amount={strength}
          maxAmount={Math.min(VOTE_STRENGTH_MAX, Math.max(0, profile.current_hp))}
          recorded={null}
          pending={pending}
          error={error}
          onAmount={setStrength}
          onCast={(voteDirection) => void castVote(voteDirection)}
          onScaleActive={setScaleDragging}
          onVoteOpenChange={setPostVoteOpen}
        />
      ) : null}
      {dock == null && error ? <Text style={styles.error}>{error}</Text> : null}
      {dock == null && notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {comments.length > 0 ? <Text style={styles.section}>Comments</Text> : null}
      {note.access !== "hidden" ? <CommentRead postId={postId} count={comments.length} /> : null}
      {comments.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <View style={styles.byline}>
            <DeskAvatar url={comment.authorAvatar} name={comment.authorName} size={22} />
            <Text style={styles.meta}>{comment.authorName}</Text>
          </View>
          <Text style={styles.commentHealth}>
            {comment.healthLabel} · {comment.currentHealth} / {ascentLine(comment.originalStake)} HP
          </Text>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${comment.healthPercent}%` }]} />
          </View>
          {edits[comment.id] != null ? (
            <View>
              <TextInput
                value={edits[comment.id]}
                onChangeText={(value) => setEdits((current) => ({ ...current, [comment.id]: value }))}
                multiline
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  void editCommentBody(profile.id, comment.id, edits[comment.id] ?? "").then(async (result) => {
                    setError(result.error ?? null);
                    setNotice(result.message ?? null);
                    if (!result.error) {
                      setEdits((current) => {
                        const next = { ...current };
                        delete next[comment.id];
                        return next;
                      });
                      await refresh();
                    }
                  });
                }}
                style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
              >
                <Text style={styles.inlineActionLabel}>Save comment</Text>
              </Pressable>
            </View>
          ) : (
            <NoteBody body={comment.body} />
          )}
          <ReactionTally counts={commentReactions[comment.id] ?? []} />
          {canEngage || (comment.authorId === profile.id && edits[comment.id] == null) || canWriteDesk(note.access) ? (
            <ActionBar
              onReply={
                canEngage
                  ? () => setReplyOpen((current) => ({ ...current, [comment.id]: !current[comment.id] }))
                  : undefined
              }
              replyOpen={replyOpen[comment.id] === true}
              onEdit={
                comment.authorId === profile.id && edits[comment.id] == null
                  ? () => setEdits((current) => ({ ...current, [comment.id]: comment.body }))
                  : undefined
              }
              editOnRight
              showReact={canWriteDesk(note.access)}
              counts={commentReactions[comment.id] ?? emptyReactionCounts()}
              onToggle={(key) => void react("comment", comment.id, key)}
              showVote={(canEngage && comment.status === RESEARCH_POST_STATUS_LIVE) || commentVotes[comment.id] != null}
              amount={Math.min(
                Math.min(VOTE_STRENGTH_MAX, Math.max(VOTE_STRENGTH_MIN, profile.current_hp)),
                Math.max(VOTE_STRENGTH_MIN, commentAmounts[comment.id] ?? VOTE_STRENGTH_MIN)
              )}
              maxAmount={Math.min(VOTE_STRENGTH_MAX, Math.max(0, profile.current_hp))}
              recorded={commentVotes[comment.id] ?? null}
              pending={votingCommentId === comment.id}
              error={commentVoteErrors[comment.id] ?? null}
              onAmount={(amount) =>
                setCommentAmounts((current) => ({ ...current, [comment.id]: amount }))
              }
              onCast={(voteDirection) => void castCommentVote(comment.id, voteDirection)}
              onScaleActive={setScaleDragging}
              onVoteOpenChange={(open) => setCommentVotePanel(comment.id, open)}
            />
          ) : null}
          {comment.replies.length > 0 || (canEngage && replyOpen[comment.id]) ? (
            <View style={styles.replies}>
              {comment.replies.map((reply) => (
                <View key={reply.id} style={styles.replyItem}>
                  <View style={styles.replyByline}>
                    <DeskAvatar url={reply.authorAvatar} name={reply.authorName} size={16} />
                    <Text style={styles.replyName}>{reply.authorName}</Text>
                  </View>
                  {edits[reply.id] != null ? (
                    <TextInput
                      value={edits[reply.id]}
                      onChangeText={(value) => setEdits((current) => ({ ...current, [reply.id]: value }))}
                      multiline
                      style={styles.replyEdit}
                    />
                  ) : (
                    <NoteBody body={reply.body} />
                  )}
                  <ReactionTally counts={replyReactions[reply.id] ?? []} />
                  {canWriteDesk(note.access) || reply.authorId === profile.id ? (
                  <View style={styles.replyActions}>
                    {canWriteDesk(note.access) ? (
                      <ReactMenu
                        inline
                        counts={replyReactions[reply.id] ?? emptyReactionCounts()}
                        onToggle={(key) => void react("reply", reply.id, key)}
                      />
                    ) : null}
                    {reply.authorId === profile.id ? (
                      <Pressable
                        onPress={() => {
                          if (edits[reply.id] != null) {
                            void editReplyBody(profile.id, reply.id, edits[reply.id] ?? "").then(async (result) => {
                              setError(result.error ?? null);
                              setNotice(result.message ?? null);
                              if (!result.error) {
                                setEdits((current) => {
                                  const next = { ...current };
                                  delete next[reply.id];
                                  return next;
                                });
                                await refresh();
                              }
                            });
                            return;
                          }
                          setEdits((current) => ({ ...current, [reply.id]: reply.body }));
                        }}
                        style={({ pressed }) => [styles.replyChip, pressed && styles.pressed]}
                      >
                        <Text style={styles.replyChipLabel}>
                          {edits[reply.id] != null ? "Save" : "Edit"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  ) : null}
                </View>
              ))}
              {canEngage && replyOpen[comment.id] ? (
                <View style={styles.replyCompose}>
                  <TextInput
                    value={replyDrafts[comment.id] ?? ""}
                    onChangeText={(value) =>
                      setReplyDrafts((current) => ({ ...current, [comment.id]: value }))
                    }
                    placeholder="Reply"
                    placeholderTextColor={colors.muted}
                    style={styles.replyField}
                  />
                  <Pressable
                    onPress={() => {
                      void publishReply({
                        userId: profile.id,
                        postId,
                        commentId: comment.id,
                        body: replyDrafts[comment.id] ?? "",
                        access: note.access,
                      }).then(async (result) => {
                        setError(result.error ?? null);
                        setNotice(result.message ?? null);
                        if (!result.error) {
                          setReplyDrafts((current) => ({ ...current, [comment.id]: "" }));
                          await refresh();
                        }
                      });
                    }}
                    style={({ pressed }) => [styles.replySend, pressed && styles.pressed]}
                  >
                    <Text style={styles.replySendLabel}>Send</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
    {dock === "comment" ? (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Comment</Text>
        <TextInput
          value={commentBody}
          onChangeText={setCommentBody}
          multiline
          placeholder="Stake a comment"
          placeholderTextColor={colors.muted}
          style={styles.area}
        />
        <VoteScale
          value={commentStake}
          minimum={1}
          maximum={commentStakeMax}
          limit={commentStakeMax}
          disabled={pending || profile.current_hp < 1}
          label="Stake HP"
          onChange={setCommentStake}
        />
        <Pressable
          disabled={pending}
          onPress={() => {
            setPending(true);
            void publishComment({
              userId: profile.id,
              postId,
              body: commentBody,
              stakeHp: commentStake,
              access: note.access,
              postStatus: note.status,
              subTopic: note.subTopic,
              postAuthorId: note.authorId,
            }).then(async (result) => {
              setPending(false);
              setError(result.error ?? null);
              setNotice(result.message ?? null);
              if (!result.error) {
                setCommentBody("");
                setDock(null);
                await refresh();
              }
            });
          }}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{pending ? "Posting" : "Post comment"}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void saveCommentDraft({
              userId: profile.id,
              postId,
              body: commentBody,
              stakeHp: commentStake,
            }).then((result) => {
              setError(result.error ?? null);
              setNotice(result.message ?? null);
            });
          }}
          style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
        >
          <Text style={styles.inlineActionLabel}>Save comment draft</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
    ) : null}
    {note.unlockQuote ? (
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable
          disabled={pending}
          onPress={unlock}
          style={({ pressed }) => [styles.dockButton, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>
            {pending
              ? "Unlocking"
              : `${note.access === "hidden" ? "Unlock to read" : "Unlock to engage"} · ${note.unlockQuote.tokens} UTL`}
          </Text>
        </Pressable>
      </View>
    ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  byline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  actionButtonOn: {
    borderColor: colors.fg,
    backgroundColor: colors.fg,
  },
  actionLabel: {
    color: colors.fg,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  actionLabelOn: {
    color: colors.bg,
  },
  health: {
    color: colors.muted,
    marginTop: 10,
    fontSize: 13,
  },
  meter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    marginTop: 8,
    overflow: "hidden",
  },
  meterFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gain,
  },
  body: {
    color: colors.fg,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  button: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    color: colors.loss,
    marginTop: 12,
  },
  notice: {
    color: colors.gain,
    marginTop: 8,
  },
  form: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  voteChoice: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  voteUp: {
    backgroundColor: colors.gain,
  },
  voteDown: {
    backgroundColor: colors.loss,
  },
  voteIdle: {
    opacity: 0.4,
  },
  voteOnLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
  strength: {
    minHeight: 48,
    borderRadius: radius.field,
    backgroundColor: colors.bg,
    color: colors.fg,
    padding: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  area: {
    minHeight: 96,
    borderRadius: radius.field,
    backgroundColor: colors.bg,
    color: colors.fg,
    padding: 12,
    marginTop: 8,
    textAlignVertical: "top",
  },
  input: {
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    padding: 12,
    marginTop: 8,
  },
  replies: {
    marginTop: 12,
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    gap: 12,
  },
  replyItem: {
    gap: 4,
  },
  replyByline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyName: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: "600",
  },
  replyBody: {
    color: colors.fg,
    fontSize: 14,
    lineHeight: 20,
  },
  replyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  replyChip: {
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  replyChipLabel: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: "600",
  },
  replyCompose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyField: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.fg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  replySend: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  replySendLabel: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "600",
  },
  replyEdit: {
    minHeight: 72,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
  },
  inlineReactions: {
    width: "100%",
  },
  section: {
    color: colors.fg,
    fontSize: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  comment: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  commentHealth: {
    color: colors.muted,
    marginTop: 6,
    fontSize: 13,
  },
  commentBody: {
    color: colors.fg,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  disclosure: {
    marginTop: 8,
    alignSelf: "stretch",
  },
  actionBlock: {
    marginTop: 8,
    gap: 8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  replyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  replyButtonOn: {
    borderColor: colors.fg,
  },
  replyMark: {
    width: 28,
    height: 28,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    color: colors.fg,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
  },
  menuSheet: {
    width: "100%",
    gap: 8,
  },
  menuItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  menuItemLabel: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: "600",
  },
  toolButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  toolShare: {
    flex: 1,
    alignSelf: "stretch",
  },
  inlineAction: {
    marginTop: 8,
  },
  inlineActionLabel: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: "600",
  },
  commentVote: {
    marginTop: 8,
    gap: 8,
  },
  voteDirections: {
    marginTop: 4,
  },
  voteButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  voteButtonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
  voteRecorded: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  voteHint: {
    color: colors.muted,
    fontSize: 13,
  },
  reactions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  reaction: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
  },
  reactionOn: {
    borderColor: colors.fg,
  },
  reactionLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  reactionOnLabel: {
    color: colors.gain,
    fontSize: 13,
  },
  panel: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  panelTitle: {
    color: colors.fg,
    fontSize: 15,
    marginBottom: 8,
  },
  dock: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  dockButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dockOn: {
    backgroundColor: colors.surface,
  },
  dockOnLabel: {
    color: colors.fg,
    fontSize: 15,
    fontWeight: "600",
  },
});
