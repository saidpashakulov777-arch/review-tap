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

type CreateTagBody = {
  googleReviewUrl?: unknown;
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
  owner_id: string | null;
  name: string;
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

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireUser(request);

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
    const ownership =
      await getOwnedBranch(
        branchId,
        auth.userId,
      );

    if (!ownership.success) {
      return ownership.response;
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

    const tagIds = tags.map(
      (tag) => tag.id,
    );

    const tapCountByTag =
      new Map<string, number>();

    if (tagIds.length > 0) {
      const {
        data: eventData,
        error: eventError,
      } = await supabaseAdmin
        .from("tap_events")
        .select("nfc_tag_id")
        .in("nfc_tag_id", tagIds);

      if (eventError) {
        return errorResponse(
          `Не удалось загрузить статистику: ${eventError.message}`,
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
          id: ownership.branch.id,
          restaurantId:
            ownership.branch.restaurant_id,
          restaurantName:
            ownership.restaurant.name,
          name: ownership.branch.name,
          address:
            ownership.branch.address ?? "",
          createdAt:
            ownership.branch.created_at,
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
  const auth = await requireUser(request);

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
    const ownership =
      await getOwnedBranch(
        branchId,
        auth.userId,
      );

    if (!ownership.success) {
      return ownership.response;
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
      normalizeGoogleReviewUrl(rawUrl);

    if (!googleReviewUrl) {
      return errorResponse(
        "Введите правильную HTTPS-ссылку Google Reviews или Google Maps.",
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
      const code = createTagCode();

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
        "Не удалось создать NFC-метку.",
      ),
      500,
    );
  }
}

async function getOwnedBranch(
  branchId: string,
  userId: string,
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
        `Не удалось проверить филиал: ${branchError.message}`,
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
    .select("id, owner_id, name")
    .eq(
      "id",
      branch.restaurant_id,
    )
    .eq("owner_id", userId)
    .maybeSingle();

  if (restaurantError) {
    return {
      success: false,
      response: errorResponse(
        `Не удалось проверить ресторан: ${restaurantError.message}`,
        500,
      ),
    };
  }

  if (!restaurantData) {
    return {
      success: false,
      response: errorResponse(
        "Филиал принадлежит другому пользователю.",
        403,
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

function normalizeGoogleReviewUrl(
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

    const isGoogleDomain =
      /(^|\.)google\.[a-z.]+$/.test(
        hostname,
      );

    const isShortGoogleDomain =
      hostname === "g.page" ||
      hostname.endsWith(".g.page") ||
      hostname === "goo.gl" ||
      hostname.endsWith(".goo.gl");

    if (
      !isGoogleDomain &&
      !isShortGoogleDomain
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function createTagCode() {
  return randomBytes(8).toString(
    "base64url",
  );
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