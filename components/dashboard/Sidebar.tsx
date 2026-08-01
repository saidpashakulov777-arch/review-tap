"use client";

import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Subscription } from "@/components/dashboard/DashboardLayout";

const navigation = [
  {
    name: "Обзор",
    icon: "⌂",
    href: "/dashboard",
  },
  {
    name: "Рестораны",
    icon: "▦",
    href: "/dashboard/restaurants",
  },
  {
    name: "Филиалы",
    icon: "⌖",
    href: "/dashboard/branches",
  },
  {
    name: "Аналитика",
    icon: "⌁",
    href: "/dashboard/analytics",
  },
  {
    name: "Настройки",
    icon: "⚙",
    href: "/dashboard/settings",
  },
];

type SidebarProps = {
  user: User | null;
  subscription: Subscription | null;
  subscriptionLoading: boolean;
  isOpen: boolean;
  signingOut: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

const planNames: Record<string, string> = {
  starter: "Starter",
  business: "Business",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusNames: Record<string, string> = {
  trialing: "Пробный период",
  active: "Активен",
  past_due: "Нужна оплата",
  cancelled: "Отменён",
  expired: "Истёк",
};

const statusClasses: Record<string, string> = {
  trialing:
    "border-blue-500/20 bg-blue-500/10 text-blue-300",
  active:
    "border-green-500/20 bg-green-500/10 text-green-300",
  past_due:
    "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  cancelled:
    "border-red-500/20 bg-red-500/10 text-red-300",
  expired:
    "border-gray-500/20 bg-gray-500/10 text-gray-300",
};

function formatDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getRemainingTrialDays(date: string | null) {
  if (!date) {
    return null;
  }

  const now = new Date();
  const trialEnd = new Date(date);

  const difference = trialEnd.getTime() - now.getTime();
  const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

  return Math.max(days, 0);
}

export default function Sidebar({
  user,
  subscription,
  subscriptionLoading,
  isOpen,
  signingOut,
  onClose,
  onSignOut,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Пользователь";

  const planName = subscription
    ? planNames[subscription.plan] || subscription.plan
    : "Нет тарифа";

  const statusName = subscription
    ? statusNames[subscription.status] || subscription.status
    : "Не подключён";

  const statusClass = subscription
    ? statusClasses[subscription.status] ||
      "border-gray-500/20 bg-gray-500/10 text-gray-300"
    : "border-gray-500/20 bg-gray-500/10 text-gray-300";

  const trialDays =
    subscription?.status === "trialing"
      ? getRemainingTrialDays(subscription.trial_ends_at)
      : null;

  const trialEndDate = formatDate(subscription?.trial_ends_at ?? null);
  const subscriptionEndDate = formatDate(
    subscription?.ends_at ?? null
  );

  const handleNavigation = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-white/10 bg-[#09090c]/95 p-5 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 font-bold shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            R
          </span>

          <span>
            <span className="block text-lg font-semibold tracking-tight">
              ReviewTap
            </span>

            <span className="block text-xs text-gray-500">
              Business Dashboard
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:bg-white/[0.08] lg:hidden"
        >
          ×
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-300">
          Текущий тариф
        </p>

        {subscriptionLoading ? (
          <div className="mt-4">
            <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {planName}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {subscription?.status === "trialing" &&
                  trialDays !== null
                    ? trialDays > 0
                      ? `Осталось дней: ${trialDays}`
                      : "Пробный период завершён"
                    : subscription?.status === "active"
                      ? "Оплаченный тариф"
                      : subscription
                        ? "Статус подписки"
                        : "Подписка отсутствует"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusClass}`}
              >
                {statusName}
              </span>
            </div>

            {subscription?.status === "trialing" && trialEndDate && (
              <p className="mt-3 border-t border-white/10 pt-3 text-xs text-gray-500">
                Пробный период до{" "}
                <span className="text-gray-300">
                  {trialEndDate}
                </span>
              </p>
            )}

            {subscription?.status !== "trialing" &&
              subscriptionEndDate && (
                <p className="mt-3 border-t border-white/10 pt-3 text-xs text-gray-500">
                  Действует до{" "}
                  <span className="text-gray-300">
                    {subscriptionEndDate}
                  </span>
                </p>
              )}
          </>
        )}
      </div>

      <nav className="mt-8 space-y-2">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
          Управление
        </p>

        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavigation(item.href)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "border border-purple-500/20 bg-purple-500/10 text-white"
                  : "border border-transparent text-gray-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-purple-500/15 text-purple-300"
                    : "bg-white/[0.04] text-gray-500"
                }`}
              >
                {item.icon}
              </span>

              <span>{item.name}</span>

              {isActive && (
                <span className="ml-auto h-2 w-2 rounded-full bg-purple-400" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/20 text-sm font-semibold text-purple-200">
              {fullName.slice(0, 1).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {fullName}
              </p>

              <p className="truncate text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Выходим..." : "Выйти из аккаунта"}
          </button>
        </div>
      </div>
    </aside>
  );
}