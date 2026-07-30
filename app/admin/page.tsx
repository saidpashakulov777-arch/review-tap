"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AdminRole =
  | "owner"
  | "admin"
  | "support";

type CustomerSubscription = {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  paymentProvider: string | null;
};

type CustomerPayment = {
  id: string;
  plan: string;
  provider: string;
  status: string;
  amountUzs: number;
  paidAt: string | null;
  createdAt: string;
};

type Customer = {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  subscription: CustomerSubscription | null;
  lastPayment: CustomerPayment | null;
};

type CustomersResponse = {
  success: boolean;

  admin?: {
    userId: string;
    role: AdminRole;
  };

  customers?: Customer[];
  message?: string;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const navigation = [
  {
    name: "Обзор",
    href: "/admin",
    icon: "⌂",
  },
  {
    name: "Клиенты",
    href: "/admin/customers",
    icon: "♟",
  },
  {
    name: "Рестораны",
    href: "/admin/restaurants",
    icon: "▦",
  },
  {
    name: "Филиалы",
    href: "/admin/branches",
    icon: "⌖",
  },
  {
    name: "Аналитика",
    href: "/admin/analytics",
    icon: "⌁",
  },
];

export default function AdminPage() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [adminRole, setAdminRole] =
    useState<AdminRole | null>(null);

  const [adminEmail, setAdminEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    void loadDashboard(false);
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (
      error ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          "/admin",
        )}`,
      );

      return null;
    }

    setAdminEmail(
      session.user.email ?? "",
    );

    return session.access_token;
  }

  async function loadDashboard(
    isRefresh: boolean,
  ) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setMessage(null);

    try {
      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        "/api/admin/customers",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${accessToken}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as CustomersResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin",
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
            "Не удалось загрузить админ-панель.",
        );
      }

      setCustomers(
        result.customers ?? [],
      );

      setAdminRole(
        result.admin?.role ?? null,
      );
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить данные.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось выйти из аккаунта.",
      });

      setSigningOut(false);
    }
  }

  const statistics = useMemo(() => {
    let active = 0;
    let trialing = 0;
    let inactive = 0;

    for (const customer of customers) {
      const status =
        getCustomerStatus(customer);

      if (status === "active") {
        active += 1;
      } else if (status === "trialing") {
        trialing += 1;
      } else {
        inactive += 1;
      }
    }

    return {
      total: customers.length,
      active,
      trialing,
      inactive,
    };
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          customer.email,
          customer.fullName,
          customer.companyName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .slice(0, 6);
  }, [customers, search]);

  if (loading) {
    return <AdminLoading />;
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-220px] top-[-200px] h-[550px] w-[550px] rounded-full bg-blue-600/10 blur-[150px]" />

        <div className="absolute bottom-[-240px] right-[-180px] h-[550px] w-[550px] rounded-full bg-purple-600/10 blur-[160px]" />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#080d19] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <Link
            href="/admin"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black shadow-lg shadow-blue-600/20">
              R
            </div>

            <div>
              <p className="font-bold">
                ReviewTap
              </p>

              <p className="text-xs text-gray-500">
                Админ-панель
              </p>
            </div>
          </Link>

          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const active =
              item.href === "/admin";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  setSidebarOpen(false)
                }
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${
                    active
                      ? "bg-white/15"
                      : "bg-white/[0.04]"
                  }`}
                >
                  {item.icon}
                </span>

                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="truncate text-sm font-medium text-white">
              {adminEmail ||
                "Администратор"}
            </p>

            <p className="mt-1 text-xs text-purple-300">
              {formatAdminRole(
                adminRole,
              )}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/[0.06]"
          >
            Открыть кабинет
          </Link>

          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut
              ? "Выходим..."
              : "Выйти"}
          </button>
        </div>
      </aside>

      <div className="relative min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Открыть меню"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl lg:hidden"
              >
                ☰
              </button>

              <div>
                <p className="text-xs text-gray-500">
                  Панель управления
                </p>

                <h1 className="mt-1 text-xl font-bold">
                  Администратор
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={refreshing}
                onClick={() =>
                  void loadDashboard(true)
                }
                className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:block"
              >
                {refreshing
                  ? "Обновляем..."
                  : "Обновить"}
              </button>

              <Link
                href="/admin/customers"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Управление клиентами
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
          {message && (
            <div
              className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
                message.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/20 bg-red-500/10 text-red-200"
              }`}
            >
              <p>{message.text}</p>

              <button
                type="button"
                aria-label="Закрыть сообщение"
                onClick={() =>
                  setMessage(null)
                }
                className="text-lg leading-none opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>
          )}

          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
              Панель владельца
            </p>

            <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Добро пожаловать
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
                  Управляй клиентами,
                  подписками, ресторанами и
                  филиалами ReviewTap.
                </p>
              </div>

              <Link
                href="/admin/customers"
                className="inline-flex w-fit items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
              >
                + Активировать подписку
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Всего клиентов"
              value={statistics.total}
              description="Все зарегистрированные аккаунты"
              icon="👥"
            />

            <StatCard
              title="Активные подписки"
              value={statistics.active}
              description="Starter, Pro и Business"
              icon="✓"
            />

            <StatCard
              title="Пробный период"
              value={statistics.trialing}
              description="Клиенты на бесплатном Trial"
              icon="◷"
            />

            <StatCard
              title="Неактивные"
              value={statistics.inactive}
              description="Истёкшие или отключённые"
              icon="!"
            />
          </section>

          <section className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  Клиенты
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Последние зарегистрированные
                  аккаунты ReviewTap
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Поиск клиента..."
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500"
                />

                <Link
                  href="/admin/customers"
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/[0.08]"
                >
                  Все клиенты
                </Link>
              </div>
            </div>

            {visibleCustomers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-2xl">
                  👤
                </div>

                <h4 className="mt-5 text-lg font-bold">
                  Клиенты не найдены
                </h4>

                <p className="mt-2 text-sm text-gray-500">
                  Зарегистрированные клиенты
                  появятся в этом разделе.
                </p>
              </div>
            ) : (
              <div>
                <div className="hidden grid-cols-[minmax(230px,1.5fr)_150px_150px_170px_130px] gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600 lg:grid">
                  <span>Клиент</span>
                  <span>Тариф</span>
                  <span>Статус</span>
                  <span>Окончание</span>
                  <span>Действие</span>
                </div>

                <div className="divide-y divide-white/10">
                  {visibleCustomers.map(
                    (customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <QuickLink
              title="Все рестораны"
              description="Просмотреть рестораны всех клиентов"
              href="/admin/restaurants"
              icon="▦"
            />

            <QuickLink
              title="Все филиалы"
              description="Управление филиалами ресторанов"
              href="/admin/branches"
              icon="⌖"
            />

            <QuickLink
              title="Общая аналитика"
              description="Статистика ReviewTap"
              href="/admin/analytics"
              icon="⌁"
            />
          </section>
        </div>
      </div>
    </main>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: string;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-4 text-3xl font-black">
            {value}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-lg text-blue-300">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-600">
        {description}
      </p>
    </article>
  );
}

function CustomerRow({
  customer,
}: {
  customer: Customer;
}) {
  const status =
    getCustomerStatus(customer);

  const plan =
    customer.subscription?.plan ??
    "trial";

  const endDate =
    customer.subscription
      ?.currentPeriodEnd ??
    customer.subscription?.trialEndsAt ??
    null;

  return (
    <div className="grid gap-5 px-6 py-5 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(230px,1.5fr)_150px_150px_170px_130px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600/20 font-bold text-blue-300">
            {getCustomerInitial(customer)}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold">
              {customer.companyName ||
                customer.fullName ||
                "Без названия"}
            </p>

            <p className="mt-1 truncate text-sm text-gray-500">
              {customer.email}
            </p>
          </div>
        </div>
      </div>

      <div>
        <MobileLabel text="Тариф" />

        <PlanBadge plan={plan} />
      </div>

      <div>
        <MobileLabel text="Статус" />

        <StatusBadge status={status} />
      </div>

      <div>
        <MobileLabel text="Окончание" />

        <p className="text-sm text-gray-300">
          {formatDate(endDate)}
        </p>

        {customer.lastPayment && (
          <p className="mt-1 text-xs text-gray-600">
            {formatUzs(
              customer.lastPayment
                .amountUzs,
            )}
          </p>
        )}
      </div>

      <div>
        <Link
          href="/admin/customers"
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-blue-600 hover:text-white lg:w-auto"
        >
          Открыть
        </Link>
      </div>
    </div>
  );
}

function MobileLabel({
  text,
}: {
  text: string;
}) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600 lg:hidden">
      {text}
    </p>
  );
}

function PlanBadge({
  plan,
}: {
  plan: string;
}) {
  const normalized =
    plan.toLowerCase();

  let classes =
    "border-gray-500/20 bg-gray-500/10 text-gray-300";

  if (normalized === "starter") {
    classes =
      "border-blue-500/20 bg-blue-500/10 text-blue-300";
  } else if (normalized === "pro") {
    classes =
      "border-purple-500/20 bg-purple-500/10 text-purple-300";
  } else if (
    normalized === "business"
  ) {
    classes =
      "border-amber-500/20 bg-amber-500/10 text-amber-300";
  } else if (normalized === "trial") {
    classes =
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {formatPlanName(plan)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "trialing" | "inactive";
}) {
  let classes =
    "border-red-500/20 bg-red-500/10 text-red-300";

  let label = "Неактивна";

  if (status === "active") {
    classes =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    label = "Активна";
  } else if (status === "trialing") {
    classes =
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";

    label = "Пробный период";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}

type QuickLinkProps = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

function QuickLink({
  title,
  description,
  href,
  icon,
}: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-blue-500/30 hover:bg-blue-500/5"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-lg text-blue-300">
          {icon}
        </span>

        <span className="text-gray-600 transition group-hover:translate-x-1 group-hover:text-blue-300">
          →
        </span>
      </div>

      <h3 className="mt-5 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </Link>
  );
}

function AdminLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

        <p className="mt-4 text-sm text-gray-400">
          Загружаем админ-панель...
        </p>
      </div>
    </main>
  );
}

function getCustomerStatus(
  customer: Customer,
): "active" | "trialing" | "inactive" {
  const subscription =
    customer.subscription;

  if (!subscription) {
    return "inactive";
  }

  const endDate =
    subscription.currentPeriodEnd ??
    subscription.trialEndsAt;

  if (endDate) {
    const endTime =
      new Date(endDate).getTime();

    if (
      Number.isFinite(endTime) &&
      endTime < Date.now()
    ) {
      return "inactive";
    }
  }

  const normalizedStatus =
    subscription.status.toLowerCase();

  if (normalizedStatus === "active") {
    return "active";
  }

  if (
    normalizedStatus === "trialing" ||
    normalizedStatus === "trial"
  ) {
    return "trialing";
  }

  return "inactive";
}

function getCustomerInitial(
  customer: Customer,
) {
  const value =
    customer.companyName ||
    customer.fullName ||
    customer.email ||
    "?";

  return value
    .trim()
    .charAt(0)
    .toUpperCase();
}

function formatAdminRole(
  role: AdminRole | null,
) {
  switch (role) {
    case "owner":
      return "Владелец";

    case "admin":
      return "Администратор";

    case "support":
      return "Поддержка";

    default:
      return "Администратор";
  }
}

function formatPlanName(
  plan: string,
) {
  switch (plan.toLowerCase()) {
    case "trial":
      return "Trial";

    case "starter":
      return "Starter";

    case "pro":
      return "Pro";

    case "business":
      return "Business";

    default:
      return plan;
  }
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatUzs(amount: number) {
  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  return `${new Intl.NumberFormat(
    "ru-RU",
  ).format(safeAmount)} сум`;
}