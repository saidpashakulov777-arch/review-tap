"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export type Subscription = {
  id: string;
  owner_id: string;
  plan: string;
  status: string;
  starts_at: string;
  trial_ends_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function DashboardLayout({
  children,
  title,
  subtitle,
  actionLabel,
  onAction,
}: DashboardLayoutProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSubscription = async (userId: string) => {
      try {
        if (mounted) {
          setSubscriptionLoading(true);
        }

        const { data, error } = await supabase
          .from("subscriptions")
          .select(
            `
              id,
              owner_id,
              plan,
              status,
              starts_at,
              trial_ends_at,
              ends_at,
              created_at,
              updated_at
            `
          )
          .eq("owner_id", userId)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error("Ошибка загрузки подписки:", error);
          setSubscription(null);
          return;
        }

        setSubscription(data);
      } catch (error) {
        console.error("Не удалось загрузить подписку:", error);

        if (mounted) {
          setSubscription(null);
        }
      } finally {
        if (mounted) {
          setSubscriptionLoading(false);
        }
      }
    };

    const loadDashboard = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error || !user) {
          router.replace("/login");
          return;
        }

        setUser(user);

        await loadSubscription(user.id);
      } catch (error) {
        console.error("Ошибка загрузки кабинета:", error);

        if (mounted) {
          router.replace("/login");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setSubscription(null);
        router.replace("/login");
        return;
      }

      setUser(session.user);
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        throw error;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Ошибка выхода:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось выйти из аккаунта."
      );

      setSigningOut(false);
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />

          <p className="text-sm text-gray-400">
            Загружаем личный кабинет...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={handleCloseSidebar}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar
        user={user}
        subscription={subscription}
        subscriptionLoading={subscriptionLoading}
        isOpen={sidebarOpen}
        signingOut={signingOut}
        onClose={handleCloseSidebar}
        onSignOut={handleSignOut}
      />

      <div className="min-h-screen lg:pl-[280px]">
        <Header
          title={title}
          subtitle={subtitle}
          actionLabel={actionLabel}
          onAction={onAction}
          onOpenSidebar={handleOpenSidebar}
        />

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
          {children}
        </div>
      </div>
    </main>
  );
}