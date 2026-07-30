import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminRole =
  | "owner"
  | "admin"
  | "support";

type SubscriptionPlan =
  | "starter"
  | "pro"
  | "business";

type ActivateSubscriptionBody = {
  customerUserId?: unknown;
  plan?: unknown;
  days?: unknown;
  amountUzs?: unknown;
  note?: unknown;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
};

type SubscriptionRow = {
  id: string;
  owner_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  payment_provider: string | null;
  updated_at: string | null;
};

type PaymentOrderRow = {
  id: string;
  owner_id: string;
  plan: string;
  provider: string;
  status: string;
  amount_uzs: number | string;
  paid_at: string | null;
  created_at: string;
};

type AdminUserRow = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
};

const allowedPlans: SubscriptionPlan[] = [
  "starter",
  "pro",
  "business",
];

/*
 * GET /api/admin/customers
 *
 * Загружает список клиентов для админ-панели.
 */
export async function GET(
  request: NextRequest,
) {
  const adminAuth =
    await authorizeAdmin(request);

  if (!adminAuth.success) {
    return adminAuth.response;
  }

  try {
    const searchQuery =
      request.nextUrl.searchParams
        .get("q")
        ?.trim()
        .toLowerCase() ?? "";

    const {
      data: usersData,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers(
        {
          page: 1,
          perPage: 200,
        },
      );

    if (usersError) {
      return createErrorResponse(
        "USERS_LOAD_FAILED",
        "Не удалось загрузить пользователей.",
        500,
      );
    }

    const authUsers =
      usersData.users ?? [];

    const userIds = authUsers.map(
      (user) => user.id,
    );

    if (userIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          admin: {
            userId: adminAuth.userId,
            role: adminAuth.role,
          },
          customers: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const [
      profilesResult,
      subscriptionsResult,
      paymentOrdersResult,
      adminUsersResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, company_name",
        )
        .in("id", userIds),

      supabaseAdmin
        .from("subscriptions")
        .select(
          `
            id,
            owner_id,
            plan,
            status,
            current_period_end,
            trial_ends_at,
            payment_provider,
            updated_at
          `,
        )
        .in("owner_id", userIds)
        .order("updated_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("payment_orders")
        .select(
          `
            id,
            owner_id,
            plan,
            provider,
            status,
            amount_uzs,
            paid_at,
            created_at
          `,
        )
        .in("owner_id", userIds)
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("admin_users")
        .select(
          "user_id, role, is_active",
        ),
    ]);

    if (profilesResult.error) {
      return createErrorResponse(
        "PROFILES_LOAD_FAILED",
        "Не удалось загрузить профили клиентов.",
        500,
      );
    }

    if (subscriptionsResult.error) {
      return createErrorResponse(
        "SUBSCRIPTIONS_LOAD_FAILED",
        "Не удалось загрузить подписки клиентов.",
        500,
      );
    }

    if (paymentOrdersResult.error) {
      return createErrorResponse(
        "PAYMENTS_LOAD_FAILED",
        "Не удалось загрузить платежи клиентов.",
        500,
      );
    }

    if (adminUsersResult.error) {
      return createErrorResponse(
        "ADMINS_LOAD_FAILED",
        "Не удалось проверить администраторов.",
        500,
      );
    }

    const profiles =
      (profilesResult.data ??
        []) as unknown as ProfileRow[];

    const subscriptions =
      (subscriptionsResult.data ??
        []) as unknown as SubscriptionRow[];

    const paymentOrders =
      (paymentOrdersResult.data ??
        []) as unknown as PaymentOrderRow[];

    const adminUsers =
      (adminUsersResult.data ??
        []) as unknown as AdminUserRow[];

    const profileByUserId =
      new Map<string, ProfileRow>();

    for (const profile of profiles) {
      profileByUserId.set(
        profile.id,
        profile,
      );
    }

    const subscriptionByUserId =
      new Map<string, SubscriptionRow>();

    /*
     * subscriptions уже отсортированы:
     * сначала самые свежие.
     * Поэтому сохраняем только первую строку.
     */
    for (
      const subscription of subscriptions
    ) {
      if (
        !subscriptionByUserId.has(
          subscription.owner_id,
        )
      ) {
        subscriptionByUserId.set(
          subscription.owner_id,
          subscription,
        );
      }
    }

    const lastPaymentByUserId =
      new Map<string, PaymentOrderRow>();

    /*
     * payment_orders уже отсортированы:
     * сначала самые свежие.
     */
    for (
      const payment of paymentOrders
    ) {
      if (
        !lastPaymentByUserId.has(
          payment.owner_id,
        )
      ) {
        lastPaymentByUserId.set(
          payment.owner_id,
          payment,
        );
      }
    }

    const administratorIds = new Set(
      adminUsers
        .filter(
          (adminUser) =>
            adminUser.is_active,
        )
        .map(
          (adminUser) =>
            adminUser.user_id,
        ),
    );

    const customers = authUsers
      .filter(
        (user) =>
          !administratorIds.has(user.id),
      )
      .map((user) => {
        const profile =
          profileByUserId.get(user.id) ??
          null;

        const subscription =
          subscriptionByUserId.get(
            user.id,
          ) ?? null;

        const lastPayment =
          lastPaymentByUserId.get(
            user.id,
          ) ?? null;

        return {
          id: user.id,
          email: user.email ?? "",
          fullName:
            profile?.full_name ?? "",
          companyName:
            profile?.company_name ?? "",
          createdAt:
            user.created_at ?? null,
          lastSignInAt:
            user.last_sign_in_at ?? null,

          subscription: subscription
            ? {
                id: subscription.id,
                plan:
                  subscription.plan ??
                  "trial",
                status:
                  subscription.status ??
                  "inactive",
                currentPeriodEnd:
                  subscription.current_period_end,
                trialEndsAt:
                  subscription.trial_ends_at,
                paymentProvider:
                  subscription.payment_provider,
              }
            : null,

          lastPayment: lastPayment
            ? {
                id: lastPayment.id,
                plan:
                  lastPayment.plan,
                provider:
                  lastPayment.provider,
                status:
                  lastPayment.status,
                amountUzs:
                  normalizeAmount(
                    lastPayment.amount_uzs,
                  ),
                paidAt:
                  lastPayment.paid_at,
                createdAt:
                  lastPayment.created_at,
              }
            : null,
        };
      })
      .filter((customer) => {
        if (!searchQuery) {
          return true;
        }

        const searchableText = [
          customer.email,
          customer.fullName,
          customer.companyName,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          searchQuery,
        );
      })
      .sort((first, second) => {
        const firstDate =
          first.createdAt
            ? new Date(
                first.createdAt,
              ).getTime()
            : 0;

        const secondDate =
          second.createdAt
            ? new Date(
                second.createdAt,
              ).getTime()
            : 0;

        return secondDate - firstDate;
      });

    return NextResponse.json(
      {
        success: true,

        admin: {
          userId: adminAuth.userId,
          role: adminAuth.role,
        },

        customers,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      getErrorMessage(
        error,
        "Произошла внутренняя ошибка.",
      ),
      500,
    );
  }
}

/*
 * POST /api/admin/customers
 *
 * Вручную активирует или продлевает
 * подписку клиента.
 */
export async function POST(
  request: NextRequest,
) {
  const adminAuth =
    await authorizeAdmin(request);

  if (!adminAuth.success) {
    return adminAuth.response;
  }

  try {
    const body =
      await readActivateBody(request);

    if (!body) {
      return createErrorResponse(
        "INVALID_JSON",
        "Не удалось прочитать запрос.",
        400,
      );
    }

    if (
      typeof body.customerUserId !==
        "string" ||
      !isUuid(body.customerUserId)
    ) {
      return createErrorResponse(
        "INVALID_CUSTOMER",
        "Выбран неправильный клиент.",
        400,
      );
    }

    if (!isSubscriptionPlan(body.plan)) {
      return createErrorResponse(
        "INVALID_PLAN",
        "Выберите Starter, Pro или Business.",
        400,
      );
    }

    const days = normalizeInteger(
      body.days,
    );

    if (
      days === null ||
      days < 1 ||
      days > 3650
    ) {
      return createErrorResponse(
        "INVALID_DURATION",
        "Укажите срок от 1 до 3650 дней.",
        400,
      );
    }

    const amountUzs = normalizeInteger(
      body.amountUzs,
    );

    if (
      amountUzs === null ||
      amountUzs < 0
    ) {
      return createErrorResponse(
        "INVALID_AMOUNT",
        "Сумма оплаты указана неправильно.",
        400,
      );
    }

    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 1000)
        : "";

    const {
      data: customerData,
      error: customerError,
    } =
      await supabaseAdmin.auth.admin
        .getUserById(
          body.customerUserId,
        );

    if (
      customerError ||
      !customerData.user
    ) {
      return createErrorResponse(
        "CUSTOMER_NOT_FOUND",
        "Клиент не найден.",
        404,
      );
    }

    const { data, error } =
      await supabaseAdmin.rpc(
        "reviewtap_admin_activate_subscription",
        {
          p_admin_user_id:
            adminAuth.userId,

          p_customer_user_id:
            body.customerUserId,

          p_plan: body.plan,

          p_days: days,

          p_amount_uzs: amountUzs,

          p_note: note || null,
        },
      );

    if (error) {
      const databaseError =
        mapActivationError(
          error.message,
        );

      return createErrorResponse(
        databaseError.code,
        databaseError.message,
        databaseError.status,
      );
    }

    const subscription =
      normalizeSubscription(data);

    if (!subscription) {
      return createErrorResponse(
        "ACTIVATION_FAILED",
        "Подписка была изменена, но сервер получил неправильный ответ.",
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Подписка успешно активирована.",

        customer: {
          id: customerData.user.id,
          email:
            customerData.user.email ??
            "",
        },

        subscription: {
          id: subscription.id,
          ownerId:
            subscription.owner_id,
          plan: subscription.plan,
          status:
            subscription.status,
          currentPeriodStart:
            subscription.current_period_start,
          currentPeriodEnd:
            subscription.current_period_end,
          paymentProvider:
            subscription.payment_provider,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      getErrorMessage(
        error,
        "Не удалось активировать подписку.",
      ),
      500,
    );
  }
}

async function authorizeAdmin(
  request: NextRequest,
): Promise<
  | {
      success: true;
      userId: string;
      role: AdminRole;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const accessToken = getBearerToken(
    request.headers.get(
      "authorization",
    ),
  );

  if (!accessToken) {
    return {
      success: false,

      response: createErrorResponse(
        "AUTHORIZATION_REQUIRED",
        "Войдите в аккаунт.",
        401,
      ),
    };
  }

  const {
    data: userData,
    error: userError,
  } = await supabaseAdmin.auth.getUser(
    accessToken,
  );

  if (
    userError ||
    !userData.user
  ) {
    return {
      success: false,

      response: createErrorResponse(
        "INVALID_SESSION",
        "Сессия истекла. Войдите снова.",
        401,
      ),
    };
  }

  const {
    data: adminData,
    error: adminError,
  } = await supabaseAdmin
    .from("admin_users")
    .select(
      "user_id, role, is_active",
    )
    .eq(
      "user_id",
      userData.user.id,
    )
    .maybeSingle();

  if (
    adminError ||
    !adminData
  ) {
    return {
      success: false,

      response: createErrorResponse(
        "ADMIN_ACCESS_DENIED",
        "У вас нет доступа к админ-панели.",
        403,
      ),
    };
  }

  const admin =
    adminData as unknown as AdminUserRow;

  if (
    !admin.is_active ||
    !isAdminRole(admin.role)
  ) {
    return {
      success: false,

      response: createErrorResponse(
        "ADMIN_ACCESS_DENIED",
        "Доступ администратора отключён.",
        403,
      ),
    };
  }

  return {
    success: true,
    userId: userData.user.id,
    role: admin.role,
  };
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function getBearerToken(
  authorizationHeader: string | null,
) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] =
    authorizationHeader
      .trim()
      .split(/\s+/);

  if (
    scheme?.toLowerCase() !==
      "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

async function readActivateBody(
  request: NextRequest,
): Promise<ActivateSubscriptionBody | null> {
  try {
    const body: unknown =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as ActivateSubscriptionBody;
  } catch {
    return null;
  }
}

function isAdminRole(
  value: unknown,
): value is AdminRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "support"
  );
}

function isSubscriptionPlan(
  value: unknown,
): value is SubscriptionPlan {
  return (
    typeof value === "string" &&
    allowedPlans.includes(
      value as SubscriptionPlan,
    )
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeInteger(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isInteger(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeAmount(
  value: number | string,
) {
  const amount =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function normalizeSubscription(
  data: unknown,
) {
  const possibleSubscription =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    typeof possibleSubscription !==
      "object" ||
    possibleSubscription === null
  ) {
    return null;
  }

  const subscription =
    possibleSubscription as {
      id?: unknown;
      owner_id?: unknown;
      plan?: unknown;
      status?: unknown;
      current_period_start?: unknown;
      current_period_end?: unknown;
      payment_provider?: unknown;
    };

  if (
    typeof subscription.id !==
      "string" ||
    typeof subscription.owner_id !==
      "string" ||
    typeof subscription.plan !==
      "string" ||
    typeof subscription.status !==
      "string"
  ) {
    return null;
  }

  return {
    id: subscription.id,
    owner_id:
      subscription.owner_id,
    plan: subscription.plan,
    status: subscription.status,

    current_period_start:
      typeof subscription.current_period_start ===
      "string"
        ? subscription.current_period_start
        : null,

    current_period_end:
      typeof subscription.current_period_end ===
      "string"
        ? subscription.current_period_end
        : null,

    payment_provider:
      typeof subscription.payment_provider ===
      "string"
        ? subscription.payment_provider
        : null,
  };
}

function mapActivationError(
  message: string,
) {
  if (
    message.includes(
      "ADMIN_ACCESS_DENIED",
    )
  ) {
    return {
      code: "ADMIN_ACCESS_DENIED",
      message:
        "У вас нет прав администратора.",
      status: 403,
    };
  }

  if (
    message.includes(
      "CUSTOMER_NOT_FOUND",
    )
  ) {
    return {
      code: "CUSTOMER_NOT_FOUND",
      message: "Клиент не найден.",
      status: 404,
    };
  }

  if (
    message.includes(
      "INVALID_PLAN",
    )
  ) {
    return {
      code: "INVALID_PLAN",
      message:
        "Выбран неправильный тариф.",
      status: 400,
    };
  }

  if (
    message.includes(
      "INVALID_SUBSCRIPTION_DURATION",
    )
  ) {
    return {
      code: "INVALID_DURATION",
      message:
        "Указан неправильный срок подписки.",
      status: 400,
    };
  }

  if (
    message.includes(
      "INVALID_PAYMENT_AMOUNT",
    )
  ) {
    return {
      code: "INVALID_AMOUNT",
      message:
        "Указана неправильная сумма.",
      status: 400,
    };
  }

  return {
    code: "DATABASE_ERROR",
    message:
      "Не удалось активировать подписку.",
    status: 500,
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}