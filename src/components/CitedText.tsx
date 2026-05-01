import { cn } from "@/lib/utils";

/**
 * Parses AI response text and renders [Source: ...] citations as inline badges.
 *
 * Citation format the AI uses:
 *   [Source: Constitution, Article III, Section 2]
 *   [Source: Election Rules, Section 4.4]
 *   [Source: Marquette Wire, "Title", April 2026]
 */

const SOURCE_COLORS: Array<{ test: RegExp; cls: string }> = [
  { test: /constitution/i,        cls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { test: /by.?law/i,             cls: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" },
  { test: /election/i,            cls: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
  { test: /financial|budget/i,    cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
  { test: /senate|standing/i,     cls: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800" },
  { test: /senior.?speaker/i,     cls: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800" },
  { test: /recognition/i,         cls: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800" },
  { test: /wire|today|marquette/i, cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
];

function citationClass(source: string): string {
  for (const { test, cls } of SOURCE_COLORS) {
    if (test.test(source)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

// Split text on [Source: ...] patterns, preserving the citation content
const CITATION_RE = /\[Source:\s*([^\]]+)\]/g;

interface Segment {
  type: "text" | "citation";
  content: string;
}

function parse(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: text.slice(last, match.index) });
    }
    segments.push({ type: "citation", content: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }
  return segments;
}

interface CitedTextProps {
  text: string;
  className?: string;
  /** When true, wraps in a <p> with whitespace-pre-wrap. Default: inline spans only. */
  block?: boolean;
}

export function CitedText({ text, className, block = false }: CitedTextProps) {
  const segments = parse(text);

  const inner = segments.map((seg, i) =>
    seg.type === "citation" ? (
      <span
        key={i}
        title={seg.content}
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border align-middle mx-0.5",
          citationClass(seg.content),
        )}
      >
        <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 2h6M3 5h6M3 8h4" strokeLinecap="round"/>
        </svg>
        {seg.content}
      </span>
    ) : (
      <span key={i}>{seg.content}</span>
    )
  );

  if (block) {
    return (
      <p className={cn("whitespace-pre-wrap leading-relaxed", className)}>
        {inner}
      </p>
    );
  }
  return <span className={className}>{inner}</span>;
}

/** Convenience wrapper: renders multi-line text where each line may contain citations. */
export function CitedBlock({ text, className }: { text: string; className?: string }) {
  // Split into lines to preserve whitespace-pre-wrap behaviour faithfully
  const lines = text.split("\n");
  return (
    <div className={cn("space-y-0 leading-relaxed", className)}>
      {lines.map((line, i) => (
        <div key={i} className={line.trim() === "" ? "h-3" : undefined}>
          {line.trim() !== "" && <CitedText text={line} />}
        </div>
      ))}
    </div>
  );
}
