import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDesk, useDeskRefresh } from "../desk";
import { useFocusRefresh } from "../focus-refresh";
import { formatWhen } from "../format";
import { loadProfile } from "../floor";
import { loadWallet, type WalletEntry } from "../library";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { Empty } from "../ui";
import {
  BUY_HP_CAP,
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
  maxBuyHpTokens,
  resolveTier,
} from "../domain";
import { buyHp, cashOutHp } from "../writes";

export function WalletScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, "Wallet">) {
  const profile = useDesk();
  const refreshDesk = useDeskRefresh();
  const [tier, setTier] = useState(profile.tier);
  const [hp, setHp] = useState(profile.current_hp);
  const [tokens, setTokens] = useState(profile.utility_tokens);
  const [amount, setAmount] = useState("1");
  const [notice, setNotice] = useState<string | null>(null);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextProfile, ledger] = await Promise.all([
        loadProfile(profile.id),
        loadWallet(profile.id),
      ]);
      setTier(nextProfile.tier);
      setHp(nextProfile.current_hp);
      setTokens(nextProfile.utility_tokens);
      setEntries(ledger);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the wallet.");
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  const { reload, refreshing, onRefresh } = useFocusRefresh(refresh);

  const room = resolveTier(tier);
  const showBuy = room === "Bronze";
  const showCashOut = room === "Masters";

  return (
    <FlatList
      style={styles.screen}
      data={entries}
      keyExtractor={(entry) => entry.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fg} />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.balances}>
            <View style={styles.balance}>
              <Text style={styles.kicker}>HP</Text>
              <Text style={styles.value}>{hp}</Text>
            </View>
            <View style={styles.balance}>
              <Text style={styles.kicker}>UTL</Text>
              <Text style={styles.value}>{tokens}</Text>
            </View>
          </View>
          {showBuy ? (
            <View style={styles.action}>
              <Text style={styles.note}>
                1 UTL buys {HP_PER_UTILITY_TOKEN} HP, up to {BUY_HP_CAP} HP.
                {maxBuyHpTokens(hp) > 0 ? ` Room for ${maxBuyHpTokens(hp)} UTL.` : ""}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                accessibilityLabel="UTL to spend"
                style={styles.amount}
              />
              <Pressable
                onPress={() => {
                  void buyHp({
                    userId: profile.id,
                    tier,
                    tokens: Number(amount),
                    currentHp: hp,
                  }).then(async (result) => {
                    setError(result.error ?? null);
                    setNotice(result.message ?? null);
                    if (!result.error) {
                      void refreshDesk();
                      await reload();
                    }
                  });
                }}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <Text style={styles.buttonLabel}>Buy HP</Text>
              </Pressable>
            </View>
          ) : null}
          {showCashOut ? (
            <View style={styles.action}>
              <Text style={styles.note}>
                Cash out in multiples of {HP_PER_UTILITY_TOKEN} HP. Keep {MASTERS_CASHOUT_RESERVE_HP} HP.
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                accessibilityLabel="HP to cash out"
                style={styles.amount}
              />
              <Pressable
                onPress={() => {
                  void cashOutHp({
                    userId: profile.id,
                    tier,
                    hp: Number(amount),
                    currentHp: hp,
                  }).then(async (result) => {
                    setError(result.error ?? null);
                    setNotice(result.message ?? null);
                    if (!result.error) {
                      void refreshDesk();
                      await reload();
                    }
                  });
                }}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <Text style={styles.buttonLabel}>Cash out HP</Text>
              </Pressable>
            </View>
          ) : null}
          {showBuy || showCashOut ? null : (
            <Text style={[styles.note, styles.noteInset]}>
              Buy HP is Bronze only. Cash out is Masters only.
            </Text>
          )}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading && entries.length === 0 ? <ActivityIndicator color={colors.fg} /> : null}
        </View>
      }
      ListEmptyComponent={loading ? null : <Empty label="No HP transactions yet." />}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => {
            if (item.postId) {
              navigation.navigate("Thread", { postId: item.postId });
            }
          }}
        >
          <View style={styles.rowTop}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={item.signedAmount < 0 ? styles.loss : styles.gain}>
              {item.signedAmount > 0 ? "+" : ""}
              {item.signedAmount} HP
            </Text>
          </View>
          <Text style={styles.meta}>{formatWhen(item.createdAt)}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          {item.postTitle ? <Text style={styles.post}>{item.postTitle}</Text> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  balances: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  balance: {
    flex: 1,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    color: colors.fg,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 4,
  },
  action: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 10,
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  noteInset: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  amount: {
    borderRadius: radius.field,
    backgroundColor: colors.bg,
    color: colors.fg,
    padding: 14,
    fontSize: 18,
    fontWeight: "600",
  },
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  notice: {
    color: colors.gain,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  error: {
    color: colors.loss,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  type: {
    color: colors.fg,
    fontSize: 14,
    textTransform: "uppercase",
  },
  gain: {
    color: colors.gain,
    fontSize: 15,
  },
  loss: {
    color: colors.loss,
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  post: {
    color: colors.fg,
    fontSize: 14,
    marginTop: 6,
  },
});
