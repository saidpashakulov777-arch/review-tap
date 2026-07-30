const features = [
  {
    icon: "📊",
    title: "Подробная аналитика",
    text: "Отслеживайте переходы по дням, неделям и месяцам в одном кабинете.",
  },
  {
    icon: "🏢",
    title: "Сравнение филиалов",
    text: "Смотрите, какой филиал получает больше переходов и показывает лучший рост.",
  },
  {
    icon: "🔗",
    title: "Уникальные NFC-ссылки",
    text: "Каждый стенд получает отдельную ссылку, чтобы статистика считалась точно.",
  },
  {
    icon: "⚡",
    title: "Мгновенный переход",
    text: "Гость касается стенда и сразу попадает на страницу отзывов Google.",
  },
  {
    icon: "📱",
    title: "Без приложения",
    text: "Клиенту не нужно ничего устанавливать или регистрироваться.",
  },
  {
    icon: "📈",
    title: "История роста",
    text: "Сравнивайте периоды и понимайте, как меняется активность гостей.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#070709] px-6 py-24 text-white lg:px-8"
    >
      <div className="absolute left-0 top-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />
      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-400">
            Возможности
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Всё для управления отзывами
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            ReviewTap объединяет NFC-стенды, аналитику и управление филиалами
            в одной простой системе.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-2 hover:border-blue-500/30"
              style={{
                borderRadius: "24px",
                padding: "28px",
                minHeight: "250px",
                boxShadow:
                  "0 0 40px rgba(59, 130, 246, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
              }}
            >
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-600/10 blur-[80px]" />

              <div
                className="relative flex items-center justify-center border border-blue-500/30 bg-blue-500/[0.06] text-3xl"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "18px",
                  boxShadow:
                    "0 0 28px rgba(59, 130, 246, 0.16), inset 0 0 18px rgba(59, 130, 246, 0.06)",
                }}
              >
                {feature.icon}
              </div>

              <h3 className="relative mt-7 text-xl font-semibold text-white">
                {feature.title}
              </h3>

              <p className="relative mt-4 leading-7 text-gray-400">
                {feature.text}
              </p>

              <div className="absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}