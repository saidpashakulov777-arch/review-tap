const steps = [
  {
    number: "01",
    icon: "📱",
    title: "Гость касается стенда",
    text: "Клиент подносит телефон к NFC-стенду ReviewTap.",
  },
  {
    number: "02",
    icon: "⭐",
    title: "Открывается Google Reviews",
    text: "Телефон сразу открывает страницу, где можно оставить отзыв.",
  },
  {
    number: "03",
    icon: "📊",
    title: "Вы видите аналитику",
    text: "ReviewTap сохраняет переход и показывает статистику в кабинете.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#070709] px-6 py-24 text-white lg:px-8"
    >
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-600/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-400">
            Как это работает
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Три простых шага
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            Никаких приложений и сложных инструкций. Гость просто касается
            стенда телефоном.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="group relative overflow-hidden border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-2 hover:border-purple-500/40"
              style={{
                minHeight: "430px",
                borderRadius: "28px",
                padding: "28px",
                boxShadow:
                  "0 0 50px rgba(59, 130, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
              }}
            >
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-purple-600/10 blur-[90px]" />

              <div className="relative flex items-center gap-5">
                <span className="text-2xl font-bold text-purple-400">
                  {step.number}
                </span>

                <div className="relative h-[2px] flex-1 rounded-full bg-gradient-to-r from-purple-600 via-purple-400 to-purple-300">
                  <div className="absolute inset-0 rounded-full bg-purple-500 opacity-80 blur-md" />

                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white"
                    style={{
                      width: "7px",
                      height: "7px",
                      boxShadow: "0 0 16px rgba(168, 85, 247, 1)",
                    }}
                  />
                </div>
              </div>

              <div
                className="relative mx-auto mt-12 flex items-center justify-center border border-purple-500/40 bg-purple-500/[0.04] text-5xl"
                style={{
                  width: "132px",
                  height: "132px",
                  borderRadius: "9999px",
                  boxShadow:
                    "0 0 40px rgba(139, 92, 246, 0.22), inset 0 0 26px rgba(139, 92, 246, 0.1)",
                }}
              >
                <div className="absolute inset-5 rounded-full bg-purple-500/15 blur-xl" />

                <span className="relative">{step.icon}</span>
              </div>

              <div
                className="relative mt-10 text-center"
                style={{
                  paddingLeft: "12px",
                  paddingRight: "12px",
                }}
              >
                <h3 className="text-xl font-semibold text-white">
                  {step.title}
                </h3>

                <p className="mx-auto mt-4 max-w-xs text-base leading-7 text-gray-400">
                  {step.text}
                </p>
              </div>

              <div className="absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}