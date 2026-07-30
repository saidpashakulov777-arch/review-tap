import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function GET(
  request: NextRequest,
) {
  const auth = await requireUser(request);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const {
      data: restaurantData,
      error: restaurantError,
    } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, owner_id, name, created_at",
      )
      .eq("owner_id", auth.userId)
      .order("created_at", {
        ascending: false,
      });

    if (restaurantError) {
      return errorResponse(
        `Не удалось загрузить рестораны: ${restaurantError.message}`,
        500,
      );
    }

    const restaurants =
      (restaurantData ??
        []) as RestaurantRow[];

    const restaurantIds =
      restaurants.map(
        (restaurant) => restaurant.id,
      );

    const branchCountByRestaurant =
      new Map<string, number>();

    if (restaurantIds.length > 0) {
      const {
        data: branchData,
        error: branchError,
      } = await supabaseAdmin
        .from("branches")
        .select("id, restaurant_id")
        .in(
          "restaurant_id",
          restaurantIds,
        );

      if (branchError) {
        return errorResponse(
          `Не удалось загрузить филиалы: ${branchError.message}`,
          500,
        );
      }

      const branches =
        (branchData ?? []) as BranchRow[];

      for (const branch of branches) {
        if (!branch.restaurant_id) {
          continue;
        }

        branchCountByRestaurant.set(
          branch.restaurant_id,
          (
            branchCountByRestaurant.get(
              branch.restaurant_id,
            ) ?? 0
          ) + 1,
        );
      }
    }

    const normalizedRestaurants =
      restaurants.map(
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
      );

    return NextResponse.json(
      {
        success: true,
        restaurants:
          normalizedRestaurants,
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
      getErrorMessage(
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
  const auth = await requireUser(request);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const body =
      (await request.json()) as CreateRestaurantBody;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return errorResponse(
        "Введите название ресторана.",
        400,
      );
    }

    if (name.length > 120) {
      return errorResponse(
        "Название ресторана слишком длинное.",
        400,
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("restaurants")
      .insert({
        owner_id: auth.userId,
        name,
      })
      .select(
        "id, owner_id, name, created_at",
      )
      .single();

    if (error) {
      return errorResponse(
        `Не удалось создать ресторан: ${error.message}`,
        500,
      );
    }

    const restaurant =
      data as RestaurantRow;

    return NextResponse.json(
      {
        success: true,

        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          createdAt:
            restaurant.created_at,
          branchCount: 0,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(
      getErrorMessage(
        error,
        "Не удалось создать ресторан.",
      ),
      500,
    );
  }
}

async function requireUser(
  request: NextRequest,
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

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token,
    );

  if (error || !data.user) {
    return {
      success: false,

      response: errorResponse(
        "Сессия истекла. Войдите снова.",
        401,
      ),
    };
  }

  return {
    success: true,
    userId: data.user.id,
    email: data.user.email ?? "",
  };
}

function getBearerToken(
  authorization: string | null,
) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization
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