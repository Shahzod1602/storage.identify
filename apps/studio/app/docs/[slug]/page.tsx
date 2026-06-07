import { notFound } from "next/navigation";
import { DOCS } from "@/lib/docs";
import { getDoc } from "@/lib/docs-i18n";
import { getLocale, getDict } from "@/lib/i18n/server";
import { DocRenderer } from "@/components/docs/doc-renderer";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export default async function DocPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const doc = getDoc(locale, slug);
  if (!doc) notFound();
  return <DocRenderer doc={doc} help={getDict(locale).docs.help} />;
}
