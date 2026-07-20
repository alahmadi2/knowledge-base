import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";
import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return locales.includes(v as Locale) ? (v as Locale) : defaultLocale;
}

export function getDictionary(locale: Locale) {
  return locale === "ar" ? ar : en;
}
