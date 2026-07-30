const plans = [
  {
    name: "Starter",
    description: "Для небольших кафе и одной точки",
    price: "199 000",
    period: "сум / месяц",
    features: [
      "1 ресторан",
      "1 филиал",
      "1 NFC-стенд",
      "Базовая аналитика",
      "История переходов",
      "Поддержка по Telegram",
    ],
    button: "Начать",
    popular: false,
  },
  {
    name: "Business",
    description: "Для ресторанов с несколькими филиалами",
    price: "399 000",
    period: "сум / месяц",
    features: [
      "1 ресторан",
      "До 5 филиалов",
      "До 5 NFC-стендов",
      "Расширенная аналитика",
      "Сравнение филиалов",
      "Отчёты по активности",
      "Приоритетная поддержка",
    ],
    button: "Выбрать Business",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Для ресторанных сетей и крупных компаний",
    price: "Индивидуально",
    period: "по запросу",
    features: [
      "Неограниченные филиалы",
      "Неограниченные NFC-стенды",
      "Расширенные отчёты",
      "Индивидуальная настройка",
      "Помощь с подключением",
      "Персональная поддержка",
    ],
    button: "Связаться",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[#070709] px-6 py-24 text-white lg:px-8"
    >
      <div className="absolute left-0 top-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-purple-400">
            Тарифы
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Выберите подходящий тариф
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            Начните с одного ресторана и подключайте новые филиалы по мере
            роста бизнеса.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex min-h-[610px] flex-col overflow-hidden border bg-white/[0.03] transition duration-300 hover:-translate-y-2 ${
                plan.popular
                  ? "border-purple-500/50"
                  : "border-white/10 hover:border-white/20"
              }`}
              style={{
                borderRadius: "28px",
                padding: "30px",
                boxShadow: plan.popular
                  ? "0 0 70px rgba(139, 92, 246, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
                  : "0 0 40px rgba(59, 130, 246, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
              }}
            >
              {plan.popular && (
                <div className="absolute right-5 top-5 rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-300">
                  Популярный
                </div>
              )}

              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-purple-600/10 blur-[100px]" />

              <div className="relative">
                <p className="text-sm font-medium text-purple-300">
                  {plan.name}
                </p>

                <h3 className="mt-4 text-2xl font-semibold">{plan.description}</h3>

                <div className="mt-8">
                  <p className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">{plan.period}</p>
                </div>
              </div>

              <div className="relative mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <ul className="relative mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm leading-6 text-gray-300"
                  >
                    <span
                      className="mt-0.5 flex items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300"
                      style={{
                        width: "22px",
                        height: "22px",
                        minWidth: "22px",
                      }}
                    >
                      ✓
                    </span>

                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="relative mt-auto pt-10">
                <button
                  className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold transition duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:brightness-110"
                      : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.button}
                </button>
              </div>

              <div className="absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm leading-6 text-gray-500">
            NFC-стенды можно подключать отдельно. Стоимость зависит от количества
            филиалов и выбранного тарифа.
          </p>
        </div>
      </div>
    </section>
  );
}