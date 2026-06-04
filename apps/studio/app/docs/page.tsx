import { getDoc } from "@/lib/docs";
import { DocRenderer } from "@/components/docs/doc-renderer";

export default function DocsHome() {
  const doc = getDoc("getting-started");
  if (!doc) return <p className="text-muted">Hujjat topilmadi.</p>;
  return <DocRenderer doc={doc} />;
}
