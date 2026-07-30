export default function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/5 bg-[#070709]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a href="#" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
            R
          </div>

          <span className="text-lg font-semibold tracking-tight text-white">
            ReviewTap
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Возможности
          </a>

          <a
            href="#how-it-works"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Как это работает
          </a>

          <a
            href="#pricing"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Цены
          </a>

          <a
            href="#faq"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            FAQ
          </a>

          <a
            href="#contacts"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Контакты
          </a>
        </nav>

        <button className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10">
          Войти
        </button>
      </div>
    </header>
  );
}
