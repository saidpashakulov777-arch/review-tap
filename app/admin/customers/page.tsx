"use client";

import {
  FormEvent,
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

type SubscriptionPlan =
  | "starter"
  | "pro"
  | "business";

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
  error?: string;
  message?: string;
};

type ActivationResponse = {
  success: boolean;
  message?: string;
  error?: string;
  subscription?: {
    id: string;
    ownerId: string;
    plan: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    paymentProvider: string | null;
  };
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type StatusFilter =
  | "all"
  | "active"
  | "trialing"
  | "inactive";

type PlanFilter =
  | "all"
  | "trial"
  | "starter"
  | "pro"
  | "business";

const planPrices: Record<
  SubscriptionPlan,
  number
> = {
  starter: 99000,
  pro: 199000,
  business: 0,
};

export default function AdminCustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [adminRole, setAdminRole] =
    useState<AdminRole | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activating, setActivating] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [planFilter, setPlanFilter] =
    useState<PlanFilter>("all");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlan>("starter");

  const [selectedDays, setSelectedDays] =
    useState(30);

  const [amountUzs, setAmountUzs] =
    useState(99000);

  const [note, setNote] =
    useState("");

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    void loadCustomers(false);
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
          "/admin/customers",
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadCustomers(
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
            "/admin/customers",
          )}`,
        );

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить клиентов.",
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
        text: getErrorMessage(
          error,
          "Не удалось загрузить админ-панель.",
        ),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredCustomers =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return customers.filter(
        (customer) => {
          const plan =
            customer.subscription?.plan ??
            "trial";

          const status =
            getCustomerStatus(customer);

          const matchesSearch =
            !normalizedSearch ||
            [
              customer.email,
              customer.fullName,
              customer.companyName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch);

          const matchesPlan =
            planFilter === "all" ||
            plan === planFilter;

          const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

          return (
            matchesSearch &&
            matchesPlan &&
            matchesStatus
          );
        },
      );
    }, [
      customers,
      search,
      planFilter,
      statusFilter,
    ]);

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

  function openActivationModal(
    customer: Customer,
  ) {
    const currentPlan =
      customer.subscription?.plan;

    const safePlan: SubscriptionPlan =
      currentPlan === "starter" ||
      currentPlan === "pro" ||
      currentPlan === "business"
        ? currentPlan
        : "starter";

    setSelectedCustomer(customer);
    setSelectedPlan(safePlan);
    setSelectedDays(30);
    setAmountUzs(
      calculateAmount(
        safePlan,
        30,
      ),
    );
    setNote("");
    setMessage(null);
  }

  function closeActivationModal() {
    if (activating) {
      return;
    }

    setSelectedCustomer(null);
    setNote("");
  }

  function changePlan(
    plan: SubscriptionPlan,
  ) {
    setSelectedPlan(plan);
    setAmountUzs(
      calculateAmount(
        plan,
        selectedDays,
      ),
    );
  }

  function changeDays(days: number) {
    setSelectedDays(days);
    setAmountUzs(
      calculateAmount(
        selectedPlan,
        days,
      ),
    );
  }

  async function handleActivation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedCustomer) {
      return;
    }

    const submitter =
      (
        event.nativeEvent as SubmitEvent
      ).submitter;

    const operation =
      submitter instanceof
        HTMLButtonElement &&
      submitter.value === "extend"
        ? "extend"
        : "activate";

    if (
      !Number.isInteger(selectedDays) ||
      selectedDays < 1
    ) {
      setMessage({
        type: "error",
        text:
          "Укажите правильное количество дней.",
      });

      return;
    }

    if (
      !Number.isFinite(amountUzs) ||
      amountUzs < 0
    ) {
      setMessage({
        type: "error",
        text:
          "Укажите правильную сумму оплаты.",
      });

      return;
    }

    try {
      setActivating(true);
      setMessage(null);

      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `/api/admin/customers?operation=${operation}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            customerUserId:
              selectedCustomer.id,

            plan: selectedPlan,

            days: selectedDays,

            amountUzs:
              Math.round(amountUzs),

            note: note.trim(),
          }),
        },
      );

      const result =
        (await response.json()) as ActivationResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Не удалось активировать подписку.",
        );
      }

      setSelectedCustomer(null);

      setMessage({
        type: "success",
        text:
          `Подписка ${formatPlanName(
            selectedPlan,
          )} для ${
            selectedCustomer.email
          } успешно активирована.`,
      });

      await loadCustomers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось активировать подписку.",
        ),
      });
    } finally {
      setActivating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-180px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]" />

        <div className="absolute right-[-200px] top-[25%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      <header className="relative border-b border-white/10 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black shadow-lg shadow-blue-600/20"
            >
              R
            </Link>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold">
                  ReviewTap Admin
                </h1>

                {adminRole && (
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    {formatAdminRole(
                      adminRole,
                    )}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Управление клиентами и подписками
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/[0.08] sm:inline-flex"
            >
              Кабинет
            </Link>

            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void loadCustomers(true)
              }
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing
                ? "Обновляем..."
                : "Обновить"}
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
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
              onClick={() =>
                setMessage(null)
              }
              className="text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
            Панель владельца
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Клиенты и подписки
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
            Здесь ты можешь найти клиента,
            проверить его тариф и вручную
            активировать Starter, Pro или
            Business после получения оплаты.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Всего клиентов"
            value={statistics.total}
            description="Зарегистрированные аккаунты"
          />

          <StatCard
            title="Платные подписки"
            value={statistics.active}
            description="Активные Starter, Pro и Business"
          />

          <StatCard
            title="Пробный период"
            value={statistics.trialing}
            description="Клиенты на бесплатном Trial"
          />

          <StatCard
            title="Неактивные"
            value={statistics.inactive}
            description="Истёкшие или отключённые"
          />
        </section>

        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Поиск
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Email, имя или компания"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Тариф
              </span>

              <select
                value={planFilter}
                onChange={(event) =>
                  setPlanFilter(
                    event.target
                      .value as PlanFilter,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#0c111d] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="all">
                  Все тарифы
                </option>

                <option value="trial">
                  Trial
                </option>

                <option value="starter">
                  Starter
                </option>

                <option value="pro">
                  Pro
                </option>

                <option value="business">
                  Business
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Статус
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as StatusFilter,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#0c111d] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="all">
                  Все статусы
                </option>

                <option value="active">
                  Активные
                </option>

                <option value="trialing">
                  Пробный период
                </option>

                <option value="inactive">
                  Неактивные
                </option>
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <CustomersLoading />
        ) : filteredCustomers.length === 0 ? (
          <EmptyCustomers />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Найдено клиентов:{" "}
                <span className="font-semibold text-gray-300">
                  {
                    filteredCustomers.length
                  }
                </span>
              </p>
            </div>

            <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <div className="hidden grid-cols-[minmax(250px,1.4fr)_160px_150px_180px_160px] gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 lg:grid">
                <span>Клиент</span>
                <span>Тариф</span>
                <span>Статус</span>
                <span>Окончание</span>
                <span>Действие</span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredCustomers.map(
                  (customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onManage={() =>
                        openActivationModal(
                          customer,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {selectedCustomer && (
        <ActivationModal
          customer={selectedCustomer}
          selectedPlan={selectedPlan}
          selectedDays={selectedDays}
          amountUzs={amountUzs}
          note={note}
          activating={activating}
          onPlanChange={changePlan}
          onDaysChange={changeDays}
          onAmountChange={setAmountUzs}
          onNoteChange={setNote}
          onClose={closeActivationModal}
          onSubmit={handleActivation}
        />
      )}
    </main>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  description: string;
};

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-600">
        {description}
      </p>
    </div>
  );
}

type CustomerRowProps = {
  customer: Customer;
  onManage: () => void;
};

function CustomerRow({
  customer,
  onManage,
}: CustomerRowProps) {
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
    <div className="grid gap-5 px-5 py-5 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(250px,1.4fr)_160px_150px_180px_160px] lg:items-center lg:px-6">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">
          {customer.companyName ||
            customer.fullName ||
            "Без названия"}
        </p>

        <p className="mt-1 truncate text-sm text-gray-400">
          {customer.email ||
            "Email не указан"}
        </p>

        <p className="mt-2 text-xs text-gray-600">
          Регистрация:{" "}
          {formatDate(
            customer.createdAt,
          )}
        </p>
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

        <p className="text-sm font-medium text-gray-300">
          {endDate
            ? formatDate(endDate)
            : "Не указано"}
        </p>

        {customer.lastPayment && (
          <p className="mt-1 text-xs text-gray-600">
            Последняя оплата:{" "}
            {formatUzs(
              customer.lastPayment
                .amountUzs,
            )}
          </p>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={onManage}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 lg:w-auto"
        >
          Управление
        </button>
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
  const normalizedPlan =
    plan.toLowerCase();

  let classes =
    "border-gray-500/20 bg-gray-500/10 text-gray-300";

  if (normalizedPlan === "starter") {
    classes =
      "border-blue-500/20 bg-blue-500/10 text-blue-300";
  } else if (
    normalizedPlan === "pro"
  ) {
    classes =
      "border-purple-500/20 bg-purple-500/10 text-purple-300";
  } else if (
    normalizedPlan === "business"
  ) {
    classes =
      "border-amber-500/20 bg-amber-500/10 text-amber-300";
  } else if (
    normalizedPlan === "trial"
  ) {
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
  status: StatusFilter;
}) {
  let classes =
    "border-red-500/20 bg-red-500/10 text-red-300";

  if (status === "active") {
    classes =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  } else if (
    status === "trialing"
  ) {
    classes =
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {formatStatus(status)}
    </span>
  );
}

type ActivationModalProps = {
  customer: Customer;
  selectedPlan: SubscriptionPlan;
  selectedDays: number;
  amountUzs: number;
  note: string;
  activating: boolean;
  onPlanChange: (
    plan: SubscriptionPlan,
  ) => void;
  onDaysChange: (days: number) => void;
  onAmountChange: (amount: number) => void;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
};

function ActivationModal({
  customer,
  selectedPlan,
  selectedDays,
  amountUzs,
  note,
  activating,
  onPlanChange,
  onDaysChange,
  onAmountChange,
  onNoteChange,
  onClose,
  onSubmit,
}: ActivationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#0b101b] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-5 border-b border-white/10 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
              Управление подпиской
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Активировать или продлить тариф
            </h2>

            <p className="mt-2 break-all text-sm text-gray-400">
              {customer.email}
            </p>
          </div>

          <button
            type="button"
            disabled={activating}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl text-gray-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6 px-6 py-6 sm:px-8 sm:py-8"
        >
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-300">
              Выбери тариф
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  "starter",
                  "pro",
                  "business",
                ] as SubscriptionPlan[]
              ).map((plan) => {
                const selected =
                  selectedPlan === plan;

                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() =>
                      onPlanChange(plan)
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-black/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-bold">
                      {formatPlanName(
                        plan,
                      )}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {plan === "starter"
                        ? "До 5 филиалов"
                        : plan === "pro"
                          ? "До 15 филиалов"
                          : "Без ограничений"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Срок подписки
              </span>

              <select
                value={selectedDays}
                onChange={(event) =>
                  onDaysChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value={30}>
                  30 дней
                </option>

                <option value={90}>
                  90 дней
                </option>

                <option value={180}>
                  180 дней
                </option>

                <option value={365}>
                  365 дней
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Полученная сумма
              </span>

              <input
                type="number"
                min={0}
                step={1000}
                value={amountUzs}
                onChange={(event) =>
                  onAmountChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-600">
                {formatUzs(amountUzs)}
              </p>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-300">
              Комментарий
            </span>

            <textarea
              value={note}
              onChange={(event) =>
                onNoteChange(
                  event.target.value,
                )
              }
              maxLength={1000}
              rows={4}
              placeholder="Например: оплата наличными, чек подтверждён"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-blue-500"
            />
          </label>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-200">
              Проверь оплату перед активацией
            </p>

            <p className="mt-2 text-xs leading-5 text-amber-200/70">
              «Активировать» начнёт новый период
              от сегодняшней даты. «Продлить»
              прибавит выбранные дни к текущей
              дате окончания. В базе появится
              ручной платёж со статусом paid.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={activating}
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              type="submit"
              name="operation"
              value="extend"
              disabled={activating}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activating
                ? "Сохраняем..."
                : `Продлить ${formatPlanName(
                    selectedPlan,
                  )}`}
            </button>

            <button
              type="submit"
              name="operation"
              value="activate"
              disabled={activating}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activating
                ? "Сохраняем..."
                : `Активировать ${formatPlanName(
                    selectedPlan,
                  )}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomersLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function EmptyCustomers() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05] text-2xl">
        👤
      </div>

      <h3 className="mt-5 text-xl font-bold">
        Клиенты не найдены
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Измени поиск или фильтры.
      </p>
    </div>
  );
}

function calculateAmount(
  plan: SubscriptionPlan,
  days: number,
) {
  if (plan === "business") {
    return 0;
  }

  const months = Math.max(
    1,
    Math.round(days / 30),
  );

  return planPrices[plan] * months;
}

function getCustomerStatus(
  customer: Customer,
): StatusFilter {
  const subscription =
    customer.subscription;

  if (!subscription) {
    return "inactive";
  }

  const normalizedStatus =
    subscription.status.toLowerCase();

  const currentEnd =
    subscription.currentPeriodEnd ??
    subscription.trialEndsAt;

  const endTime = currentEnd
    ? new Date(currentEnd).getTime()
    : null;

  const hasExpired =
    endTime !== null &&
    Number.isFinite(endTime) &&
    endTime < Date.now();

  if (hasExpired) {
    return "inactive";
  }

  if (
    normalizedStatus === "active"
  ) {
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

function formatPlanName(plan: string) {
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

function formatStatus(
  status: StatusFilter,
) {
  switch (status) {
    case "active":
      return "Активна";

    case "trialing":
      return "Пробный период";

    case "inactive":
      return "Неактивна";

    default:
      return "Все";
  }
}

function formatAdminRole(
  role: AdminRole,
) {
  switch (role) {
    case "owner":
      return "Владелец";

    case "admin":
      return "Администратор";

    case "support":
      return "Поддержка";
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

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}