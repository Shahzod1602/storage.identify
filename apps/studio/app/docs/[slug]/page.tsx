import { notFound } from "next/navigation";
import { DOCS, getDoc } from "@/lib/docs";
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
  const doc = getDoc(slug);
  if (!doc) notFound();
  return <DocRenderer doc={doc} />;
}
