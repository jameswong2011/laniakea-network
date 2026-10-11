import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DEFAULT_STAKE_HP,
  DEFAULT_UNLOCK_RATE_MULTIPLE,
  MAX_STAKE_HP,
  UNLOCK_RATE_MULTIPLE_MAX,
  UNLOCK_RATE_MULTIPLE_MIN,
} from "../domain";
import { useDesk } from "../desk";
import { SUB_TOPICS } from "../feed-query";
import { pickImage } from "../media";
import { supabase } from "../supabase";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { VoteScale } from "../vote-scale";
import { publishNote, saveNoteDraft, uploadResearchImage } from "../writes";

export function ComposeScreen({
  navigation,
  route,
}: NativeStackScreenProps<AppStackParamList, "Compose">) {
  const profile = useDesk();
  const insets = useSafeAreaInsets();
  const draftId = route.params?.draftId;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subTopic, setSubTopic] = useState<string>(SUB_TOPICS[0]);
  const stakeMax = Math.min(MAX_STAKE_HP, Math.max(1, profile.current_hp));
  const [stake, setStake] = useState(() =>
    Math.min(DEFAULT_STAKE_HP, Math.min(MAX_STAKE_HP, Math.max(1, profile.current_hp)))
  );
  const [multiple, setMultiple] = useState(DEFAULT_UNLOCK_RATE_MULTIPLE);
  const [scaleDragging, setScaleDragging] = useState(false);
  const [savedId, setSavedId] = useState(draftId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sectorsOpen, setSectorsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      fullScreenGestureEnabled: false,
      gestureEnabled: !scaleDragging,
    });
  }, [navigation, scaleDragging]);

  useEffect(() => {
    if (!draftId) {
      return;
    }

    void supabase
      .from("content_drafts")
      .select("title, body, sub_topic, stake_hp, unlock_rate_multiple")
      .eq("id", draftId)
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          return;
        }

        setTitle((data.title as string) ?? "");
        setBody((data.body as string) ?? "");
        if (data.sub_topic) {
          setSubTopic(data.sub_topic as string);
        }
        if (data.stake_hp) {
          setStake(
            Math.min(
              MAX_STAKE_HP,
              Math.max(1, Number(data.stake_hp))
            )
          );
        }
        if (data.unlock_rate_multiple) {
          setMultiple(
            Math.min(
              UNLOCK_RATE_MULTIPLE_MAX,
              Math.max(UNLOCK_RATE_MULTIPLE_MIN, Number(data.unlock_rate_multiple))
            )
          );
        }
      });
  }, [draftId, profile.id]);

  async function save() {
    setPending(true);
    setError(null);
    const result = await saveNoteDraft({
      userId: profile.id,
      draftId: savedId || undefined,
      title,
      body,
      subTopic,
      stakeHp: stake,
      unlockRateMultiple: multiple,
    });
    setPending(false);
    setError(result.error ?? null);
    setNotice(result.message ?? null);
    if (result.id) {
      setSavedId(result.id);
    }
  }

  async function publish() {
    setPending(true);
    setError(null);
    const result = await publishNote({
      userId: profile.id,
      title,
      body,
      subTopic,
      stakeHp: stake,
      unlockRateMultiple: multiple,
      draftId: savedId || undefined,
    });
    setPending(false);
    setError(result.error ?? null);
    setNotice(result.message ?? null);

    if (result.id && !result.error) {
      navigation.replace("Thread", { postId: result.id });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.copy}>
        Publishing stakes HP. Default {DEFAULT_STAKE_HP}, maximum {MAX_STAKE_HP}. You have {profile.current_hp} HP.
      </Text>
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <Text style={styles.label}>Sector</Text>
      <Pressable onPress={() => setSectorsOpen(true)} style={styles.sector}>
        <Text style={styles.sectorLabel}>{subTopic}</Text>
        <Text style={styles.sectorAction}>Change</Text>
      </Pressable>
      <Text style={styles.label}>Body</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        style={styles.area}
        placeholder="The note"
        placeholderTextColor={colors.muted}
      />
      <Pressable
        onPress={() => {
          void pickImage().then(async (picked) => {
            if (!picked.uri) {
              setError(picked.error);
              return;
            }
            const uploaded = await uploadResearchImage(profile.id, picked.uri, picked.mime);
            setError(uploaded.error);
            if (uploaded.url) {
              setBody((current) => `${current}\n![](${uploaded.url})\n`);
              setNotice("Image attached.");
            }
          });
        }}
        style={styles.secondary}
      >
        <Text style={styles.secondaryLabel}>Attach image</Text>
      </Pressable>
      <Text style={styles.label}>Stake HP</Text>
      <VoteScale
        value={stake}
        minimum={1}
        maximum={stakeMax}
        limit={stakeMax}
        disabled={pending || profile.current_hp < 1}
        label="Stake HP"
        onChange={setStake}
        onActiveChange={setScaleDragging}
      />
      {profile.tier !== "Bronze" ? (
        <>
          <Text style={styles.label}>Unlock rate</Text>
          <VoteScale
            value={multiple}
            minimum={UNLOCK_RATE_MULTIPLE_MIN}
            maximum={UNLOCK_RATE_MULTIPLE_MAX}
            limit={UNLOCK_RATE_MULTIPLE_MAX}
            disabled={pending}
            suffix="×"
            label="Unlock rate"
            onChange={setMultiple}
            onActiveChange={setScaleDragging}
          />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable disabled={pending} onPress={() => void save()} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>{pending ? "Working" : "Save draft"}</Text>
      </Pressable>
      <Pressable disabled={pending} onPress={() => void publish()} style={styles.button}>
        {pending ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonLabel}>Publish</Text>}
      </Pressable>
    </ScrollView>
    <Modal visible={sectorsOpen} animationType="slide" transparent onRequestClose={() => setSectorsOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setSectorsOpen(false)}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Sector</Text>
            <Pressable onPress={() => setSectorsOpen(false)} hitSlop={8} style={styles.done}>
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          </View>
          <ScrollView>
            {SUB_TOPICS.map((topic) => (
              <Pressable
                key={topic}
                style={styles.choice}
                onPress={() => {
                  setSubTopic(topic);
                  setSectorsOpen(false);
                }}
              >
                <Text style={topic === subTopic ? styles.topicOn : styles.topicOff}>{topic}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 8 },
  input: {
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    padding: 14,
    marginBottom: 8,
  },
  area: {
    minHeight: 160,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    padding: 14,
    textAlignVertical: "top",
  },
  sector: {
    minHeight: 52,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectorLabel: { color: colors.fg, fontSize: 16, flex: 1 },
  sectorAction: { color: colors.muted, fontSize: 15 },
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
  topicOn: { color: colors.fg, fontSize: 16 },
  topicOff: { color: colors.muted, fontSize: 16 },
  error: { color: colors.loss, marginTop: 8 },
  notice: { color: colors.gain, marginTop: 8 },
  secondary: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { color: colors.fg, fontSize: 15, fontWeight: "600" },
  button: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { color: colors.bg, fontSize: 16, fontWeight: "600" },
});
