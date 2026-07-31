import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { getOwnerSubscriptionAccess } from "@/lib/reviewtap-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  restaurantId?: unknown;
};

type RestaurantRow = {
  id: string;
  name: string;
  owner_id: string | null;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
  address: string | null;
  created_at: string | null;
};

export async function POST(
  request: NextRequest,
) {
  const auth =
    await requireAdmin(request);

  if (!auth.success) {
    return auth.response;
  }

  if (
    auth.role !== "owner" &&
    auth.role !== "admin"
  ) {
    return errorResponse(
      "У вашей роли нет права создавать NFC-ссылки.",
      403,
    );
  }

  try {
    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return errorResponse(
        "Получены неправильные данные.",
        400,
      );
    }

    const restaurantId =
      typeof body.restaurantId ===
      "string"
        ? body.restaurantId.trim()
        : "";

    if (!restaurantId) {
      return errorResponse(
        "Выберите ресторан.",
        400,
      );
    }

    const {
      data: restaurantData,
      error: restaurantError,
    } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, owner_id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError) {
      return errorResponse(
        `Не удалось проверить ресторан: ${restaurantError.message}`,
        500,
      );
    }

    if (!restaurantData) {
      return errorResponse(
        "Ресторан не найден.",
        404,
      );
    }

    const restaurant =
      restaurantData as RestaurantRow;

    const {
      data: existingBranches,
      error: existingBranchError,
    } = await supabaseAdmin
      .from("branches")
      .select(
        "id, restaurant_id, name, address, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", {
        ascending: true,
      })
      .limit(1);

    if (existingBranchError) {
      return errorResponse(
        `Не удалось проверить точки ресторана: ${existingBranchError.message}`,
        500,
      );
    }

    const existingBranch =
      (
        existingBranches ??
        []
      )[0] as BranchRow | undefined;

    if (existingBranch) {
      return NextResponse.json(
        {
          success: true,
          created: false,

          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
          },

          branch: normalizeBranch(
            existingBranch,
          ),
        },
        noStoreOptions(200),
      );
    }

    if (!restaurant.owner_id) {
      return errorResponse(
        "У ресторана не указан владелец.",
        400,
      );
    }

    const subscriptionAccess =
      await getOwnerSubscriptionAccess(
        restaurant.owner_id,
      );

    if (
      !subscriptionAccess.isActive
    ) {
      return errorResponse(
        subscriptionAccess.reason ??
          "Подписка клиента неактивна.",
        403,
      );
    }

    if (
      !subscriptionAccess
        .canCreateBranch
    ) {
      const limit =
        subscriptionAccess.branchLimit;

      return errorResponse(
        limit === null
          ? "Нельзя создать основную точку."
          : `Достигнут лимит тарифа: ${subscriptionAccess.branchCount} из ${limit} филиалов.`,
        409,
      );
    }

    const {
      data: createdBranchData,
      error: createBranchError,
    } = await supabaseAdmin
      .from("branches")
      .insert({
        restaurant_id: restaurantId,
        name: "Основная точка",
        address: null,
      })
      .select(
        "id, restaurant_id, name, address, created_at",
      )
      .single();

    if (
      createBranchError ||
      !createdBranchData
    ) {
      return errorResponse(
        `Не удалось создать основную точку: ${
          createBranchError?.message ??
          "неизвестная ошибка"
        }`,
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,
        created: true,

        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
        },

        branch: normalizeBranch(
          createdBranchData as BranchRow,
        ),
      },
      noStoreOptions(201),
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Не удалось подготовить создание NFC-ссылки.",
      500,
    );
  }
}

function normalizeBranch(
  branch: BranchRow,
) {
  return {
    id: branch.id,

    restaurantId:
      branch.restaurant_id,

    name: branch.name,

    address:
      branch.address ?? "",

    createdAt:
      branch.created_at,
  };
}

async function requireAdmin(
  request: NextRequest,
): Promise<
  | {
      success: true;
      userId: string;
      role: string;
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

  const [scheme, token] =
    authorization
      ?.trim()
      .split(/\s+/) ?? [];

  if (
    scheme?.toLowerCase() !==
      "bearer" ||
    !token
  ) {
    return {
      success: false,

      response: errorResponse(
        "Необходимо войти в аккаунт.",
        401,
      ),
    };
  }

  const {
    data: userData,
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      token,
    );

  if (
    userError ||
    !userData.user
  ) {
    return {
      success: false,

      response: errorResponse(
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
    .select("role, is_active")
    .eq(
      "user_id",
      userData.user.id,
    )
    .maybeSingle();

  if (adminError) {
    return {
      success: false,

      response: errorResponse(
        `Не удалось проверить права администратора: ${adminError.message}`,
        500,
      ),
    };
  }

  if (
    !adminData ||
    adminData.is_active !== true
  ) {
    return {
      success: false,

      response: errorResponse(
        "Нет доступа к админ-панели.",
        403,
      ),
    };
  }

  return {
    success: true,
    userId: userData.user.id,

    role:
      typeof adminData.role ===
      "string"
        ? adminData.role
        : "admin",
  };
}

function noStoreOptions(
  status: number,
) {
  return {
    status,

    headers: {
      "Cache-Control":
        "no-store, max-age=0",
    },
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
    noStoreOptions(status),
  );
}