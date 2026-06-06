"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyText } from "@/components/feedback";

export function CodeBlock({
  code,
  lang = "bash",
  title,
}: {
  code: string;
  lang?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-border bg-[#0c0d10] shadow-pop">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-white/45">
          {title ?? lang}
        </span>
        <button
          className="text-white/45 transition hover:text-white"
          onClick={async () => {
            if (await copyText(code)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }
          }}
          aria-label="Nusxa olish"
        >
          {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-[#e6e6e6]">
        {code}
      </pre>
    </div>
  );
}
