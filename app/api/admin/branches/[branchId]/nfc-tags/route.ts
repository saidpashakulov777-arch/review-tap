import { randomBytes } from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    branchId: string;
  }>;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
  address: string | null;
  created_at: string | null;
};

type RestaurantRow = {
  id: string;
  name: string;
  owner_id: string | null;
};

type NfcTagRow = {
  id: string;
  branch_id: string | null;
  code: string;
  google_review_url: string;
  created_at: string | null;
};

type TapEventRow = {
  nfc_tag_id: string;
};

type CreateTagBody = {
  googleReviewUrl?: unknown;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (!auth.success) {
    return auth.response;
  }

  const { branchId } = await context.params;

  if (!branchId) {
    return errorResponse(
      "Не указан филиал.",
      400,
    );
  }

  try {
    const branchResult =
      await getBranchDetails(branchId);

    if (!branchResult.success) {
      return branchResult.response;
    }

    const {
      data: tagData,
      error: tagError,
    } = await supabaseAdmin
      .from("nfc_tags")
      .select(
        "id, branch_id, code, google_review_url, created_at",
      )
      .eq("branch_id", branchId)
      .order("created_at", {
        ascending: false,
      });

    if (tagError) {
      return errorResponse(
        `Не удалось загрузить NFC-метки: ${tagError.message}`,
        500,
      );
    }

    const tags =
      (tagData ?? []) as NfcTagRow[];

    const tapCountByTag =
      new Map<string, number>();

    const tagIds = tags.map(
      (tag) => tag.id,
    );

    if (tagIds.length > 0) {
      const {
        data: eventData,
        error: eventError,
      } = await supabaseAdmin
        .from("tap_events")
        .select("nfc_tag_id")
        .eq("event_type", "tap")
        .in("nfc_tag_id", tagIds);

      if (eventError) {
        return errorResponse(
          `Не удалось загрузить переходы: ${eventError.message}`,
          500,
        );
      }

      const events =
        (eventData ?? []) as TapEventRow[];

      for (const event of events) {
        tapCountByTag.set(
          event.nfc_tag_id,
          (
            tapCountByTag.get(
              event.nfc_tag_id,
            ) ?? 0
          ) + 1,
        );
      }
    }

    return NextResponse.json(
      {
        success: true,

        branch: {
          id: branchResult.branch.id,
          name: branchResult.branch.name,
          address:
            branchResult.branch.address ?? "",
          restaurantId:
            branchResult.restaurant.id,
          restaurantName:
            branchResult.restaurant.name,
          ownerId:
            branchResult.restaurant.owner_id,
        },

        tags: tags.map((tag) => ({
          id: tag.id,
          code: tag.code,
          googleReviewUrl:
            tag.google_review_url,
          publicPath: `/t/${tag.code}`,
          createdAt: tag.created_at,
          tapCount:
            tapCountByTag.get(tag.id) ??
            0,
        })),
      },
      noStoreOptions(200),
    );
  } catch (error) {
    return errorResponse(
      getErrorMessage(
        error,
        "Не удалось загрузить NFC-метки.",
      ),
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (!auth.success) {
    return auth.response;
  }

  const { branchId } = await context.params;

  if (!branchId) {
    return errorResponse(
      "Не указан филиал.",
      400,
    );
  }

  try {
    const branchResult =
      await getBranchDetails(branchId);

    if (!branchResult.success) {
      return branchResult.response;
    }

    let body: CreateTagBody;

    try {
      body =
        (await request.json()) as CreateTagBody;
    } catch {
      return errorResponse(
        "Получены неправильные данные.",
        400,
      );
    }

    const rawUrl =
      typeof body.googleReviewUrl ===
      "string"
        ? body.googleReviewUrl.trim()
        : "";

    const googleReviewUrl =
      normalizeGoogleUrl(rawUrl);

    if (!googleReviewUrl) {
      return errorResponse(
        "Введите правильную HTTPS-ссылку Google или Google Maps.",
        400,
      );
    }

    let createdTag:
      | NfcTagRow
      | null = null;

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const code = randomBytes(8).toString(
        "base64url",
      );

      const {
        data,
        error,
      } = await supabaseAdmin
        .from("nfc_tags")
        .insert({
          branch_id: branchId,
          code,
          google_review_url:
            googleReviewUrl,
        })
        .select(
          "id, branch_id, code, google_review_url, created_at",
        )
        .single();

      if (!error && data) {
        createdTag =
          data as NfcTagRow;
        break;
      }

      if (error?.code === "23505") {
        continue;
      }

      return errorResponse(
        `Не удалось создать NFC-метку: ${
          error?.message ??
          "неизвестная ошибка"
        }`,
        500,
      );
    }

    if (!createdTag) {
      return errorResponse(
        "Не удалось создать уникальный NFC-код.",
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,

        tag: {
          id: createdTag.id,
          code: createdTag.code,
          googleReviewUrl:
            createdTag.google_review_url,
          publicPath:
            `/t/${createdTag.code}`,
          createdAt:
            createdTag.created_at,
          tapCount: 0,
        },
      },
      noStoreOptions(201),
    );
  } catch (error) {
    return errorResponse(
      getErrorMessage(
        error,
        "Не удалось создать NFC-метку.",
      ),
      500,
    );
  }
}

async function getBranchDetails(
  branchId: string,
): Promise<
  | {
      success: true;
      branch: BranchRow;
      restaurant: RestaurantRow;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const {
    data: branchData,
    error: branchError,
  } = await supabaseAdmin
    .from("branches")
    .select(
      "id, restaurant_id, name, address, created_at",
    )
    .eq("id", branchId)
    .maybeSingle();

  if (branchError) {
    return {
      success: false,
      response: errorResponse(
        `Не удалось загрузить филиал: ${branchError.message}`,
        500,
      ),
    };
  }

  if (
    !branchData ||
    !branchData.restaurant_id
  ) {
    return {
      success: false,
      response: errorResponse(
        "Филиал не найден.",
        404,
      ),
    };
  }

  const branch =
    branchData as BranchRow;

  const {
    data: restaurantData,
    error: restaurantError,
  } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, owner_id")
    .eq(
      "id",
      branch.restaurant_id,
    )
    .maybeSingle();

  if (restaurantError) {
    return {
      success: false,
      response: errorResponse(
        `Не удалось загрузить ресторан: ${restaurantError.message}`,
        500,
      ),
    };
  }

  if (!restaurantData) {
    return {
      success: false,
      response: errorResponse(
        "Ресторан филиала не найден.",
        404,
      ),
    };
  }

  return {
    success: true,
    branch,
    restaurant:
      restaurantData as RestaurantRow,
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
    role: adminData.role ?? "admin",
  };
}

function normalizeGoogleUrl(
  value: string,
) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    const hostname =
      url.hostname.toLowerCase();

    const allowed =
      /(^|\.)google\.[a-z.]+$/.test(
        hostname,
      ) ||
      hostname === "g.page" ||
      hostname.endsWith(".g.page") ||
      hostname === "goo.gl" ||
      hostname.endsWith(".goo.gl");

    return allowed
      ? url.toString()
      : null;
  } catch {
    return null;
  }
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