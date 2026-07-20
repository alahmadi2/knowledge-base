import type { Metadata } from "next";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { dirOf } from "@/lib/i18n/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: { default: dict.app.name, template: `%s — ${dict.app.name}` },
    description: dict.auth.welcomeLine,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="min-h-screen bg-surface-page font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
