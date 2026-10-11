import { Image, Text } from "react-native";
import { colors } from "./theme";

const IMAGE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

export function NoteBody({ body }: { body: string }) {
  const parts: { kind: "text" | "image"; value: string }[] = [];
  let last = 0;

  for (const match of body.matchAll(IMAGE)) {
    const index = match.index ?? 0;

    if (index > last) {
      parts.push({ kind: "text", value: body.slice(last, index) });
    }

    parts.push({ kind: "image", value: match[2] });
    last = index + match[0].length;
  }

  if (last < body.length) {
    parts.push({ kind: "text", value: body.slice(last) });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.kind === "image" ? (
          <Image
            key={`${part.value}-${index}`}
            source={{ uri: part.value }}
            style={{ width: "100%", height: 220, marginTop: 12, backgroundColor: colors.surface }}
            resizeMode="cover"
          />
        ) : (
          <Text key={`text-${index}`} style={{ color: colors.fg, fontSize: 16, lineHeight: 24, marginTop: 16 }}>
            {part.value.trim()}
          </Text>
        )
      )}
    </>
  );
}
