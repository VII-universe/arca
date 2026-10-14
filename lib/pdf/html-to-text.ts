// Converts the HTML the rich-text editor stores (Chapter.content,
// MessageContent.textBody) into plain paragraphs for the PDF export, which
// can't render arbitrary HTML. Lossy by design — formatting (bold, images,
// links) is dropped, only paragraph breaks are preserved.
export function htmlToParagraphs(html: string | null | undefined): string[] {
  if (!html) return [];

  const withBreaks = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const stripped = withBreaks.replace(/<[^>]+>/g, "");

  const decoded = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");

  return decoded
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);
}
