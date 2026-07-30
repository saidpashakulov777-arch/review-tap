"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  createdAt: string | null;
};

type Branch = {
  id: string;
  restaurantId: string | null;
  name: string;
  address: string;
  createdAt: string | null;
};

type BranchesResponse = {
  success: boolean;
  restaurant?: Restaurant;
  branches?: Branch[];
  branch?: Branch;
  message?: string;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function RestaurantBranchesPage() {
  const router = useRouter();

  const params = useParams<{
    restaurantId: string;
  }>();

  const restaurantId =
    params.restaurantId;

  const [
    restaurant,
    setRestaurant,
  ] = useState<Restaurant | null>(
    null,
  );

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [name, setName] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    if (restaurantId) {
      void loadBranches();
    }
  }, [restaurantId]);

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/dashboard/restaurants/${restaurantId}`,
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadBranches() {
    setLoading(true);
    setMessage(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/restaurants/${restaurantId}/branches`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as BranchesResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            `/dashboard/restaurants/${restaurantId}`,
          )}`,
        );

        return;
      }

      if (
        !response.ok ||
        !result.success ||
        !result.restaurant
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить филиалы.",
        );
      }

      setRestaurant(
        result.restaurant,
      );

      setBranches(
        result.branches ?? [],
      );
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить филиалы.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBranch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(null);

    const cleanName =
      name.trim();

    const cleanAddress =
      address.trim();

    if (!cleanName) {
      setMessage({
        type: "error",
        text: "Введите название филиала.",
      });

      return;
    }

    try {
      setCreating(true);

      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/restaurants/${restaurantId}/branches`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: cleanName,
            address: cleanAddress,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as BranchesResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.branch
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать филиал.",
        );
      }

      setBranches(
        (currentBranches) => [
          result.branch as Branch,
          ...currentBranches,
        ],
      );

      setName("");
      setAddress("");

      setMessage({
        type: "success",
        text: "Филиал успешно создан.",
      });
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось создать филиал.",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/restaurants"
              className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
            >
              ← Мои рестораны
            </Link>

            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              {restaurant?.name ??
                "Филиалы ресторана"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              Создавайте филиалы и
              управляйте точками этого
              ресторана.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-blue-300">
              Всего филиалов
            </p>

            <p className="mt-1 text-2xl font-black">
              {branches.length}
            </p>
          </div>
        </header>

        {message && (
          <div
            className={`mt-6 flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            <p>{message.text}</p>

            <button
              type="button"
              onClick={() =>
                setMessage(null)
              }
              className="text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">
            Добавить филиал
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Укажите название точки и
            её адрес.
          </p>

          <form
            onSubmit={
              handleCreateBranch
            }
            className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.4fr_auto]"
          >
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Например: Главный филиал"
              maxLength={120}
              disabled={creating}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 disabled:opacity-60"
            />

            <input
              type="text"
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value,
                )
              }
              placeholder="Например: Ташкент, ул. Амира Темура, 10"
              maxLength={250}
              disabled={creating}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating
                ? "Создаём..."
                : "Добавить филиал"}
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState />
        ) : branches.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {branches.map(
              (branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                />
              ),
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function BranchCard({
  branch,
}: {
  branch: Branch;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-blue-500/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/15 text-xl">
          📍
        </div>

        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Активен
        </span>
      </div>

      <h2 className="mt-5 text-xl font-bold">
        {branch.name}
      </h2>

      <p className="mt-3 min-h-12 text-sm leading-6 text-gray-500">
        {branch.address ||
          "Адрес не указан"}
      </p>

      <p className="mt-4 text-xs text-gray-600">
        Создан:{" "}
        {formatDate(
          branch.createdAt,
        )}
      </p>

      <Link
        href={`/dashboard/branches/${branch.id}`}
        className="mt-5 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
      >
        Настроить NFC-метки
      </Link>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-[26px] border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-4xl">
        📍
      </div>

      <h2 className="mt-5 text-xl font-bold">
        Филиалов пока нет
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Добавьте первый филиал с
        помощью формы выше.
      </p>
    </section>
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "не указано";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}
