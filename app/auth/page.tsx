"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistAuthSession } from "@/lib/auth-client";

export default function AuthPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? t("content.Authentication failed."));
      }

      persistAuthSession(result.token, result.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.Authentication failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "signup" ? t("content.Create an account") : t("content.Sign in")}</CardTitle>
          <CardDescription>
            {t("content.Use an email or phone number with a password to continue.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="identifier">{t("content.Email or phone number")}</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={t("content.name@example.com or +1 555 123 4567")}
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("content.Password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("content.Please wait…")
                : mode === "signup"
                  ? t("content.Create account")
                  : t("content.Sign in")}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
            >
              {mode === "signup"
                ? t("content.Already have an account? Sign in")
                : t("content.Need an account? Sign up")}
            </button>
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("content.Back home")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
