"use client";

import { useTranslation } from "react-i18next";

export default function AuthLoading() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10 text-sm text-muted-foreground">
      {t("content.Loading auth form…")}
    </div>
  );
}
