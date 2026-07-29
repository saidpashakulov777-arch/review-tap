export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-10 py-6">
        <h1 className="text-2xl font-bold">ReviewTap</h1>

        <button className="rounded-xl bg-black px-5 py-3 text-white hover:bg-gray-800">
          Войти
        </button>
      </nav>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-8 pt-24 text-center">
        <span className="rounded-full bg-gray-100 px-4 py-2 text-sm">
          ⭐ Новый способ получать отзывы
        </span>

        <h1 className="mt-8 text-6xl font-extrabold leading-tight">
          Получайте больше
          <br />
          отзывов в Google
        </h1>

        <p className="mt-8 max-w-2xl text-xl text-gray-500">
          Один тап телефона — и гость уже оставляет отзыв.
          А вы получаете полную аналитику по всем филиалам.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-xl bg-black px-8 py-4 text-white hover:bg-gray-800">
            Получить демо
          </button>

          <button className="rounded-xl border px-8 py-4 hover:bg-gray-100">
            Подробнее
          </button>
        </div>
      </section>
    </main>
  );
}