import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
  created_at: string | null;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
};

type CreateRestaurantBody = {
  name?: unknown;
};

type AuthUserResponse = {
  id?: string;
  email?: string;
  message?: string;
  msg?: string;
  error?: string;
};

export async function GET(
  request: NextRequest,
) {
  try {
    const config = getSupabaseConfig();

    if (!config.success) {
      return config.response;
    }

    const auth = await getAuthenticatedUser(
      request,
      config.url,
      config.publicKey,
    );

    if (!auth.success) {
      return auth.response;
    }

    const restaurantsResponse = await fetch(
      `${config.url}/rest/v1/restaurants?select=id,owner_id,name,created_at&owner_id=eq.${encodeURIComponent(
        auth.userId,
      )}&order=created_at.desc`,
      {
        method: "GET",

        headers: {
          apikey: config.serviceKey,
          Authorization:
            `Bearer ${config.serviceKey}`,
          Accept: "application/json",
        },

        cache: "no-store",
      },
    );

    const restaurantsText =
      await restaurantsResponse.text();

    if (!restaurantsResponse.ok) {
      return errorResponse(
        getApiError(
          restaurantsText,
          `Не удалось загрузить рестораны. HTTP ${restaurantsResponse.status}`,
        ),
        restaurantsResponse.status,
      );
    }

    const restaurants =
      parseArray<RestaurantRow>(
        restaurantsText,
      );

    const branchesResponse = await fetch(
      `${config.url}/rest/v1/branches?select=id,restaurant_id`,
      {
        method: "GET",

        headers: {
          apikey: config.serviceKey,
          Authorization:
            `Bearer ${config.serviceKey}`,
          Accept: "application/json",
        },

        cache: "no-store",
      },
    );

    const branchesText =
      await branchesResponse.text();

    if (!branchesResponse.ok) {
      return errorResponse(
        getApiError(
          branchesText,
          `Не удалось загрузить филиалы. HTTP ${branchesResponse.status}`,
        ),
        branchesResponse.status,
      );
    }

    const allBranches =
      parseArray<BranchRow>(
        branchesText,
      );

    const restaurantIds = new Set(
      restaurants.map(
        (restaurant) => restaurant.id,
      ),
    );

    const branchCountByRestaurant =
      new Map<string, number>();

    for (const branch of allBranches) {
      const restaurantId =
        branch.restaurant_id;

      if (
        !restaurantId ||
        !restaurantIds.has(restaurantId)
      ) {
        continue;
      }

      branchCountByRestaurant.set(
        restaurantId,
        (
          branchCountByRestaurant.get(
            restaurantId,
          ) ?? 0
        ) + 1,
      );
    }

    return NextResponse.json(
      {
        success: true,

        restaurants: restaurants.map(
          (restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
            createdAt:
              restaurant.created_at,
            branchCount:
              branchCountByRestaurant.get(
                restaurant.id,
              ) ?? 0,
          }),
        ),
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(
      getUnknownError(
        error,
        "Не удалось загрузить рестораны.",
      ),
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  return errorResponse(
    "Создание ресторанов доступно только администратору ReviewTap.",
    403,
  );
}

async function getAuthenticatedUser(
  request: NextRequest,
  supabaseUrl: string,
  publicKey: string,
): Promise<
  | {
      success: true;
      userId: string;
      email: string;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const authorization =
    request.headers.get(
      "authorization",
    );

  const token =
    getBearerToken(authorization);

  if (!token) {
    return {
      success: false,

      response: errorResponse(
        "Необходимо войти в аккаунт.",
        401,
      ),
    };
  }

  let authResponse: Response;

  try {
    authResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",

        headers: {
          apikey: publicKey,
          Authorization:
            `Bearer ${token}`,
          Accept: "application/json",
        },

        cache: "no-store",
      },
    );
  } catch (error) {
    return {
      success: false,

      response: errorResponse(
        getUnknownError(
          error,
          "Не удалось проверить сессию.",
        ),
        502,
      ),
    };
  }

  const authText =
    await authResponse.text();

  if (!authResponse.ok) {
    return {
      success: false,

      response: errorResponse(
        getApiError(
          authText,
          "Сессия истекла. Войдите снова.",
        ),
        401,
      ),
    };
  }

  const user =
    parseObject<AuthUserResponse>(
      authText,
    );

  if (!user.id) {
    return {
      success: false,

      response: errorResponse(
        "Supabase не вернул данные пользователя.",
        401,
      ),
    };
  }

  return {
    success: true,
    userId: user.id,
    email: user.email ?? "",
  };
}

function getSupabaseConfig():
  | {
      success: true;
      url: string;
      publicKey: string;
      serviceKey: string;
    }
  | {
      success: false;
      response: NextResponse;
    } {
  const rawUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const publicKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY ||
    process.env
      .SUPABASE_SERVICE_KEY;

  if (!rawUrl) {
    return {
      success: false,

      response: errorResponse(
        "В .env.local отсутствует NEXT_PUBLIC_SUPABASE_URL.",
        500,
      ),
    };
  }

  if (!publicKey) {
    return {
      success: false,

      response: errorResponse(
        "В .env.local отсутствует публичный ключ Supabase.",
        500,
      ),
    };
  }

  if (!serviceKey) {
    return {
      success: false,

      response: errorResponse(
        "В .env.local отсутствует SUPABASE_SERVICE_ROLE_KEY.",
        500,
      ),
    };
  }

  const url =
    rawUrl.trim().replace(/\/+$/, "");

  if (
    !url.startsWith("https://") ||
    !url.includes(".supabase.co")
  ) {
    return {
      success: false,

      response: errorResponse(
        "NEXT_PUBLIC_SUPABASE_URL имеет неправильный формат.",
        500,
      ),
    };
  }

  return {
    success: true,
    url,
    publicKey: publicKey.trim(),
    serviceKey: serviceKey.trim(),
  };
}

function getBearerToken(
  authorization: string | null,
) {
  if (!authorization) {
    return null;
  }

  const parts =
    authorization
      .trim()
      .split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !==
      "bearer"
  ) {
    return null;
  }

  return parts[1];
}

function parseArray<T>(
  text: string,
): T[] {
  if (!text) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(text) as unknown;

    return Array.isArray(parsed)
      ? (parsed as T[])
      : [];
  } catch {
    return [];
  }
}

function parseObject<T>(
  text: string,
): T {
  try {
    const parsed =
      JSON.parse(text) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as T;
    }
  } catch {
    // Ниже возвращается пустой объект.
  }

  return {} as T;
}

function getApiError(
  text: string,
  fallback: string,
) {
  const result =
    parseObject<Record<string, unknown>>(
      text,
    );

  const fields = [
    result.message,
    result.msg,
    result.error_description,
    result.error,
    result.details,
    result.hint,
  ];

  for (const field of fields) {
    if (
      typeof field === "string" &&
      field.trim()
    ) {
      return field.trim();
    }
  }

  return fallback;
}

function getUnknownError(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  return fallback;
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
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