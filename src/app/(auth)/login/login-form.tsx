"use client";
import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">{dict.auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
        />
      </div>
      <div>
        <Label htmlFor="password">{dict.auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
        />
      </div>
      {state?.error && (
        <p className="rounded-md bg-state-danger-bg px-3 py-2 text-sm text-state-danger">
          {state.error === "disabled"
            ? dict.auth.accountDisabled
            : dict.auth.invalidCredentials}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? dict.auth.signingIn : dict.auth.signIn}
      </Button>
    </form>
  );
}
