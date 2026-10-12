import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ascentLine, canWriteDesk, DEFAULT_COMMENT_STAKE_HP, MAX_STAKE_HP, RESEARCH_POST_STATUS_LIVE, VOTE_STRENGTH_MAX, VOTE_STRENGTH_MIN, voteCostHp, voteStrength } from "../domain";
import { useDesk, useDeskRefresh } from "../desk";
import {
  loadThread,
  unlockNote,
  type FloorComment,
  type FloorNote,
  type FloorReply,
} from "../floor";
import { isPostSaved, toggleSaved } from "../library";
import { AiButton } from "../note-ai";
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
  loadNoteVote,
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
  type WriteResult,
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

type ReactTarget = "post" | "comment" | "reply";

const NO_REACTIONS = emptyReactionCounts();

type ThreadActions = {
  react: (targetType: ReactTarget, targetId: string, key: ReactionKey) => void;
  voteComment: (commentId: string, direction: VoteDirection, amount: number) => Promise<WriteResult>;
  editComment: (commentId: string, body: string) => Promise<WriteResult>;
  editReply: (replyId: string, body: string) => Promise<WriteResult>;
  sendReply: (commentId: string, body: string) => Promise<WriteResult>;
  setScaleActive: (active: boolean) => void;
  setVotePanel: (commentId: string, open: boolean) => void;
};

type HeaderActions = {
  openAuthor: () => void;
  toggleSaved: () => void;
  toggleFollow: () => void;
  toggleThreadFollow: () => void;
  react: (targetType: ReactTarget, targetId: string, key: ReactionKey) => void;
  castVote: (direction: VoteDirection, strength: number) => void;
  editPost: (body: string) => Promise<WriteResult>;
  toggleDock: () => void;
  setScaleActive: (active: boolean) => void;
  setVoteOpen: (open: boolean) => void;
};

type DockDraft = { body: string; stake: number };

function commentKey(comment: FloorComment) {
  return comment.id;
}

