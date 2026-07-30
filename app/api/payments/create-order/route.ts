import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentPlan = "starter" | "pro";

type PaymentProvider =
  | "click"
  | "payme"
  | "uzum";

type CreateOrderBody = {
  plan?: unknown;
  provider?: unknown;
};

type PaymentOrder = {
  id: string;
  owner_id: string;
  plan: PaymentPlan;
  amount_uzs: number;
  currency: "UZS";
  provider: PaymentProvider;
  status: string;
  checkout_url: string | null;
  expires_at: string | null;
  created_at: string;
};

const allowedPlans: PaymentPlan[] = [
  "starter",
  "pro",
];

const allowedProviders: PaymentProvider[] = [
  "click",
  "payme",
  "uzum",
];

export async function POST(
  request: NextRequest,
) {
  try {
    const accessToken = getBearerToken(
      request.headers.get("authorization"),
    );

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "AUTHORIZATION_REQUIRED",
          message:
            "Войдите в аккаунт, чтобы продолжить оплату.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION",
          message:
            "Сессия истекла. Войдите в аккаунт снова.",
        },
        {
          status: 401,
        },
      );
    }

    const body = await readRequestBody(
      request,
    );

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_JSON",
          message:
            "Не удалось прочитать данные запроса.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isPaymentPlan(body.plan)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PLAN",
          message:
            "Выберите тариф Starter или Pro.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isPaymentProvider(body.provider)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "INVALID_PAYMENT_PROVIDER",
          message:
            "Выберите Click, Payme или Uzum.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } =
      await supabaseAdmin.rpc(
        "reviewtap_create_payment_order",
        {
          p_owner_id: userData.user.id,
          p_plan: body.plan,
          p_provider: body.provider,
        },
      );

    if (error) {
      const mappedError = mapDatabaseError(
        error.message,
      );

      return NextResponse.json(
        {
          success: false,
          error: mappedError.code,
          message: mappedError.message,
        },
        {
          status: mappedError.status,
        },
      );
    }

    const order =
      normalizePaymentOrder(data);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ORDER_CREATION_FAILED",
          message:
            "База данных вернула неправильные данные заказа.",
        },
        {
          status: 500,
        },
      );
    }

    let checkoutUrl: string | null =
      null;

    let providerConfigured = false;

    if (order.provider === "click") {
      const clickResult =
        createClickCheckoutUrl(
          request,
          order,
        );

      checkoutUrl =
        clickResult.checkoutUrl;

      providerConfigured =
        clickResult.configured;
    }

    /*
     * Payme и Uzum добавим отдельными
     * функциями на следующих этапах.
     */

    if (checkoutUrl) {
      const { error: updateError } =
        await supabaseAdmin
          .from("payment_orders")
          .update({
            checkout_url: checkoutUrl,
          })
          .eq("id", order.id)
          .eq(
            "owner_id",
            userData.user.id,
          );

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "CHECKOUT_URL_SAVE_FAILED",
            message:
              "Заказ создан, но не удалось сохранить ссылку оплаты.",
          },
          {
            status: 500,
          },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,

        message: checkoutUrl
          ? "Заказ создан. Переходим к оплате."
          : getProviderSetupMessage(
              order.provider,
            ),

        providerConfigured,

        order: {
          id: order.id,
          plan: order.plan,
          provider: order.provider,
          amountUzs:
            order.amount_uzs,
          currency: order.currency,
          status: order.status,
          checkoutUrl,
          expiresAt:
            order.expires_at,
          createdAt:
            order.created_at,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Неизвестная ошибка";

    return NextResponse.json(
      {
        success: false,
        error:
          "INTERNAL_SERVER_ERROR",
        message:
          "Произошла внутренняя ошибка: " +
          message,
      },
      {
        status: 500,
      },
    );
  }
}

function createClickCheckoutUrl(
  request: NextRequest,
  order: PaymentOrder,
) {
  const serviceId =
    process.env.CLICK_SERVICE_ID?.trim();

  const merchantId =
    process.env.CLICK_MERCHANT_ID?.trim();

  if (!serviceId || !merchantId) {
    return {
      configured: false,
      checkoutUrl: null,
    };
  }

  const applicationUrl =
    getApplicationUrl(request);

  const returnUrl = new URL(
    "/checkout/success",
    applicationUrl,
  );

  returnUrl.searchParams.set(
    "orderId",
    order.id,
  );

  returnUrl.searchParams.set(
    "provider",
    "click",
  );

  const clickUrl = new URL(
    "https://my.click.uz/services/pay",
  );

  clickUrl.searchParams.set(
    "service_id",
    serviceId,
  );

  clickUrl.searchParams.set(
    "merchant_id",
    merchantId,
  );

  clickUrl.searchParams.set(
    "amount",
    String(order.amount_uzs),
  );

  clickUrl.searchParams.set(
    "transaction_param",
    order.id,
  );

  clickUrl.searchParams.set(
    "return_url",
    returnUrl.toString(),
  );

  return {
    configured: true,
    checkoutUrl: clickUrl.toString(),
  };
}

