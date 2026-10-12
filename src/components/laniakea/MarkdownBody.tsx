import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { prepareNoteMarkdown } from "@laniakea/domain";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["src"],
      ["alt"],
      ["title"],
    ],
    a: [...(defaultSchema.attributes?.a ?? []), ["href"], ["title"], ["rel"]],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "img",
  ],
};

export function MarkdownBody({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={`forum-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ""} />
            ) : null,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {prepareNoteMarkdown(source)}
      </ReactMarkdown>
    </div>
  );
}
