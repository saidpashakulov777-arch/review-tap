import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { getOwnerSubscriptionAccess } from "@/lib/reviewtap-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBranchBody = {
  restaurantId?: unknown;
  name?: unknown;
  address?: unknown;
};

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
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
      "У вашей роли нет права создавать филиалы.",
      403,
    );
  }

  try {
    let body: CreateBranchBody;

    try {
      body =
        (await request.json()) as CreateBranchBody;
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const address =
      typeof body.address ===
      "string"
        ? body.address.trim()
        : "";

    if (!restaurantId) {
      return errorResponse(
        "Выберите ресторан.",
        400,
      );
    }

    if (!isUuid(restaurantId)) {
      return errorResponse(
        "Неправильный ID ресторана.",
        400,
      );
    }

    if (!name) {
      return errorResponse(
        "Введите название филиала.",
        400,
      );
    }

    if (name.length > 120) {
      return errorResponse(
        "Название филиала слишком длинное.",
        400,
      );
    }

    if (address.length > 250) {
      return errorResponse(
        "Адрес слишком длинный.",
        400,
      );
    }

    const {
      data: restaurantData,
      error: restaurantError,
    } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, owner_id, name",
      )
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
          ? "Нельзя создать новый филиал."
          : `Достигнут лимит тарифа: ${subscriptionAccess.branchCount} из ${limit} филиалов.`,
        409,
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("branches")
      .insert({
        restaurant_id:
          restaurantId,
        name,
        address:
          address || null,
      })
      .select(
        "id, restaurant_id, name, address, created_at",
      )
      .single();

    if (error) {
      return errorResponse(
        `Не удалось создать филиал: ${error.message}`,
        500,
      );
    }

    const branch =
      data as BranchRow;

    return NextResponse.json(
      {
        success: true,

        branch: {
          id: branch.id,

          restaurantId:
            branch.restaurant_id,

          restaurantName:
            restaurant.name,

          ownerId:
            restaurant.owner_id,

          name: branch.name,

          address:
            branch.address ?? "",

          createdAt:
            branch.created_at,
        },
      },
      noStoreOptions(201),
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Не удалось создать филиал.",
      500,
    );
  }
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
        `Не удалось проверить администратора: ${adminError.message}`,
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
    role: adminData.role ?? "admin",
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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