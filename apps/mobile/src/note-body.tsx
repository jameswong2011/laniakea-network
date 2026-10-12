import { memo, useMemo } from "react";
import { Image, StyleSheet } from "react-native";
import Markdown, { MarkdownIt, type RenderRules } from "react-native-markdown-display";
import { prepareNoteMarkdown } from "./domain";
import { colors, radius } from "./theme";

export const NoteBody = memo(function NoteBody({ body }: { body: string }) {
  const source = useMemo(() => prepareNoteMarkdown(body), [body]);

  if (!source) {
    return null;
  }

  return (
    <Markdown style={styles} rules={rules} markdownit={parser}>
      {source}
    </Markdown>
  );
});

const imageStyle = {
  width: "100%" as const,
  height: 220,
  marginVertical: 12,
  borderRadius: radius.card,
  backgroundColor: colors.surface,
};

const parser = MarkdownIt({ typographer: true });

const rules: RenderRules = {
  image: (node) => (
    <Image
      key={node.key}
      source={{ uri: node.attributes.src }}
      accessibilityLabel={node.attributes.alt}
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      style={imageStyle}
    />
  ),
};

const styles = StyleSheet.create({
  body: {
    color: colors.fg,
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  heading2: {
    color: colors.fg,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 6,
  },
  heading3: {
    color: colors.fg,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 4,
  },
  heading4: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  strong: {
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
  s: {
    textDecorationLine: "line-through",
  },
  link: {
    color: colors.fg,
    textDecorationLine: "underline",
  },
  blockquote: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 8,
  },
  bullet_list: {
    marginVertical: 6,
  },
  ordered_list: {
    marginVertical: 6,
  },
  list_item: {
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: colors.surface,
    color: colors.fg,
    fontFamily: "Menlo",
  },
  fence: {
    backgroundColor: colors.surface,
    color: colors.fg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.field,
    padding: 12,
  },
  code_block: {
    backgroundColor: colors.surface,
    color: colors.fg,
    borderColor: colors.border,
  },
  hr: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
  },
  thead: {},
  tbody: {},
  th: {
    color: colors.fg,
    fontWeight: "700",
    padding: 8,
    borderColor: colors.border,
  },
  tr: {
    borderColor: colors.border,
  },
  td: {
    color: colors.fg,
    padding: 8,
    borderColor: colors.border,
  },
  image: {
    borderRadius: radius.card,
  },
});
