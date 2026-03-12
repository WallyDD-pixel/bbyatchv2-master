import { sanitizeHtml } from "@/lib/security/validation";

interface RichTextViewerProps {
  content: string | null | undefined;
  className?: string;
  /** Max length for sanitized HTML (optional). */
  maxLength?: number;
}

/**
 * Affiche un contenu texte ou HTML de manière sécurisée.
 * Si le contenu contient des balises (gras, italique, etc.), il est nettoyé et rendu en HTML.
 * Sinon il est affiché en texte brut avec conservation des retours à la ligne.
 */
export default function RichTextViewer({
  content,
  className = "",
  maxLength,
}: RichTextViewerProps) {
  if (content == null || content === "") return null;

  const trimmed = content.trim();
  if (!trimmed) return null;

  let toRender = trimmed;
  if (toRender.includes("&lt;br") && !toRender.includes("<br>")) {
    toRender = toRender.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  }
  const isHtml = toRender.includes("<");
  if (isHtml) {
    const safe = sanitizeHtml(toRender, maxLength);
    if (!safe) return null;
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return <div className={`whitespace-pre-line ${className}`}>{content}</div>;
}
