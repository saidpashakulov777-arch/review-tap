"use client";

type HeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  onOpenSidebar: () => void;
};

export default function Header({
  title,
  subtitle,
  actionLabel,
  onAction,
  onOpenSidebar,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070709]/80 px-5 py-4 backdrop-blur-2xl sm:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Открыть меню"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl transition hover:bg-white/[0.08] lg:hidden"
          >
            ☰
          </button>

          <div>
            <h1 className="text-lg font-semibold sm:text-2xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 text-sm font-semibold shadow-[0_0_25px_rgba(139,92,246,0.25)] transition hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </header>
  );
}