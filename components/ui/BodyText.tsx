import type { ReactNode } from "react";

interface Props {
  body: string;
  expanded?: boolean;
  className?: string;
}

export function BodyText({ body, expanded, className = "" }: Props) {
  if (!expanded) {
    return <span className={className}>{body}</span>;
  }

  const segments = splitIntoParagraphs(body);

  return (
    <div className={className}>
      {segments.map((seg, i) => (
        <p key={i} className={i < segments.length - 1 ? "mb-4" : ""}>
          {seg}
        </p>
      ))}
    </div>
  );
}

function splitIntoParagraphs(text: string): string[] {
  const byBlankLine = text.split(/\n\s*\n+/).filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;
  const byLine = text.split("\n").filter(Boolean);
  if (byLine.length > 1) return byLine;
  return [text];
}

export function formatBodyAsSegments(body: string): ReactNode {
  const segments = splitIntoParagraphs(body);
  if (segments.length === 1) return body;

  return segments.map((seg, i) => (
    <p key={i} className={i < segments.length - 1 ? "mb-4" : ""}>
      {seg}
    </p>
  ));
}
