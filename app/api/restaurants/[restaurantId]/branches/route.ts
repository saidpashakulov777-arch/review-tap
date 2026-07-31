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
  name: string;
  address: string | null;
  created_at: string | null;
};

type CreateBranchBody = {
  name?: unknown;
  address?: unknown;
};

type RouteContext = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireUser(request);

  if (!auth.success) {
    return auth.response;
  }

  const { restaurantId } =
    await context.params;

  if (!restaurantId) {
    return errorResponse(
      "Не указан ресторан.",
      400,
    );
  }

  try {
    const restaurantResult =
      await getOwnedRestaurant(
        restaurantId,
        auth.userId,
      );

    if (!restaurantResult.success) {
      return restaurantResult.response;
    }

    const {
      data: branchData,
      error: branchError,
    } = await supabaseAdmin
      .from("branches")
      .select(
        "id, restaurant_id, name, address, created_at",
      )
      .eq(
        "restaurant_id",
        restaurantId,
      )
      .order("created_at", {
        ascending: false,
      });

    if (branchError) {
      return errorResponse(
        `Не удалось загрузить филиалы: ${branchError.message}`,
        500,
      );
    }

    const branches =
      (branchData ?? []) as BranchRow[];

    return NextResponse.json(
      {
        success: true,

        restaurant: normalizeRestaurant(
          restaurantResult.restaurant,
        ),

        branches: branches.map(
          normalizeBranch,
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
      getErrorMessage(
        error,
        "Не удалось загрузить филиалы.",
      ),
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return errorResponse(
    "Создание филиалов доступно только администратору ReviewTap.",
    403,
  );
}

async function getOwnedRestaurant(
  restaurantId: string,
  userId: string,
): Promise<
  | {
      success: true;
      restaurant: RestaurantRow;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("restaurants")
    .select(
      "id, owner_id, name, created_at",
    )
    .eq("id", restaurantId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    return {
      success: false,

      response: errorResponse(
        `Не удалось проверить ресторан: ${error.message}`,
        500,
      ),
    };
  }

  if (!data) {
    return {
      success: false,

      response: errorResponse(
        "Ресторан не найден или принадлежит другому пользователю.",
        404,
      ),
    };
  }

  return {
    success: true,
    restaurant: data as RestaurantRow,
  };
}

async function requireUser(
  request: NextRequest,
): Promise<
  | {
      success: true;
      userId: string;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const token = getBearerToken(
    request.headers.get(
      "authorization",
    ),
  );

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

function normalizeRestaurant(
  restaurant: RestaurantRow,
) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    createdAt:
      restaurant.created_at,
  };
}

function normalizeBranch(
  branch: BranchRow,
) {
  return {
    id: branch.id,
    restaurantId:
      branch.restaurant_id,
    name: branch.name,
    address: branch.address ?? "",
    createdAt: branch.created_at,
  };
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
