"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type PaymentPlan = "starter" | "pro";

type PaymentProvider =
  | "click"
  | "payme"
  | "uzum";

type CheckoutPlan = {
  code: PaymentPlan;
  name: string;
  price: number;
  branchLimit: number;
  description: string;
  features: string[];
};

type ProviderOption = {
  code: PaymentProvider;
  name: string;
  description: string;
  label: string;
};

type CreatedOrder = {
  id: string;
  plan: PaymentPlan;
  provider: PaymentProvider;
  amountUzs: number;
  currency: string;
  status: string;
  checkoutUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type CreateOrderResponse = {
  success: boolean;
  order?: CreatedOrder;
  error?: string;
  message?: string;
};

const plans: Record<PaymentPlan, CheckoutPlan> = {
  starter: {
    code: "starter",
    name: "Starter",
    price: 199000,
    branchLimit: 5,
    description:
      "Для небольших кафе, ресторанов и локальных заведений.",
    features: [
      "До 5 филиалов",
      "Без ограничений по NFC",
      "Базовая аналитика",
      "История переходов",
      "QR-коды",
      "Email-поддержка",
    ],
  },

  pro: {
    code: "pro",
    name: "Pro",
    price: 399000,
    branchLimit: 15,
    description:
      "Для ресторанов и сетей с несколькими филиалами.",
    features: [
      "До 15 филиалов",
      "Без ограничений по NFC",
      "Полная аналитика",
      "Экспорт статистики",
      "QR-коды",
      "Приоритетная поддержка",
    ],
  },
};

const providers: ProviderOption[] = [
  {
    code: "click",
    name: "Click",
    label: "CLICK",
    description:
      "Оплата через приложение Click и банковские карты.",
  },
  {
    code: "payme",
    name: "Payme",
    label: "PAYME",
    description:
      "Оплата через Payme с помощью Uzcard или HUMO.",
  },
  {
    code: "uzum",
    name: "Uzum",
    label: "UZUM",
    description:
      "Оплата через Uzum Bank и поддерживаемые карты.",
  },
];

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutPageLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planParameter =
    searchParams.get("plan");

  const selectedPlan = useMemo(() => {
    if (
      planParameter === "starter" ||
      planParameter === "pro"
    ) {
      return plans[planParameter];
    }

    return null;
  }, [planParameter]);

  const [
    selectedProvider,
    setSelectedProvider,
  ] = useState<PaymentProvider | null>(
    null,
  );

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [creatingOrder, setCreatingOrder] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrder | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error || !session) {
          const planQuery = selectedPlan
            ? `?next=${encodeURIComponent(
                `/checkout?plan=${selectedPlan.code}`,
              )}`
            : "";

          router.replace(
            `/login${planQuery}`,
          );

          return;
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router, selectedPlan]);

  async function handleCreateOrder() {
    if (!selectedPlan) {
      setErrorMessage(
        "Выбран неправильный тариф.",
      );

      return;
    }

    if (!selectedProvider) {
      setErrorMessage(
        "Выберите способ оплаты.",
      );

      return;
    }

    try {
      setCreatingOrder(true);
      setErrorMessage("");
      setCreatedOrder(null);

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
            `/checkout?plan=${selectedPlan.code}`,
          )}`,
        );

        return;
      }

      const response = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            plan: selectedPlan.code,
            provider: selectedProvider,
          }),
        },
      );

      const result =
        (await response.json()) as CreateOrderResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.order
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать заказ.",
        );
      }

      setCreatedOrder(result.order);

      if (result.order.checkoutUrl) {
        window.location.href =
          result.order.checkoutUrl;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось создать заказ.",
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  if (checkingSession) {
    return <CheckoutPageLoading />;
  }

  if (!selectedPlan) {
    return <InvalidPlanState />;
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-320px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />

        <div className="absolute right-[-140px] top-[25%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[130px]" />
      </div>

      <header className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black shadow-lg shadow-blue-600/20">
              R
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                ReviewTap
              </p>

              <p className="text-xs text-gray-500">
                Безопасная оплата
              </p>
            </div>
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Назад к тарифам
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
            Оформление подписки
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Выберите способ оплаты
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
            После подтверждения платежа
            подписка будет автоматически
            активирована на 30 дней.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            <p>{errorMessage}</p>

            <button
              type="button"
              aria-label="Закрыть сообщение"
              onClick={() =>
                setErrorMessage("")
              }
              className="text-lg leading-none opacity-70 transition hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {createdOrder && (
          <CreatedOrderMessage
            order={createdOrder}
          />
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <section className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="mb-7">
                <h2 className="text-xl font-bold">
                  Способ оплаты
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Выберите подходящую
                  платёжную систему.
                </p>
              </div>

              <div className="grid gap-4">
                {providers.map((provider) => {
                  const isSelected =
                    selectedProvider ===
                    provider.code;

                  return (
                    <button
                      key={provider.code}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(
                          provider.code,
                        );
                        setErrorMessage("");
                        setCreatedOrder(null);
                      }}
                      className={[
                        "flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition",
                        isSelected
                          ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-950/20"
                          : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <ProviderLogo
                        provider={
                          provider.code
                        }
                        label={provider.label}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-bold text-white">
                            {provider.name}
                          </h3>

                          <span
                            className={[
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                              isSelected
                                ? "border-blue-400 bg-blue-500"
                                : "border-white/20",
                            ].join(" ")}
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {
                            provider.description
                          }
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-5">
                <div className="flex items-start gap-3">
                  <LockIcon />

                  <div>
                    <p className="text-sm font-semibold text-gray-200">
                      Безопасная оплата
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      ReviewTap не хранит номера
                      банковских карт. Оплата будет
                      проходить на защищённой стороне
                      выбранной платёжной системы.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside>
            <section className="sticky top-6 rounded-[30px] border border-blue-500/20 bg-gradient-to-b from-blue-500/10 to-white/[0.03] p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
                Ваш заказ
              </p>

              <div className="mt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black">
                      {selectedPlan.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {
                        selectedPlan.description
                      }
                    </p>
                  </div>

                  {selectedPlan.code ===
                    "pro" && (
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold">
                      Популярный
                    </span>
                  )}
                </div>

                <div className="mt-7 border-y border-white/10 py-6">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm text-gray-400">
                      Подписка на 30 дней
                    </span>

                    <span className="text-right text-2xl font-black">
                      {formatUzs(
                        selectedPlan.price,
                      )}
                    </span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {selectedPlan.features.map(
                    (feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <CheckIcon />
                        </span>

                        <span>{feature}</span>
                      </li>
                    ),
                  )}
                </ul>

                <button
                  type="button"
                  disabled={creatingOrder}
                  onClick={handleCreateOrder}
                  className="mt-8 flex min-h-13 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingOrder
                    ? "Создаём заказ..."
                    : selectedProvider
                      ? `Оплатить через ${formatProviderName(
                          selectedProvider,
                        )}`
                      : "Выберите способ оплаты"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-gray-600">
                  Нажимая кнопку оплаты, вы
                  соглашаетесь с условиями
                  использования ReviewTap.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

type CreatedOrderMessageProps = {
  order: CreatedOrder;
};

function CreatedOrderMessage({
  order,
}: CreatedOrderMessageProps) {
  return (
    <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-5 text-emerald-100">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckIcon />
        </span>

        <div>
          <p className="font-semibold">
            Заказ успешно создан
          </p>

          <p className="mt-2 text-sm leading-6 text-emerald-100/70">
            ID заказа:{" "}
            <span className="font-mono">
              {order.id}
            </span>
          </p>

          <p className="mt-1 text-sm leading-6 text-emerald-100/70">
            Сумма:{" "}
            {formatUzs(order.amountUzs)}
          </p>

          {!order.checkoutUrl && (
            <p className="mt-3 text-sm leading-6 text-emerald-100/80">
              Заказ появился в базе. Сейчас
              платёжная система ещё работает в
              тестовом режиме — следующим шагом
              подключим настоящую ссылку оплаты.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type ProviderLogoProps = {
  provider: PaymentProvider;
  label: string;
};

function ProviderLogo({
  provider,
  label,
}: ProviderLogoProps) {
  const classes =
    provider === "click"
      ? "bg-blue-500/15 text-blue-300"
      : provider === "payme"
        ? "bg-cyan-500/15 text-cyan-300"
        : "bg-violet-500/15 text-violet-300";

  return (
    <div
      className={`flex h-14 w-20 shrink-0 items-center justify-center rounded-2xl text-xs font-black tracking-wider ${classes}`}
    >
      {label}
    </div>
  );
}

function InvalidPlanState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-5 text-white">
      <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300">
          !
        </div>

        <h1 className="mt-5 text-2xl font-bold">
          Тариф не найден
        </h1>

        <p className="mt-3 text-sm leading-7 text-gray-400">
          Вернитесь на страницу тарифов и
          выберите Starter или Pro.
        </p>

        <Link
          href="/pricing"
          className="mt-7 inline-flex rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold transition hover:bg-blue-500"
        >
          Перейти к тарифам
        </Link>
      </div>
    </main>
  );
}

function CheckoutPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

        <p className="mt-4 text-sm text-gray-400">
          Загружаем страницу оплаты...
        </p>
      </div>
    </main>
  );
}

function formatUzs(amount: number) {
  return `${new Intl.NumberFormat(
    "ru-RU",
  ).format(amount)} сум`;
}

function formatProviderName(
  provider: PaymentProvider,
) {
  switch (provider) {
    case "click":
      return "Click";

    case "payme":
      return "Payme";

    case "uzum":
      return "Uzum";
  }
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M4.5 10.25L8.1 13.7L15.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"
      aria-hidden="true"
    >
      <path
        d="M7 10V7.5C7 4.46 9.24 2 12 2C14.76 2 17 4.46 17 7.5V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M12 14V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}