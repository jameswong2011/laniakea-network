import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { colors, radius } from "../theme";
import { signUp } from "../writes";

export function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await signUp({ email, password, username, displayName, inviteCode });
    setPending(false);
    setError(result.error ?? null);
    setNotice(result.message ?? null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.copy}>Same desk as the website. An invite code snapshots the inviter’s room.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} />
      <Field label="Password" value={password} onChangeText={setPassword} secure />
      <Field label="Username" value={username} onChangeText={setUsername} />
      <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
      <Field label="Invite code" value={inviteCode} onChangeText={setInviteCode} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable disabled={pending} onPress={() => void submit()} style={styles.button}>
        {pending ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonLabel}>Create account</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={styles.input}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input: {
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 16,
    padding: 14,
    marginBottom: 14,
  },
  error: { color: colors.loss, marginBottom: 8 },
  notice: { color: colors.gain, marginBottom: 8 },
  button: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { color: colors.bg, fontSize: 16, fontWeight: "600" },
});
