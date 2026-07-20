import { getLocale, getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <main className="flex min-h-screen">
      {/* اللوحة الفحمية — الهوية */}
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand p-10 lg:flex">
        <div className="text-sm font-medium tracking-wide text-brand-accent">
          {dict.app.company}
        </div>
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-relaxed text-white">
            {dict.app.name}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-accent">
            {dict.auth.welcomeLine}
          </p>
        </div>
        <div className="h-1 w-24 rounded-full bg-brand-accent" />
      </aside>

      <section className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-medium text-brand-muted">{dict.app.company}</p>
            <h1 className="mt-1 text-xl font-bold text-ink">{dict.app.name}</h1>
          </div>
          <h2 className="text-lg font-semibold text-ink">{dict.auth.signIn}</h2>
          <div className="mt-6">
            <LoginForm dict={dict} />
          </div>
        </div>
      </section>
    </main>
  );
}
