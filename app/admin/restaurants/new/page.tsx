"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type RawCustomer = {
  id?: unknown;
  user_id?: unknown;
  userId?: unknown;

  email?: unknown;

  full_name?: unknown;
  fullName?: unknown;
  name?: unknown;

  company_name?: unknown;
  companyName?: unknown;
};

type Customer = {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
};

type CustomersResponse = {
  success?: boolean;
  customers?: RawCustomer[];
  data?: RawCustomer[];
  message?: string;
};

type CreateResponse = {
  success?: boolean;

  restaurant?: {
    id: string;
    ownerId: string | null;
    ownerEmail: string;
    name: string;
    createdAt: string | null;
  };

  message?: string;
};

export default function NewRestaurantPage() {
  const router = useRouter();

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [ownerId, setOwnerId] =
    useState("");

  const [name, setName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filteredCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.email
            .toLowerCase()
            .includes(query) ||
          customer.fullName
            .toLowerCase()
            .includes(query) ||
          customer.companyName
            .toLowerCase()
            .includes(query),
      );
    }, [customers, search]);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === ownerId,
    ) ?? null;

  async function getAccessToken() {
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
          "/admin/restaurants/new",
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/customers",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        },
      );

      const text =
        await response.text();

      let result:
        | CustomersResponse
        | RawCustomer[] = {};

      try {
        result = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Сервер вернул неправильный ответ.",
        );
      }

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin/restaurants/new",
          )}`,
        );

        return;
      }

      if (response.status === 403) {
        router.replace("/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error(
          !Array.isArray(result)
            ? result.message ||
                "Не удалось загрузить клиентов."
            : "Не удалось загрузить клиентов.",
        );
      }

      const rawCustomers =
        Array.isArray(result)
          ? result
          : result.customers ??
            result.data ??
            [];

      const normalizedCustomers =
        rawCustomers
          .map(normalizeCustomer)
          .filter(
            (
              customer,
            ): customer is Customer =>
              customer !== null,
          )
          .sort((first, second) =>
            getCustomerLabel(first).localeCompare(
              getCustomerLabel(second),
              "ru",
            ),
          );

      setCustomers(
        normalizedCustomers,
      );

      if (
        normalizedCustomers.length ===
        1
      ) {
        setOwnerId(
          normalizedCustomers[0].id,
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить клиентов.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName =
      name.trim();

    if (!ownerId) {
      setError(
        "Сначала выберите клиента.",
      );

      return;
    }

    if (!cleanName) {
      setError(
        "Введите название ресторана.",
      );

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
        "/api/admin/restaurants/create",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            ownerId,
            name: cleanName,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as CreateResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin/restaurants/new",
          )}`,
        );

        return;
      }

      if (response.status === 403) {
        throw new Error(
          result.message ||
            "Нет прав для создания ресторана.",
        );
      }

      if (
        !response.ok ||
        !result.success ||
        !result.restaurant
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать ресторан.",
        );
      }

      setSuccess(
        `Ресторан «${result.restaurant.name}» создан для клиента ${result.restaurant.ownerEmail || getCustomerLabel(selectedCustomer)}.`,
      );

      setName("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать ресторан.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-white/10 pb-7">
          <Link
            href="/admin/restaurants"
            className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          >
            ← Все рестораны
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            ReviewTap Admin
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Создать ресторан
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-400">
            Выберите клиента и создайте
            ресторан, который появится в
            его личном кабинете.
          </p>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <form
            onSubmit={handleCreate}
          >
            <label className="block text-sm font-semibold text-gray-300">
              Поиск клиента
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Email, имя или компания"
              disabled={loading}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 disabled:opacity-50"
            />

            <label className="mt-6 block text-sm font-semibold text-gray-300">
              Клиент
            </label>

            <select
              value={ownerId}
              onChange={(event) =>
                setOwnerId(
                  event.target.value,
                )
              }
              disabled={
                loading ||
                customers.length === 0
              }
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#090d1c] px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">
                {loading
                  ? "Загружаем клиентов..."
                  : "Выберите клиента"}
              </option>

              {filteredCustomers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {getCustomerLabel(
                      customer,
                    )}
                  </option>
                ),
              )}
            </select>

            {!loading &&
              customers.length === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
                  Клиентов пока нет.
                  Сначала зарегистрируйте
                  или создайте клиента.
                </div>
              )}

            {selectedCustomer && (
              <div className="mt-4 rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] p-4">
                <p className="font-semibold">
                  {selectedCustomer.fullName ||
                    selectedCustomer.companyName ||
                    "Клиент"}
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  {
                    selectedCustomer.email
                  }
                </p>

                {selectedCustomer.companyName && (
                  <p className="mt-1 text-xs text-gray-600">
                    {
                      selectedCustomer.companyName
                    }
                  </p>
                )}
              </div>
            )}

            <label className="mt-6 block text-sm font-semibold text-gray-300">
              Название ресторана
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Например: Urban Coffee"
              maxLength={120}
              disabled={creating}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={
                creating ||
                loading ||
                !ownerId ||
                !name.trim()
              }
              className="mt-7 w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Создаём ресторан..."
                : "Создать ресторан для клиента"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function normalizeCustomer(
  row: RawCustomer,
): Customer | null {
  const id =
    getString(row.id) ||
    getString(row.user_id) ||
    getString(row.userId);

  if (!id) {
    return null;
  }

  return {
    id,
    email: getString(row.email),

    fullName:
      getString(row.full_name) ||
      getString(row.fullName) ||
      getString(row.name),

    companyName:
      getString(
        row.company_name,
      ) ||
      getString(
        row.companyName,
      ),
  };
}

function getCustomerLabel(
  customer:
    | Customer
    | null,
) {
  if (!customer) {
    return "Клиент";
  }

  const mainName =
    customer.companyName ||
    customer.fullName ||
    "Клиент";

  return customer.email
    ? `${mainName} — ${customer.email}`
    : mainName;
}

function getString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}