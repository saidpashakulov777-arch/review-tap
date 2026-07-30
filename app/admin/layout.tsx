"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AdminAccessResponse = {
  success: boolean;
  admin?: {
    userId: string;
    email: string;
    role: "owner" | "admin" | "support";
  };
  message?: string;
};

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.access_token
        ) {
          router.replace(
            `/login?next=${encodeURIComponent(
              pathname,
            )}`,
          );

          return;
        }

        const response = await fetch(
          "/api/admin/access",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as AdminAccessResponse;

        if (!mounted) {
          return;
        }

        if (response.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(
              pathname,
            )}`,
          );

          return;
        }

        if (response.status === 403) {
          router.replace("/dashboard");
          return;
        }

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Не удалось проверить доступ.",
          );
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Не удалось открыть админ-панель.",
        );
      } finally {
        if (mounted) {
          setCheckingAccess(false);
        }
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

          <p className="mt-4 text-sm text-gray-400">
            Проверяем права администратора...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-5 text-white">
        <div className="w-full max-w-md rounded-[28px] border border-red-500/20 bg-red-500/10 p-7 text-center">
          <h1 className="text-xl font-bold text-red-200">
            Админ-панель не открылась
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-200/70">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white"
          >
            Попробовать снова
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}