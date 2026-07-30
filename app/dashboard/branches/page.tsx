import Link from "next/link";

export default function AdminBranchesPage() {
  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
              ReviewTap Admin
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Филиалы
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              Здесь будут отображаться филиалы всех ресторанов.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            ← Назад в админку
          </Link>
        </div>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl">
              📍
            </div>

            <h2 className="mt-5 text-xl font-bold">
              Раздел филиалов работает
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
              Страница открывается правильно. Следующим этапом подключим сюда
              филиалы из таблицы branches в Supabase.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}