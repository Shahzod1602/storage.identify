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
              className="rounded-md border border-brand/20 bg-brand/10 px-1.5 py-0.5 font-mono text-[12.5px] text-brand"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-fg">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function DocRenderer({ doc, help }: { doc: DocPage; help: string }) {
  return (
    <article className="mx-auto max-w-3xl animate-fade-in">
      <h1 className="text-balance text-4xl font-semibold tracking-[-0.02em]">
        {doc.title}
      </h1>
      <p className="mt-3 text-pretty text-lg leading-relaxed text-secondary">
        {doc.description}
      </p>
      <hr className="mt-8 border-border" />

      {doc.sections.map((s, i) => (
        <section key={i} className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
          {s.body.map((p, j) => (
            <p key={j} className="mt-3 leading-relaxed text-secondary">
              <RichText text={p} />
            </p>
          ))}
          {s.examples?.map((ex, k) => (
            <CodeBlock key={k} code={ex.code} lang={ex.lang} title={ex.title} />
          ))}
        </section>
      ))}

      <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-sm text-secondary">
        <span>{help}</span>
      </div>
    </article>
  );
}
