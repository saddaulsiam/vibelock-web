import React from "react";
import { ExternalLink } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; url: string };

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string };

const INLINE_REGEX =
  /(\[([^\]]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s<]+)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.substring(lastIndex, match.index) });
    }

    if (match[1]) {
      // [label](url)
      tokens.push({ type: "link", label: match[2], url: match[3] });
    } else if (match[4]) {
      // Bare URL: https://...
      tokens.push({ type: "link", label: match[4], url: match[4] });
    } else if (match[5]) {
      // **bold**
      tokens.push({ type: "bold", value: match[6] });
    } else if (match[7]) {
      // *italic*
      tokens.push({ type: "italic", value: match[8] });
    } else if (match[9]) {
      // `code`
      tokens.push({ type: "code", value: match[10] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.substring(lastIndex) });
  }

  return tokens;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, i) => {
    switch (token.type) {
      case "bold":
        return (
          <strong key={i} className="font-bold text-vl-white-50">
            {token.value}
          </strong>
        );
      case "italic":
        return (
          <em key={i} className="italic text-vl-white-200">
            {token.value}
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            className="rounded-xs border border-vl-dark-700 bg-vl-dark-950 px-1 py-0.5 font-mono text-3xs text-vl-cyan-300"
          >
            {token.value}
          </code>
        );
      case "link": {
        // Security sanitization: Allow safe internal relative URLs (/...) or safe external HTTPS/HTTP URLs.
        // Blocks javascript:, data:, vbscript:, etc.
        const trimmedUrl = token.url.trim();
        const isInternal = trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//");
        const isSafeExternal = trimmedUrl.startsWith("https://") || trimmedUrl.startsWith("http://");

        if (!isInternal && !isSafeExternal) {
          return <React.Fragment key={i}>{token.label}</React.Fragment>;
        }

        const isExternal = isSafeExternal;

        return (
          <a
            key={i}
            href={trimmedUrl}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-0.5 font-semibold text-vl-cyan-400 underline decoration-vl-cyan-400/50 underline-offset-2 transition-colors hover:text-vl-cyan-300 hover:decoration-vl-cyan-300 break-all cursor-pointer"
          >
            <span>{token.label}</span>
            {isExternal && (
              <ExternalLink className="size-2.5 shrink-0 inline opacity-70" aria-hidden="true" />
            )}
          </a>
        );
      }
      case "text":
      default:
        return <React.Fragment key={i}>{token.value}</React.Fragment>;
    }
  });
}

function parseBlocks(rawText: string): Block[] {
  const normalized = rawText.replace(/\\n/g, "\n");
  const lines = normalized.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentList: Block | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Heading: ### or ## or #
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // Unordered list item: - or * or •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ul", items: [] };
      }
      (currentList as { type: "ul"; items: string[] }).items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list item (English digits 1. or Bengali digits ১.)
    const orderedMatch = trimmed.match(/^([0-9]+|[০-৯]+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== "ol") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ol", items: [] };
      }
      (currentList as { type: "ol"; items: string[] }).items.push(orderedMatch[2]);
      continue;
    }

    // Regular line
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
    blocks.push({ type: "p", text: line });
  }

  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-1.5 text-xs leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading":
            return (
              <h4 key={idx} className="mt-1.5 mb-0.5 font-bold text-vl-white-100 text-xs">
                {renderInline(block.text)}
              </h4>
            );
          case "ul":
            return (
              <ul key={idx} className="my-1 space-y-0.5 pl-4 list-disc marker:text-vl-cyan-400">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={idx}
                className="my-1 space-y-0.5 pl-4 list-decimal marker:text-vl-cyan-400 font-medium"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="font-normal">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={idx} className="break-words">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
