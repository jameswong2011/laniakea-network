import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabase";
import { colors, radius } from "../theme";

const STAGE = require("../../assets/landing/stage.jpg");

export function LandingScreen({
  onSignUp,
  onHowItWorks,
}: {
  onSignUp?: () => void;
  onHowItWorks?: () => void;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canBack = navigation.canGoBack();

  async function signIn() {
    setPending(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);

    if (result.error) {
      setError(result.error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.picture}>
        <Image source={STAGE} accessibilityIgnoresInvertColors style={styles.stage} />
      </View>
      {canBack ? (
        <Pressable
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={[styles.back, { top: insets.top + 8 }]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      ) : null}
      <View style={[styles.form, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.kicker}>Laniakea</Text>
        <Text style={styles.title}>The floor</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error ? (
          <Text numberOfLines={2} style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          disabled={pending}
          onPress={() => void signIn()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          {pending ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonLabel}>Sign in</Text>
          )}
        </Pressable>
        {onSignUp ? (
          <Pressable onPress={onSignUp} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Create account</Text>
          </Pressable>
        ) : null}
        {onHowItWorks ? (
          <Pressable onPress={onHowItWorks} style={styles.link}>
            <Text style={styles.linkLabel}>How it works</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  picture: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  stage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "165%",
  },
  back: {
    position: "absolute",
    left: 16,
    zIndex: 2,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: "rgba(10,10,10,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  backLabel: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: "600",
  },
  dock: {
    flex: 1,
    justifyContent: "flex-end",
  },
  form: {
    paddingHorizontal: 20,
    gap: 8,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    color: colors.fg,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    paddingHorizontal: 18,
  },
  error: {
    color: colors.loss,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "600",
  },
  secondary: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
});
