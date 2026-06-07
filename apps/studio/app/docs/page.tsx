import { getDoc } from "@/lib/docs-i18n";
import { getLocale, getDict } from "@/lib/i18n/server";
import { DocRenderer } from "@/components/docs/doc-renderer";

export default async function DocsHome() {
  const locale = await getLocale();
  const doc = getDoc(locale, "getting-started");
  if (!doc) return <p className="text-muted">404</p>;
  return <DocRenderer doc={doc} help={getDict(locale).docs.help} />;
}
