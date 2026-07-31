import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateRestaurantBody = {
  ownerId?: unknown;
  name?: unknown;
};

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
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
      "У вашей роли нет права создавать рестораны.",
      403,
    );
  }

  try {
    let body: CreateRestaurantBody;

    try {
      body =
        (await request.json()) as CreateRestaurantBody;
    } catch {
      return errorResponse(
        "Сервер получил неправильные данные.",
        400,
      );
    }

    const ownerId =
      typeof body.ownerId === "string"
        ? body.ownerId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!ownerId) {
      return errorResponse(
        "Выберите клиента.",
        400,
      );
    }

    if (!isUuid(ownerId)) {
      return errorResponse(
        "У клиента неправильный идентификатор.",
        400,
      );
    }

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
      data: customerData,
      error: customerError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        ownerId,
      );

    if (
      customerError ||
      !customerData.user
    ) {
      return errorResponse(
        "Выбранный клиент не найден.",
        404,
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("restaurants")
      .insert({
        owner_id: ownerId,
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

    await writeAuditLog({
      adminUserId: auth.userId,
      action:
        "restaurant_created",
      targetId: restaurant.id,
      metadata: {
        restaurantName:
          restaurant.name,
        ownerId,
        ownerEmail:
          customerData.user.email ??
          null,
      },
    });

    return NextResponse.json(
      {
        success: true,

        restaurant: {
          id: restaurant.id,
          ownerId:
            restaurant.owner_id,
          ownerEmail:
            customerData.user.email ??
            "",
          name: restaurant.name,
          createdAt:
            restaurant.created_at,
          branchCount: 0,
        },
      },
      noStoreOptions(201),
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

async function writeAuditLog({
  adminUserId,
  action,
  targetId,
  metadata,
}: {
  adminUserId: string;
  action: string;
  targetId: string;
  metadata: Record<
    string,
    unknown
  >;
}) {
  try {
    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_user_id:
          adminUserId,
        action,
        target_type:
          "restaurant",
        target_id: targetId,
        metadata,
      });
  } catch {
    // Ошибка журнала не должна
    // отменять создание ресторана.
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  return error instanceof Error &&
    error.message.trim()
    ? error.message
    : fallback;
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