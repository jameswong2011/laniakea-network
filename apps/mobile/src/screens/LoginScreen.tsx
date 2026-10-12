import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../supabase";
import { colors, radius } from "../theme";

export function LoginScreen({ onSignUp }: { onSignUp?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    <View style={styles.screen}>
      <Text style={styles.kicker}>Laniakea</Text>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.copy}>
        Same user as the website. Read the tape, unlock a higher room.
      </Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={pending}
        onPress={signIn}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.fg,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginTop: 8,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  error: {
    color: colors.loss,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.fg,
    minHeight: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "600",
  },
  secondary: {
    minHeight: 50,
    marginTop: 10,
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
});
