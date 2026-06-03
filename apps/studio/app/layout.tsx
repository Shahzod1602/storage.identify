import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "storagedb Studio",
  description: "Self-hosted BaaS dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body>
        <header className="border-b border-edge bg-panel">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
              storagedb <span className="text-neutral-500">Studio</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