function getApplicationUrl(
  request: NextRequest,
) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return removeTrailingSlash(
      configuredUrl,
    );
  }

  return request.nextUrl.origin;
}

function removeTrailingSlash(
  value: string,
) {
  return value.replace(/\/+$/, "");
}

function getProviderSetupMessage(
  provider: PaymentProvider,
) {
  switch (provider) {
    case "click":
      return "Заказ создан. Для перехода к оплате добавьте данные Click в .env.local.";

    case "payme":
      return "Заказ создан. Интеграцию Payme подключим следующим этапом.";

    case "uzum":
      return "Заказ создан. Интеграцию Uzum подключим следующим этапом.";
  }
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

async function readRequestBody(
  request: NextRequest,
): Promise<CreateOrderBody | null> {
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

    return body as CreateOrderBody;
  } catch {
    return null;
  }
}

function isPaymentPlan(
  value: unknown,
): value is PaymentPlan {
  return (
    typeof value === "string" &&
    allowedPlans.includes(
      value as PaymentPlan,
    )
  );
}

function isPaymentProvider(
  value: unknown,
): value is PaymentProvider {
  return (
    typeof value === "string" &&
    allowedProviders.includes(
      value as PaymentProvider,
    )
  );
}

function normalizePaymentOrder(
  data: unknown,
): PaymentOrder | null {
  const possibleOrder =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    typeof possibleOrder !==
      "object" ||
    possibleOrder === null
  ) {
    return null;
  }

  const order = possibleOrder as {
    id?: unknown;
    owner_id?: unknown;
    plan?: unknown;
    amount_uzs?: unknown;
    currency?: unknown;
    provider?: unknown;
    status?: unknown;
    checkout_url?: unknown;
    expires_at?: unknown;
    created_at?: unknown;
  };

  const amountUzs =
    normalizeNumber(
      order.amount_uzs,
    );

  if (
    typeof order.id !== "string" ||
    typeof order.owner_id !==
      "string" ||
    !isPaymentPlan(order.plan) ||
    amountUzs === null ||
    order.currency !== "UZS" ||
    !isPaymentProvider(
      order.provider,
    ) ||
    typeof order.status !==
      "string" ||
    typeof order.created_at !==
      "string"
  ) {
    return null;
  }

  return {
    id: order.id,
    owner_id: order.owner_id,
    plan: order.plan,
    amount_uzs: amountUzs,
    currency: "UZS",
    provider: order.provider,
    status: order.status,

    checkout_url:
      typeof order.checkout_url ===
      "string"
        ? order.checkout_url
        : null,

    expires_at:
      typeof order.expires_at ===
      "string"
        ? order.expires_at
        : null,

    created_at:
      order.created_at,
  };
}

function normalizeNumber(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function mapDatabaseError(
  message: string,
) {
  if (
    message.includes(
      "OWNER_NOT_FOUND",
    )
  ) {
    return {
      code: "OWNER_NOT_FOUND",
      message:
        "Пользователь не найден.",
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
      "INVALID_PAYMENT_PROVIDER",
    )
  ) {
    return {
      code:
        "INVALID_PAYMENT_PROVIDER",
      message:
        "Выбран неправильный способ оплаты.",
      status: 400,
    };
  }

  if (
    message.includes(
      "PLAN_NOT_AVAILABLE",
    )
  ) {
    return {
      code:
        "PLAN_NOT_AVAILABLE",
      message:
        "Тариф временно недоступен.",
      status: 409,
    };
  }

  if (
    message.includes(
      "PLAN_PRICE_NOT_CONFIGURED",
    )
  ) {
    return {
      code:
        "PLAN_PRICE_NOT_CONFIGURED",
      message:
        "Цена тарифа не настроена.",
      status: 409,
    };
  }

  return {
    code: "DATABASE_ERROR",
    message:
      "Не удалось создать заказ на оплату.",
    status: 500,
  };
}