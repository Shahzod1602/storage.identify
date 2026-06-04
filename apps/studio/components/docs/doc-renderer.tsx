import { CodeBlock } from "./code-block";
import type { DocPage } from "@/lib/docs-types";

/** `inline code` va **bold** ni oddiy ko'rinishda render qiladi. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[12.5px] text-brand"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-medium text-fg">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function DocRenderer({ doc }: { doc: DocPage }) {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-3 text-lg text-muted">{doc.description}</p>

      {doc.sections.map((s, i) => (
        <section key={i} className="mt-10">
          <h2 className="text-xl font-medium">{s.heading}</h2>
          {s.body.map((p, j) => (
            <p key={j} className="mt-3 leading-relaxed text-muted">
              <RichText text={p} />
            </p>
          ))}
          {s.examples?.map((ex, k) => (
            <CodeBlock key={k} code={ex.code} lang={ex.lang} title={ex.title} />
          ))}
        </section>
      ))}
    </article>
  );
}
