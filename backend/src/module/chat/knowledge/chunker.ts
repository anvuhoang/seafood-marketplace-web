export interface KnowledgeChunkDraft {
  /** Where the passage starts in its document, 0 for the first. */
  position: number;
  /** "Document title — section title", shown as the source of an answer. */
  title: string;
  /** The text that is embedded and shown to the model: the title line, then the section text. */
  content: string;
}

/** About 300 to 400 tokens of Vietnamese. A longer section is cut at paragraph boundaries. */
export const MAX_CHUNK_CHARS = 1100;

/**
 * Cuts a markdown help document into passages. The `# ` line is the document title and each `## ` section
 * becomes one passage (or several when long), so a passage always talks about one thing. Every passage starts
 * with its title, which helps both the embedding and the model know what it is about.
 */
export function chunkMarkdown(markdown: string, fallbackTitle: string): KnowledgeChunkDraft[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let documentTitle = fallbackTitle;
  const sections: Array<{ heading: string; body: string[] }> = [{ heading: '', body: [] }];

  for (const line of lines) {
    const document = line.match(/^#\s+(.+)$/);
    const section = line.match(/^##\s+(.+)$/);
    if (document && sections.length === 1 && sections[0].body.length === 0 && documentTitle === fallbackTitle) {
      documentTitle = document[1].trim();
    } else if (section) {
      sections.push({ heading: section[1].trim(), body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  const chunks: KnowledgeChunkDraft[] = [];
  for (const section of sections) {
    const text = section.body.join('\n').trim();
    if (!text) continue;
    const title = section.heading ? `${documentTitle} — ${section.heading}` : documentTitle;
    for (const part of splitByParagraph(text, MAX_CHUNK_CHARS - title.length - 2)) {
      chunks.push({ position: chunks.length, title, content: `${title}\n${part}` });
    }
  }
  return chunks;
}

/** Groups paragraphs into pieces of at most `max` characters. A single paragraph longer than that stays whole. */
function splitByParagraph(text: string, max: number): string[] {
  const parts: string[] = [];
  let current = '';
  for (const paragraph of text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)) {
    if (current && current.length + paragraph.length + 2 > max) {
      parts.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) parts.push(current);
  return parts;
}
