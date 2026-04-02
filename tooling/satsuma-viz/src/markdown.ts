/**
 * @ref pattern matching — mirrors AT_REF_RE from @satsuma/core/nl-ref.
 * Matches @identifier, @schema.field, @ns::schema.field, and @`backtick` variants.
 */
const AT_REF_RE = /@(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*)(?:::(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))?(?:\.(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*))*/g;

/** HTML-escape special characters to prevent injection. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Wraps @ref tokens in text with `<span class="at-ref">` for visual emphasis.
 * Input is HTML-escaped first to prevent injection.
 */
export function highlightAtRefs(text: string): string {
  return escapeHtml(text).replace(AT_REF_RE, `<span class="at-ref">$&</span>`);
}

/**
 * Minimal Markdown → HTML converter for Satsuma notes.
 * Handles headings, lists, bold, italic, inline code, and paragraphs.
 * HTML in the input is escaped to prevent XSS.
 */
export function renderMarkdown(text: string): string {
  // Escape HTML special chars
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Apply inline formatting to an already-escaped string
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = text.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      output.push(`<h${level}>${inline(esc(hm[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].replace(/^[-*]\s+/, "")))}</li>`);
        i++;
      }
      output.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].replace(/^\d+\.\s+/, "")))}</li>`);
        i++;
      }
      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Blank line → paragraph break (skip)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-blank, non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      para.push(inline(esc(lines[i])));
      i++;
    }
    if (para.length > 0) {
      output.push(`<p>${para.join("<br>")}</p>`);
    }
  }

  return output.join("");
}
