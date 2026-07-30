"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "client";

type RoleGuardProps = {
  children: ReactNode;
  allowedRole: UserRole;
};

export default function RoleGuard({
  children,
  allowedRole,
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error(
            profileError?.message || "Профиль пользователя не найден."
          );
        }

        const role = profile.role as UserRole;

        if (role !== allowedRole) {
          if (role === "admin") {
            router.replace("/admin");
          } else {
            router.replace("/dashboard");
          }

          return;
        }

        if (isMounted) {
          setIsAllowed(true);
        }
      } catch (error) {
        console.error("Ошибка проверки доступа:", error);

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Не удалось проверить доступ."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [allowedRole, pathname, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

          <p className="mt-5 text-sm text-slate-400">
            Проверяем доступ...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h1 className="text-xl font-bold">Ошибка доступа</h1>

          <p className="mt-3 text-sm leading-6 text-red-200">
            {errorMessage}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Попробовать снова
          </button>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}