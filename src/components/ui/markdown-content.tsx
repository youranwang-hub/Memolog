import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function safeHref(value: string) {
  try {
    const url = new URL(value, "https://memolog.local");
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function renderInline(value: string): ReactNode[] {
  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a key={index} href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {link[1]}
        </a>
      ) : link[1];
    }
    return part;
  });
}

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = (`h${heading[1].length}` as "h1" | "h2" | "h3");
      blocks.push(<Tag key={index} className={cn("font-semibold text-foreground", Tag === "h1" && "text-xl", Tag === "h2" && "text-lg", Tag === "h3" && "text-base")}>{renderInline(heading[2])}</Tag>);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={index} className="border-border" />);
      index += 1;
      continue;
    }

    const listMatch = line.match(/^\s*([-*+] |\d+\. )(.+)$/);
    if (listMatch) {
      const ordered = /^\d+\. /.test(listMatch[1]);
      const items: ReactNode[] = [];
      const start = index;
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-*+] |\d+\. )(.+)$/);
        if (!item || /^\d+\. /.test(item[1]) !== ordered) break;
        items.push(<li key={index}>{renderInline(item[2])}</li>);
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={start} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>{items}</List>);
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={index} className="border-l-2 border-stone-300 pl-3 text-muted-foreground">{renderInline(line.slice(2))}</blockquote>);
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    const start = index;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^\s*([-*+] |\d+\. )|^> /.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={start} className="whitespace-pre-wrap">{renderInline(paragraph.join("\n"))}</p>);
  }

  return <div className={cn("space-y-3 text-sm leading-relaxed", className)}>{blocks}</div>;
}
