import { Fragment, type ReactNode } from "react";

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** **bold** pieces of a line; everything else is plain text (never HTML, so an answer cannot inject markup). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={index} className="font-bold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * The small part of markdown the assistant is told to use: paragraphs, bullet and numbered lists, and bold.
 * It is built from React elements, so nothing the model writes can become markup.
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter((line) => line.trim() !== "");
        if (lines.length > 0 && lines.every((line) => BULLET.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-0.5 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(BULLET, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((line) => NUMBERED.test(line))) {
          return (
            <ol key={index} className="list-decimal space-y-0.5 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(NUMBERED, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index}>
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
