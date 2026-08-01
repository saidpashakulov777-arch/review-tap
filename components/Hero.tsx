import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#070709] px-6 pb-20 pt-32 text-white lg:px-8">
      <div className="absolute left-1/4 top-10 h-80 w-80 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-purple-600/20 blur-[140px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 backdrop-blur-xl">
            <span>⭐</span>
            Новый способ получать отзывы в Google
          </div>

          <h1 className="mt-8 max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Получайте больше отзывов.
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-500 to-purple-400 bg-clip-text text-transparent">
              Управляйте репутацией.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
            ReviewTap помогает ресторанам увеличивать количество отзывов в
            Google и показывает полную аналитику по каждому филиалу.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
  href="/register"
  className="rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
>
  Попробовать бесплатно
</a>

            <button className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 font-semibold text-white transition hover:bg-white/10">
              Смотреть демо
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-400">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              ⚡ Легко настроить
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              ⏱ Работает за 1 минуту
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              📱 Без приложения
            </div>
          </div>
        </div>

        <div className="relative min-h-[560px]">
          <div className="absolute inset-0 rounded-full bg-blue-600/10 blur-[100px]" />

          <div className="absolute left-0 top-8 w-[82%] rounded-[28px] border border-white/10 bg-[#0d0d12]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold">
                  R
                </div>

                <span className="font-semibold">ReviewTap</span>
              </div>

              <span className="text-xs text-gray-500">Обзор</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-gray-500">Переходы</p>
                <p className="mt-2 text-2xl font-bold">143</p>
                <p className="mt-1 text-xs text-emerald-400">+28%</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-gray-500">Отзывы</p>
                <p className="mt-2 text-2xl font-bold">27</p>
                <p className="mt-1 text-xs text-emerald-400">+24%</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-gray-500">Конверсия</p>
                <p className="mt-2 text-2xl font-bold">61%</p>
                <p className="mt-1 text-xs text-emerald-400">+18%</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Переходы за период</p>
                  <p className="mt-1 text-3xl font-bold">143</p>
                </div>

                <p className="text-sm text-emerald-400">+28%</p>
              </div>

              <div className="mt-8 flex h-36 items-end gap-2">
                {[42, 58, 48, 70, 64, 92, 78, 110, 96, 126, 118, 142].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-blue-700 to-blue-400"
                      style={{ height }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 z-10 w-[45%]">
            <div className="absolute inset-6 rounded-full bg-blue-500/20 blur-[70px]" />

            <div className="relative rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl shadow-blue-950/50 backdrop-blur-xl">
              <Image
                src="/images/nfc.png"
                alt="ReviewTap NFC-стенд"
                width={460}
                height={460}
                className="rounded-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}