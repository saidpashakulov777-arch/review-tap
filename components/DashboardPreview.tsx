const stats = [
  {
    label: "Переходы",
    value: "1 284",
    change: "+18%",
  },
  {
    label: "Филиалы",
    value: "4",
    change: "Активны",
  },
  {
    label: "Лучший филиал",
    value: "Центр",
    change: "486 переходов",
  },
];

const chart = [42, 58, 46, 70, 62, 84, 76, 96, 88, 112, 104, 128];

const branches = [
  {
    name: "Центр",
    visits: 486,
    percent: 100,
  },
  {
    name: "Чиланзар",
    visits: 338,
    percent: 70,
  },
  {
    name: "Юнусабад",
    visits: 274,
    percent: 56,
  },
  {
    name: "Сергели",
    visits: 186,
    percent: 38,
  },
];

export default function DashboardPreview() {
  return (
    <section
      id="analytics"
      className="relative overflow-hidden bg-[#070709] px-6 py-24 text-white lg:px-8"
    >
      <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-purple-400">
            Личный кабинет
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Вся статистика в одном месте
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            Отслеживайте активность гостей, сравнивайте филиалы и смотрите
            динамику переходов в реальном времени.
          </p>
        </div>

        <div
          className="relative mt-16 overflow-hidden border border-white/10 bg-white/[0.025]"
          style={{
            borderRadius: "32px",
            padding: "20px",
            boxShadow:
              "0 0 80px rgba(139, 92, 246, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="absolute left-1/3 top-0 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-600/10 blur-[100px]" />

          <div
            className="relative overflow-hidden border border-white/10 bg-[#0c0c11]"
            style={{
              borderRadius: "24px",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-sm text-gray-500">ReviewTap Dashboard</p>
                <h3 className="mt-1 text-xl font-semibold">Обзор ресторана</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                <span className="text-sm text-gray-400">Система активна</span>
              </div>
            </div>

            <div className="grid min-h-[610px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-white/10 p-5 lg:block">
                <div className="space-y-3">
                  {[
                    "Обзор",
                    "Аналитика",
                    "Филиалы",
                    "NFC-ссылки",
                    "Настройки",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-xl px-4 py-3 text-sm ${
                        index === 0
                          ? "bg-purple-500/15 text-purple-300"
                          : "text-gray-500"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="p-5 md:p-7">
                <div className="grid gap-4 md:grid-cols-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="border border-white/10 bg-white/[0.025]"
                      style={{
                        borderRadius: "18px",
                        padding: "20px",
                      }}
                    >
                      <p className="text-sm text-gray-500">{stat.label}</p>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-2xl font-semibold">{stat.value}</p>
                        <span className="text-sm text-green-400">
                          {stat.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
                  <div
                    className="border border-white/10 bg-white/[0.025]"
                    style={{
                      borderRadius: "20px",
                      padding: "22px",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Переходы по дням
                        </p>
                        <h4 className="mt-1 text-lg font-semibold">
                          Последние 12 дней
                        </h4>
                      </div>

                      <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                        +18.4%
                      </span>
                    </div>

                    <div className="relative mt-8 h-64 overflow-hidden">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[1, 2, 3, 4, 5].map((line) => (
                          <div
                            key={line}
                            className="h-px w-full bg-white/[0.05]"
                          />
                        ))}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-2 md:gap-3">
                        {chart.map((value, index) => (
                          <div
                            key={index}
                            className="group relative flex h-full flex-1 items-end"
                          >
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-purple-600/50 via-purple-500/70 to-blue-400 shadow-[0_0_20px_rgba(139,92,246,0.18)] transition duration-300 group-hover:brightness-125"
                              style={{
                                height: `${value}px`,
                                minHeight: "24px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between text-xs text-gray-600">
                      <span>01 июл</span>
                      <span>06 июл</span>
                      <span>12 июл</span>
                    </div>
                  </div>

                  <div
                    className="border border-white/10 bg-white/[0.025]"
                    style={{
                      borderRadius: "20px",
                      padding: "22px",
                    }}
                  >
                    <p className="text-sm text-gray-500">
                      Активность филиалов
                    </p>

                    <h4 className="mt-1 text-lg font-semibold">
                      Сравнение точек
                    </h4>

                    <div className="mt-7 space-y-6">
                      {branches.map((branch) => (
                        <div key={branch.name}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-300">
                              {branch.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {branch.visits}
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-400 shadow-[0_0_14px_rgba(139,92,246,0.4)]"
                              style={{
                                width: `${branch.percent}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 rounded-2xl border border-purple-500/15 bg-purple-500/[0.06] p-4">
                      <p className="text-sm text-purple-300">
                        Лучший результат
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        Филиал «Центр» получил на 43% больше переходов, чем в
                        прошлом месяце.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-5 border border-white/10 bg-white/[0.025]"
                  style={{
                    borderRadius: "20px",
                    padding: "22px",
                  }}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm text-gray-500">
                        Последняя активность
                      </p>

                      <h4 className="mt-1 text-lg font-semibold">
                        Переходы по NFC-стендам
                      </h4>
                    </div>

                    <button className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.08]">
                      Посмотреть всё
                    </button>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06]">
                    {[
  ["Центр", "Касса", "2 минуты назад"],
  ["Чиланзар", "Касса", "8 минут назад"],
  ["Юнусабад", "Касса", "14 минут назад"],
].map((row, index) => (
                      <div
                        key={`${row[0]}-${row[1]}`}
                        className={`grid gap-2 px-4 py-4 text-sm md:grid-cols-3 ${
                          index !== 2 ? "border-b border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="text-gray-300">{row[0]}</span>
                        <span className="text-gray-500">{row[1]}</span>
                        <span className="text-gray-600 md:text-right">
                          {row[2]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}