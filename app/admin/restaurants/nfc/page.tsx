"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  branchCount: number;
  nfcTagCount: number;
};

type RestaurantsResponse = {
  success?: boolean;
  restaurants?: Restaurant[];
  message?: string;
};

type PrepareResponse = {
  success?: boolean;
  created?: boolean;

  branch?: {
    id: string;
    restaurantId: string;
    name: string;
    address: string;
  };

  message?: string;
};

export default function RestaurantNfcPage() {
  const router = useRouter();

  const [
    restaurants,
    setRestaurants,
  ] = useState<Restaurant[]>([]);

  const [
    restaurantId,
    setRestaurantId,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [preparing, setPreparing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadRestaurants();
  }, []);

  async function getToken() {
    const {
      data: { session },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          "/admin/restaurants/nfc",
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadRestaurants() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/restaurants/catalog",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as RestaurantsResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить рестораны.",
        );
      }

      setRestaurants(
        result.restaurants ?? [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить рестораны.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!restaurantId) {
      setError(
        "Выберите ресторан.",
      );
      return;
    }

    try {
      setPreparing(true);

      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/restaurants/default-branch",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            restaurantId,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as PrepareResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.branch?.id
      ) {
        throw new Error(
          result.message ||
            "Не удалось открыть управление NFC.",
        );
      }

      router.push(
        `/admin/branches/${result.branch.id}`,
      );
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "Не удалось открыть управление NFC.",
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-white/10 pb-7">
          <Link
            href="/admin/restaurants"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Все рестораны
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            ReviewTap Admin
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Создать NFC-ссылку
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-400">
            Выберите ресторан. Когда у
            него нет филиалов, ReviewTap
            автоматически создаст
            основную точку.
          </p>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <form
            onSubmit={handleContinue}
          >
            <label className="block text-sm font-semibold text-gray-300">
              Ресторан
            </label>

            <select
              value={restaurantId}
              onChange={(event) =>
                setRestaurantId(
                  event.target.value,
                )
              }
              disabled={
                loading ||
                preparing
              }
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#090d1c] px-4 py-4 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">
                {loading
                  ? "Загружаем рестораны..."
                  : "Выберите ресторан"}
              </option>

              {restaurants.map(
                (restaurant) => (
                  <option
                    key={restaurant.id}
                    value={restaurant.id}
                  >
                    {restaurant.name}
                    {restaurant.ownerEmail
                      ? ` — ${restaurant.ownerEmail}`
                      : ""}
                  </option>
                ),
              )}
            </select>

            <button
              type="submit"
              disabled={
                loading ||
                preparing ||
                !restaurantId
              }
              className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preparing
                ? "Подготавливаем..."
                : "Перейти к созданию NFC-ссылки"}
            </button>
          </form>
        </section>

        <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] p-5">
          <p className="text-sm font-semibold text-blue-200">
            Как это работает
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Ресторан без филиалов получит
            техническую точку
            «Основная точка». После этого
            откроется обычная форма
            создания NFC-ссылки.
          </p>
        </div>
      </div>
    </main>
  );
}