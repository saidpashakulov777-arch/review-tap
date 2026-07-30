"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanName = "starter" | "pro" | "business";

type PricingPlan = {
  name: string;
  key: PlanName;
  description: string;
  price: string;
  period?: string;
  highlighted?: boolean;
  buttonLabel: string;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    name: "Starter",
    key: "starter",
    description: "Для небольших кафе, ресторанов и локальных заведений.",
    price: "199 000",
    period: "сум / месяц",
    buttonLabel: "Выбрать Starter",
    features: [
      "До 5 филиалов",
      "Без ограничений по NFC",
      "Базовая аналитика",
      "История переходов",
      "QR-коды",
      "Email-поддержка",
    ],
  },
  {
    name: "Pro",
    key: "pro",
    description: "Для развивающихся ресторанов и сетей с несколькими филиалами.",
    price: "399 000",
    period: "сум / месяц",
    highlighted: true,
    buttonLabel: "Выбрать Pro",
    features: [
      "До 15 филиалов",
      "Без ограничений по NFC",
      "Полная аналитика",
      "Экспорт статистики",
      "QR-коды",
      "Приоритетная поддержка",
      "Все возможности Starter",
    ],
  },
  {
    name: "Business",
    key: "business",
    description: "Для крупных ресторанных сетей, гостиниц и корпоративных клиентов.",
    price: "По запросу",
    buttonLabel: "Связаться с нами",
    features: [
      "Неограниченное количество ресторанов",
      "Неограниченное количество филиалов",
      "API-доступ",
      "White Label",
      "Персональный менеджер",
      "Индивидуальные интеграции",
      "Все возможности Pro",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);

  function handlePlanSelect(plan: PlanName) {
    setSelectedPlan(plan);

    if (plan === "business") {
      router.push("/contact?plan=business");
      return;
    }

    router.push(`/checkout?plan=${plan}`);
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[140px]" />

        <div className="absolute right-[8%] top-20 h-72 w-72 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <header className="border-b border-white/10">
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
                NFC Reviews Platform
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Войти
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-20 sm:px-8 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            14 дней бесплатно
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Выберите тариф для вашего бизнеса
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
            Начните с бесплатного 14-дневного периода и получите доступ
            ко всем возможностям Pro. Банковская карта для начала не нужна.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.key;

            return (
              <article
                key={plan.key}
                className={[
                  "relative flex h-full flex-col rounded-[30px] border p-7 transition duration-300 sm:p-8",
                  plan.highlighted
                    ? "border-blue-500/60 bg-gradient-to-b from-blue-500/[0.13] to-white/[0.035] shadow-2xl shadow-blue-950/30 lg:-translate-y-4"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                {plan.highlighted && (
                  <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-blue-600/30">
                    Популярный
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold">
                    {plan.name}
                  </h2>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-gray-400">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-7 border-b border-white/10 pb-7">
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span
                      className={
                        plan.key === "business"
                          ? "text-4xl font-black tracking-tight"
                          : "text-4xl font-black tracking-tight sm:text-5xl"
                      }
                    >
                      {plan.price}
                    </span>

                    {plan.period && (
                      <span className="pb-1 text-sm text-gray-500">
                        {plan.period}
                      </span>
                    )}
                  </div>

                  {plan.key !== "business" && (
                    <p className="mt-3 text-sm text-gray-500">
                      Оплата производится ежемесячно
                    </p>
                  )}
                </div>

                <ul className="mt-7 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6 text-gray-300"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                        <CheckIcon />
                      </span>

                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => handlePlanSelect(plan.key)}
                  className={[
                    "mt-8 flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70",
                    plan.highlighted
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
                      : "border border-white/10 bg-white/[0.06] text-white hover:border-white/20 hover:bg-white/[0.1]",
                  ].join(" ")}
                >
                  {isSelected ? "Переходим..." : plan.buttonLabel}
                </button>
              </article>
            );
          })}
        </div>

        <section className="mt-20 rounded-[32px] border border-white/10 bg-white/[0.03] p-7 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
                Бесплатный период
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Попробуйте ReviewTap бесплатно
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                После регистрации вы получите доступ к функциям тарифа Pro
                на 14 дней. За это время можно добавить филиалы, настроить
                NFC-таблички и посмотреть аналитику переходов.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TrialFeature
                number="01"
                title="Без карты"
                description="Для начала пробного периода платежная карта не требуется."
              />

              <TrialFeature
                number="02"
                title="Все функции Pro"
                description="Полная аналитика, QR-коды, филиалы и статистика."
              />

              <TrialFeature
                number="03"
                title="14 дней"
                description="После окончания пробного периода выберите подходящий тариф."
              />
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
              Частые вопросы
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Всё, что нужно знать о тарифах
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4">
            <FaqItem
              question="Нужно ли привязывать банковскую карту для пробного периода?"
              answer="Нет. Вы можете пользоваться ReviewTap бесплатно в течение 14 дней без привязки карты."
            />

            <FaqItem
              question="Что произойдёт после окончания 14 дней?"
              answer="Данные сохранятся, но создание новых филиалов и доступ к платным функциям будут ограничены до подключения Starter, Pro или Business."
            />

            <FaqItem
              question="Есть ли ограничение по количеству NFC-табличек?"
              answer="Нет. Количество NFC-табличек не ограничивается тарифом. Ограничения действуют только на количество филиалов и доступные функции."
            />

            <FaqItem
              question="Можно ли перейти со Starter на Pro?"
              answer="Да. Вы сможете повысить тариф в любое время через настройки подписки в личном кабинете."
            />

            <FaqItem
              question="Как определяется стоимость Business?"
              answer="Стоимость рассчитывается индивидуально с учётом количества ресторанов, филиалов, интеграций и дополнительных требований."
            />
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-[32px] border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-violet-600/10 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Начните получать больше отзывов уже сегодня
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
            Создайте аккаунт, подключите первый филиал и получите полный
            доступ к ReviewTap на 14 дней.
          </p>

          <Link
            href="/register"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-bold text-black transition hover:bg-gray-200"
          >
            Начать бесплатно
          </Link>
        </section>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} ReviewTap. Все права защищены.
          </p>

          <div className="flex flex-wrap gap-5">
            <Link
              href="/privacy"
              className="transition hover:text-white"
            >
              Конфиденциальность
            </Link>

            <Link
              href="/terms"
              className="transition hover:text-white"
            >
              Условия использования
            </Link>

            <Link
              href="/contact"
              className="transition hover:text-white"
            >
              Контакты
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

type TrialFeatureProps = {
  number: string;
  title: string;
  description: string;
};

function TrialFeature({
  number,
  title,
  description,
}: TrialFeatureProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
      <span className="text-xs font-bold tracking-[0.18em] text-blue-400">
        {number}
      </span>

      <h3 className="mt-3 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

type FaqItemProps = {
  question: string;
  answer: string;
};

function FaqItem({
  question,
  answer,
}: FaqItemProps) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-1 transition open:bg-white/[0.05]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left font-semibold text-white">
        <span>{question}</span>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-400 transition group-open:rotate-45 group-open:text-white">
          <PlusIcon />
        </span>
      </summary>

      <p className="border-t border-white/10 pb-5 pt-4 text-sm leading-7 text-gray-400">
        {answer}
      </p>
    </details>
  );
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

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M10 4V16M4 10H16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}