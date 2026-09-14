"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearStoredAuthSession, getStoredAuthToken, getStoredAuthUser, type AuthUser } from "@/lib/auth-client";
import { useTranslation } from "react-i18next";

export function AuthNav() {
  const { t } = useTranslation();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setToken(getStoredAuthToken());
    setUser(getStoredAuthUser());
  }, []);

  function handleLogout() {
    clearStoredAuthSession();
    setToken(null);
    setUser(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {token && user ? (
        <>
          <span className="text-sm text-muted-foreground">{user.identifier}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            {t("content.Log out")}
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm">
          <Link href="/auth?mode=signin">{t("content.Sign In")}</Link>
        </Button>
      )}
    </div>
  );
}