const NoteHeader = memo(function NoteHeader({
  note,
  viewerId,
  hp,
  saved,
  following,
  threadFollow,
  reactions,
  recorded,
  pending,
  error,
  notice,
  dockOpen,
  hasComments,
  actions,
}: {
  note: FloorNote;
  viewerId: string;
  hp: number;
  saved: boolean;
  following: boolean;
  threadFollow: boolean;
  reactions: ReactionCount[];
  recorded: number | null;
  pending: boolean;
  error: string | null;
  notice: string | null;
  dockOpen: boolean;
  hasComments: boolean;
  actions: HeaderActions;
}) {
  const [strength, setStrength] = useState<number>(VOTE_STRENGTH_MIN);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isAuthor = note.authorId === viewerId;
  const canWrite = canWriteDesk(note.access);
  const canEngage = note.status === RESEARCH_POST_STATUS_LIVE && canWrite;
  const canEdit = isAuthor && note.access !== "hidden" && draft == null;

  async function save(body: string) {
    setSaving(true);
    const result = await actions.editPost(body);
    setSaving(false);

    if (!result.error) {
      setDraft(null);
    }
  }

  return (
    <View>
      <Pressable onPress={actions.openAuthor} style={styles.byline}>
        <DeskAvatar url={note.authorAvatar} name={note.authorName} size={28} />
        <Text style={styles.meta}>{note.authorName}</Text>
        {note.authorTier ? <TierName tier={note.authorTier} /> : null}
        {note.subTopic ? <Text style={styles.meta}>{note.subTopic}</Text> : null}
      </Pressable>
      <Text style={styles.title}>{note.title}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={actions.toggleSaved}
          style={({ pressed }) => [styles.actionButton, saved && styles.actionButtonOn, pressed && styles.pressed]}
        >
          <Text numberOfLines={2} style={[styles.actionLabel, saved && styles.actionLabelOn]}>
            {saved ? "Saved" : "Save"}
          </Text>
        </Pressable>
        {isAuthor ? null : (
          <Pressable
            onPress={actions.toggleFollow}
            style={({ pressed }) => [styles.actionButton, following && styles.actionButtonOn, pressed && styles.pressed]}
          >
            <Text numberOfLines={2} style={[styles.actionLabel, following && styles.actionLabelOn]}>
              {following ? "Following user" : "Follow user"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={actions.toggleThreadFollow}
          style={({ pressed }) => [styles.actionButton, threadFollow && styles.actionButtonOn, pressed && styles.pressed]}
        >
          <Text numberOfLines={2} style={[styles.actionLabel, threadFollow && styles.actionLabelOn]}>
            {threadFollow ? "Following thread" : "Follow thread"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const url = `https://www.laniakea.finance/feed/${note.id}`;
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
      {draft != null ? (
        <View>
          <TextInput value={draft} onChangeText={setDraft} multiline style={styles.area} />
          <Pressable
            disabled={saving}
            onPress={() => void save(draft)}
            style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
          >
            <Text style={styles.inlineActionLabel}>Save edit</Text>
          </Pressable>
        </View>
      ) : (
        <NoteBody body={note.body} />
      )}
      <ReactionTally counts={reactions} />
      {canEdit || canWrite || canEngage ? (
        <ActionBar
          onComment={canEngage ? actions.toggleDock : undefined}
          commentOpen={dockOpen}
          onEdit={canEdit ? () => setDraft(note.body) : undefined}
          showReact={canWrite}
          counts={reactions}
          onToggle={(key) => actions.react("post", note.id, key)}
          showVote={canEngage}
          amount={strength}
          maxAmount={Math.min(VOTE_STRENGTH_MAX, Math.max(0, hp))}
          recorded={recorded}
          pending={pending}
          error={error}
          onAmount={setStrength}
          onCast={(direction) => actions.castVote(direction, strength)}
          onScaleActive={actions.setScaleActive}
          onVoteOpenChange={actions.setVoteOpen}
        />
      ) : null}
      {!dockOpen && error ? <Text style={styles.error}>{error}</Text> : null}
      {!dockOpen && notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {hasComments ? <Text style={styles.section}>Comments</Text> : null}
    </View>
  );
});

const ReplyItem = memo(function ReplyItem({
  reply,
  viewerId,
  canWrite,
  reactions,
  drafts,
  actions,
}: {
  reply: FloorReply;
  viewerId: string;
  canWrite: boolean;
  reactions: ReactionCount[];
  drafts: Map<string, string>;
  actions: ThreadActions;
}) {
  const draftKey = `edit:${reply.id}`;
  const [draft, setDraft] = useState(() => drafts.get(draftKey) ?? null);
  const [saving, setSaving] = useState(false);
  const isAuthor = reply.authorId === viewerId;

  function change(value: string) {
    drafts.set(draftKey, value);
    setDraft(value);
  }

  async function save(body: string) {
    setSaving(true);
    const result = await actions.editReply(reply.id, body);
    setSaving(false);

    if (!result.error) {
      drafts.delete(draftKey);
      setDraft(null);
    }
  }

  return (
    <View style={styles.replyItem}>
      <View style={styles.replyByline}>
        <DeskAvatar url={reply.authorAvatar} name={reply.authorName} size={16} />
        <Text style={styles.replyName}>{reply.authorName}</Text>
      </View>
      {draft != null ? (
        <TextInput value={draft} onChangeText={change} multiline style={styles.replyEdit} />
      ) : (
        <NoteBody body={reply.body} />
      )}
      <ReactionTally counts={reactions} />
      {canWrite || isAuthor ? (
        <View style={styles.replyActions}>
          {canWrite ? (
            <ReactMenu inline counts={reactions} onToggle={(key) => actions.react("reply", reply.id, key)} />
          ) : null}
          {isAuthor ? (
            <Pressable
              disabled={saving}
              onPress={() => {
                if (draft != null) {
                  void save(draft);
                  return;
                }
                change(reply.body);
              }}
              style={({ pressed }) => [styles.replyChip, pressed && styles.pressed]}
            >
              <Text style={styles.replyChipLabel}>{draft != null ? "Save" : "Edit"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

function ReplyComposer({
  commentId,
  drafts,
  actions,
}: {
  commentId: string;
  drafts: Map<string, string>;
  actions: ThreadActions;
}) {
  const draftKey = `reply:${commentId}`;
  const [body, setBody] = useState(() => drafts.get(draftKey) ?? "");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await actions.sendReply(commentId, body);
    setSending(false);

    if (!result.error) {
      drafts.delete(draftKey);
      setBody("");
    }
  }

  return (
    <View style={styles.replyCompose}>
      <TextInput
        value={body}
        onChangeText={(value) => {
          drafts.set(draftKey, value);
          setBody(value);
        }}
        placeholder="Reply"
        placeholderTextColor={colors.muted}
        style={styles.replyField}
      />
      <Pressable
        disabled={sending}
        onPress={() => void send()}
        style={({ pressed }) => [styles.replySend, pressed && styles.pressed]}
      >
        <Text style={styles.replySendLabel}>Send</Text>
      </Pressable>
    </View>
  );
}

const CommentRow = memo(function CommentRow({
  comment,
  viewerId,
  hp,
  canEngage,
  canWrite,
  recorded,
  reactions,
  replyReactions,
  drafts,
  actions,
}: {
  comment: FloorComment;
  viewerId: string;
  hp: number;
  canEngage: boolean;
  canWrite: boolean;
  recorded: number | null;
  reactions: ReactionCount[];
  replyReactions: Record<string, ReactionCount[]>;
  drafts: Map<string, string>;
  actions: ThreadActions;
}) {
  const draftKey = `edit:${comment.id}`;
  const [draft, setDraft] = useState(() => drafts.get(draftKey) ?? null);
  const [saving, setSaving] = useState(false);
  const [replyOpen, setReplyOpen] = useState(() => drafts.has(`reply:${comment.id}`));
  const [amount, setAmount] = useState<number>(VOTE_STRENGTH_MIN);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const isAuthor = comment.authorId === viewerId;
  const maxAmount = Math.min(VOTE_STRENGTH_MAX, Math.max(0, hp));

  function change(value: string) {
    drafts.set(draftKey, value);
    setDraft(value);
  }

  async function save(body: string) {
    setSaving(true);
    const result = await actions.editComment(comment.id, body);
    setSaving(false);

    if (!result.error) {
      drafts.delete(draftKey);
      setDraft(null);
    }
  }

  async function cast(direction: VoteDirection) {
    setVoting(true);
    setVoteError(null);
    const result = await actions.voteComment(comment.id, direction, amount);
    setVoting(false);
    setVoteError(result.error ?? null);
  }

  return (
    <View style={styles.comment}>
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
      {draft != null ? (
        <View>
          <TextInput value={draft} onChangeText={change} multiline style={styles.input} />
          <Pressable
            disabled={saving}
            onPress={() => void save(draft)}
            style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
          >
            <Text style={styles.inlineActionLabel}>Save comment</Text>
          </Pressable>
        </View>
      ) : (
        <NoteBody body={comment.body} />
      )}
      <ReactionTally counts={reactions} />
      {canEngage || (isAuthor && draft == null) || canWrite ? (
        <ActionBar
          onReply={canEngage ? () => setReplyOpen((current) => !current) : undefined}
          replyOpen={replyOpen}
          onEdit={isAuthor && draft == null ? () => change(comment.body) : undefined}
          editOnRight
          showReact={canWrite}
          counts={reactions}
          onToggle={(key) => actions.react("comment", comment.id, key)}
          showVote={(canEngage && comment.status === RESEARCH_POST_STATUS_LIVE) || recorded != null}
          amount={Math.min(
            Math.min(VOTE_STRENGTH_MAX, Math.max(VOTE_STRENGTH_MIN, hp)),
            Math.max(VOTE_STRENGTH_MIN, amount)
          )}
          maxAmount={maxAmount}
          recorded={recorded}
          pending={voting}
          error={voteError}
          onAmount={setAmount}
          onCast={(direction) => void cast(direction)}
          onScaleActive={actions.setScaleActive}
          onVoteOpenChange={(open) => actions.setVotePanel(comment.id, open)}
        />
      ) : null}
      {comment.replies.length > 0 || (canEngage && replyOpen) ? (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              viewerId={viewerId}
              canWrite={canWrite}
              reactions={replyReactions[reply.id] ?? NO_REACTIONS}
              drafts={drafts}
              actions={actions}
            />
          ))}
          {canEngage && replyOpen ? (
            <ReplyComposer commentId={comment.id} drafts={drafts} actions={actions} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

function CommentDock({
  hp,
  pending,
  error,
  notice,
  store,
  onPublish,
  onSaveDraft,
}: {
  hp: number;
  pending: boolean;
  error: string | null;
  notice: string | null;
  store: DockDraft;
  onPublish: (body: string, stake: number) => Promise<void>;
  onSaveDraft: (body: string, stake: number) => Promise<void>;
}) {
  const stakeMax = Math.min(MAX_STAKE_HP, Math.max(1, hp));
  const [body, setBody] = useState(store.body);
  const [stake, setStake] = useState(store.stake);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Comment</Text>
      <TextInput
        value={body}
        onChangeText={(value) => {
          store.body = value;
          setBody(value);
        }}
        multiline
        placeholder="Stake a comment"
        placeholderTextColor={colors.muted}
        style={styles.area}
      />
      <VoteScale
        value={stake}
        minimum={1}
        maximum={stakeMax}
        limit={stakeMax}
        disabled={pending || hp < 1}
        label="Stake HP"
        onChange={(value) => {
          store.stake = value;
          setStake(value);
        }}
      />
      <Pressable
        disabled={pending}
        onPress={() => void onPublish(body, Math.min(stake, stakeMax))}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{pending ? "Posting" : "Post comment"}</Text>
      </Pressable>
      <Pressable
        onPress={() => void onSaveDraft(body, stake)}
        style={({ pressed }) => [styles.toolButton, styles.inlineAction, pressed && styles.pressed]}
      >
        <Text style={styles.inlineActionLabel}>Save comment draft</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

export function ThreadScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, "Thread">) {
  const profile = useDesk();
  const refreshDesk = useDeskRefresh();
  const insets = useSafeAreaInsets();
  const { postId } = route.params;
  const viewerId = profile.id;
  const viewerTier = profile.tier;
  const viewerRole = profile.role;
  const hp = profile.current_hp;
  const [note, setNote] = useState<FloorNote | null>(null);
  const [comments, setComments] = useState<FloorComment[]>([]);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [threadFollow, setThreadFollow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dock, setDock] = useState<"comment" | null>(null);
  const [scaleDragging, setScaleDragging] = useState(false);
  const [postVoteOpen, setPostVoteOpen] = useState(false);
  const [commentVoteOpen, setCommentVoteOpen] = useState(false);
  const [commentVotes, setCommentVotes] = useState<Record<string, number>>({});
  const [noteVote, setNoteVote] = useState<number | null>(null);
  const [postReactions, setPostReactions] = useState<ReactionCount[]>(NO_REACTIONS);
  const [commentReactions, setCommentReactions] = useState<Record<string, ReactionCount[]>>({});
  const [replyReactions, setReplyReactions] = useState<Record<string, ReactionCount[]>>({});
  const [drafts] = useState(() => new Map<string, string>());
  const [dockDraft] = useState<DockDraft>(() => ({
    body: "",
    stake: Math.min(DEFAULT_COMMENT_STAKE_HP, Math.min(MAX_STAKE_HP, Math.max(1, hp))),
  }));
  const openCommentVotes = useRef(new Set<string>());
  const reactionLocks = useRef(new Set<string>());
  const lastLoaded = useRef({ postId: "", at: 0 });
  const live = useRef({ note, hp });
  live.current = { note, hp };

  useLayoutEffect(() => {
    navigation.setOptions({
      fullScreenGestureEnabled: false,
      gestureEnabled: dock == null && !commentVoteOpen && !postVoteOpen,
    });
  }, [commentVoteOpen, dock, navigation, postVoteOpen]);

  const report = useCallback((result: WriteResult) => {
    setError(result.error ?? null);
    setNotice(result.message ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const thread = await loadThread({ id: viewerId, tier: viewerTier, role: viewerRole }, postId);
      setNote(thread.note);
      setComments(thread.comments);
      const commentIds = thread.comments.map((comment) => comment.id);
      const replyIds = thread.comments.flatMap((comment) => comment.replies.map((reply) => reply.id));
      const [isSaved, followsAuthor, followsThread, postMap, commentMap, replyMap, votes, vote] =
        await Promise.all([
          isPostSaved(viewerId, postId),
          isFollowing(viewerId, thread.note.authorId),
          isThreadFollowed(viewerId, postId),
          loadReactions("post", [postId], viewerId),
          loadReactions("comment", commentIds, viewerId),
          loadReactions("reply", replyIds, viewerId),
          loadCommentVotes(viewerId, commentIds),
          loadNoteVote(viewerId, postId),
        ]);
      setSaved(isSaved);
      setFollowing(followsAuthor);
      setThreadFollow(followsThread);
      setPostReactions(postMap[postId] ?? NO_REACTIONS);
      setCommentReactions(commentMap);
      setReplyReactions(replyMap);
      setCommentVotes(votes);
      setNoteVote(vote);
      lastLoaded.current = { postId, at: Date.now() };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this note.");
    }
  }, [postId, viewerId, viewerRole, viewerTier]);

  useFocusEffect(
    useCallback(() => {
      const last = lastLoaded.current;

      if (last.postId === postId && Date.now() - last.at < 20_000) {
        return;
      }

      void refresh();
    }, [postId, refresh])
  );

  const setCommentVotePanel = useCallback((commentId: string, open: boolean) => {
    if (open) {
      openCommentVotes.current.add(commentId);
    } else {
      openCommentVotes.current.delete(commentId);
    }
    setCommentVoteOpen(openCommentVotes.current.size > 0);
  }, []);

  const react = useCallback(async (targetType: ReactTarget, targetId: string, key: ReactionKey) => {
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
        [targetId]: applyReactionToggle(current[targetId] ?? NO_REACTIONS, key),
      }));
    } else {
      setReplyReactions((current) => ({
        ...current,
        [targetId]: applyReactionToggle(current[targetId] ?? NO_REACTIONS, key),
      }));
    }

    const result = await toggleReaction(viewerId, targetType, targetId, key);
    reactionLocks.current.delete(lock);

    if (!result.error) {
      setError(null);
      return;
    }

    setError(result.error);
    const fresh = await loadReactions(targetType, [targetId], viewerId);
    const counts = fresh[targetId] ?? NO_REACTIONS;

    if (targetType === "post") {
      setPostReactions(counts);
    } else if (targetType === "comment") {
      setCommentReactions((current) => ({ ...current, [targetId]: counts }));
    } else {
      setReplyReactions((current) => ({ ...current, [targetId]: counts }));
    }
  }, [viewerId]);

  const castVote = useCallback(async (voteDirection: VoteDirection, requested: number) => {
    const current = live.current.note;

    if (!current) {
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);
    const affordable = Math.min(VOTE_STRENGTH_MAX, live.current.hp);
    if (affordable < VOTE_STRENGTH_MIN) {
      setPending(false);
      setError("Need 1 HP to vote.");
      return;
    }

    const result = await voteOnNote({
      userId: viewerId,
      postId,
      direction: voteDirection,
      strength: Math.min(requested, affordable),
      access: current.access,
    });
    void refreshDesk();
    setPending(false);
    report(result);

    if (!result.error) {
      setPostVoteOpen(false);
      await refresh();
    }
  }, [postId, refresh, refreshDesk, report, viewerId]);

  const voteComment = useCallback(async (commentId: string, voteDirection: VoteDirection, requested: number) => {
    const current = live.current.note;

    if (!current) {
      return { error: "Could not open this note." };
    }

    const maxAmount = Math.min(VOTE_STRENGTH_MAX, Math.max(0, live.current.hp));
    const result = await voteOnComment({
      userId: viewerId,
      postId,
      commentId,
      direction: voteDirection,
      strength: Math.min(maxAmount, Math.max(VOTE_STRENGTH_MIN, requested)),
      access: current.access,
      postStatus: current.status,
      subTopic: current.subTopic,
    });
    void refreshDesk();
    setNotice(result.error ? null : (result.message ?? null));

    if (!result.error) {
      await refresh();
    }

    return result;
  }, [postId, refresh, refreshDesk, viewerId]);

  const editPost = useCallback(async (body: string) => {
    const result = await editPostBody(viewerId, postId, body);
    report(result);

    if (!result.error) {
      await refresh();
    }

    return result;
  }, [postId, refresh, report, viewerId]);

  const editComment = useCallback(async (commentId: string, body: string) => {
    const result = await editCommentBody(viewerId, commentId, body);
    report(result);

    if (!result.error) {
      await refresh();
    }

    return result;
  }, [refresh, report, viewerId]);

  const editReply = useCallback(async (replyId: string, body: string) => {
    const result = await editReplyBody(viewerId, replyId, body);
    report(result);

    if (!result.error) {
      await refresh();
    }

    return result;
  }, [refresh, report, viewerId]);

  const sendReply = useCallback(async (commentId: string, body: string) => {
    const current = live.current.note;

    if (!current) {
      return { error: "Could not open this note." };
    }

    const result = await publishReply({
      userId: viewerId,
      postId,
      commentId,
      body,
      access: current.access,
    });
    report(result);

    if (!result.error) {
      await refresh();
    }

    return result;
  }, [postId, refresh, report, viewerId]);

  const sendComment = useCallback(async (body: string, stake: number) => {
    const current = live.current.note;

    if (!current) {
      return;
    }

    setPending(true);
    const result = await publishComment({
      userId: viewerId,
      postId,
      body,
      stakeHp: stake,
      access: current.access,
      postStatus: current.status,
      subTopic: current.subTopic,
      postAuthorId: current.authorId,
    });
    void refreshDesk();
    setPending(false);
    report(result);

    if (!result.error) {
      dockDraft.body = "";
      setDock(null);
      await refresh();
    }
  }, [dockDraft, postId, refresh, refreshDesk, report, viewerId]);

  const saveDraft = useCallback(async (body: string, stake: number) => {
    report(await saveCommentDraft({ userId: viewerId, postId, body, stakeHp: stake }));
  }, [postId, report, viewerId]);

  const threadActions = useMemo<ThreadActions>(
    () => ({
      react,
      voteComment,
      editComment,
      editReply,
      sendReply,
      setScaleActive: setScaleDragging,
      setVotePanel: setCommentVotePanel,
    }),
    [editComment, editReply, react, sendReply, setCommentVotePanel, voteComment]
  );

  const headerActions = useMemo<HeaderActions>(
    () => ({
      openAuthor: () => {
        const current = live.current.note;

        if (current) {
          navigation.navigate("Desk", { username: current.authorUsername });
        }
      },
      toggleSaved: () => {
        void toggleSaved(viewerId, postId)
          .then(setSaved)
          .catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Could not save this note.");
          });
      },
      toggleFollow: () => {
        const current = live.current.note;

        if (current) {
          void toggleFollow(viewerId, current.authorId).then(setFollowing);
        }
      },
      toggleThreadFollow: () => {
        void toggleThreadFollow(viewerId, postId).then(setThreadFollow);
      },
      react,
      castVote: (voteDirection, strength) => {
        void castVote(voteDirection, strength);
      },
      editPost,
      toggleDock: () => setDock((current) => (current === "comment" ? null : "comment")),
      setScaleActive: setScaleDragging,
      setVoteOpen: setPostVoteOpen,
    }),
    [castVote, editPost, navigation, postId, react, viewerId]
  );

  const canWrite = note ? canWriteDesk(note.access) : false;
  const canEngage = note ? note.status === RESEARCH_POST_STATUS_LIVE && canWrite : false;

  const renderComment = useCallback<ListRenderItem<FloorComment>>(
    ({ item }) => (
      <CommentRow
        comment={item}
        viewerId={viewerId}
        hp={hp}
        canEngage={canEngage}
        canWrite={canWrite}
        recorded={commentVotes[item.id] ?? null}
        reactions={commentReactions[item.id] ?? NO_REACTIONS}
        replyReactions={replyReactions}
        drafts={drafts}
        actions={threadActions}
      />
    ),
    [canEngage, canWrite, commentReactions, commentVotes, drafts, hp, replyReactions, threadActions, viewerId]
  );

  async function unlock() {
    setPending(true);
    setError(null);

    try {
      await unlockNote(postId);
      void refreshDesk();
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

  return (
    <View style={styles.screen}>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={comments}
      keyExtractor={commentKey}
      renderItem={renderComment}
      ListHeaderComponent={
        <NoteHeader
          note={note}
          viewerId={viewerId}
          hp={hp}
          saved={saved}
          following={following}
          threadFollow={threadFollow}
          reactions={postReactions}
          recorded={noteVote}
          pending={pending}
          error={error}
          notice={notice}
          dockOpen={dock != null}
          hasComments={comments.length > 0}
          actions={headerActions}
        />
      }
      directionalLockEnabled
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!scaleDragging}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={9}
    />
    {dock === "comment" ? (
      <CommentDock
        hp={hp}
        pending={pending}
        error={error}
        notice={notice}
        store={dockDraft}
        onPublish={sendComment}
        onSaveDraft={saveDraft}
      />
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
    <AiButton
      onPress={() =>
        navigation.navigate("Assistant", {
          postId,
          locked: note.access === "hidden",
          summary: note.summary,
          ticker: note.ticker,
          conviction: note.conviction,
          claims: note.claims,
          risks: note.risks,
          commentCount: comments.length,
        })
      }
    />
    </View>
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
