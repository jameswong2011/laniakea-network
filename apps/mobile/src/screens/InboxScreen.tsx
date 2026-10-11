import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDesk } from "../desk";
import { formatWhen } from "../format";
import { loadInbox, markInboxRead, type InboxItem } from "../library";
import { colors, radius } from "../theme";
import type { AppStackParamList } from "../types";
import { Empty } from "../ui";

export function InboxScreen({
  navigation,
}: NativeStackScreenProps<AppStackParamList, "Inbox">) {
  const profile = useDesk();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const unread = items.filter((item) => !item.readAt).length;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await loadInbox(profile.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the inbox.");
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={styles.screen}>
      {unread > 0 ? (
        <Pressable
          style={styles.mark}
          onPress={() => {
            void markInboxRead(profile.id).then(refresh);
          }}
        >
          <Text style={styles.markLabel}>Mark read</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.fg} style={styles.spinner} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.fg} />
          }
          ListEmptyComponent={<Empty label="No replies yet." />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (item.postId) {
                  navigation.navigate("Thread", { postId: item.postId });
                }
              }}
            >
              <Text style={item.readAt ? styles.read : styles.unread}>{item.copy}</Text>
              <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mark: {
    alignSelf: "flex-start",
    minHeight: 36,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  markLabel: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: colors.loss,
    paddingHorizontal: 16,
  },
  spinner: {
    marginTop: 32,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: {
    color: colors.fg,
    fontSize: 15,
    lineHeight: 21,
  },
  read: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  when: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
