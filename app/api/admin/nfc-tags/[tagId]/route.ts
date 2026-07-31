import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    tagId: string;
  }>;
};

type TagRow = {
  id: string;
  branch_id: string | null;
  name: string | null;
  code: string;
  google_review_url: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type UpdateTagBody = {
  name?: unknown;
  googleReviewUrl?: unknown;
  isActive?: unknown;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth =
    await requireAdmin(request);

  if (!auth.success) {
    return auth.response;
  }

  const { tagId } =
    await context.params;

  if (!tagId) {
    return errorResponse(
      "Не указана NFC-метка.",
      400,
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("nfc_tags")
    .select(
      "id, branch_id, name, code, google_review_url, is_active, created_at, updated_at",
    )
    .eq("id", tagId)
    .maybeSingle();

  if (error) {
    return errorResponse(
      `Не удалось загрузить NFC-метку: ${error.message}`,
      500,
    );
  }

  if (!data) {
    return errorResponse(
      "NFC-метка не найдена.",
      404,
    );
  }

  return NextResponse.json(
    {
      success: true,
      tag: normalizeTag(
        data as TagRow,
      ),
    },
    noStoreOptions(200),
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
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
      "У вашей роли нет права изменять NFC-метки.",
      403,
    );
  }

  const { tagId } =
    await context.params;

  if (!tagId) {
    return errorResponse(
      "Не указана NFC-метка.",
      400,
    );
  }

  let body: UpdateTagBody;

  try {
    body =
      (await request.json()) as UpdateTagBody;
  } catch {
    return errorResponse(
      "Получены неправильные данные.",
      400,
    );
  }

  const updateData: {
    name?: string;
    google_review_url?: string;
    is_active?: boolean;
  } = {};

  if (body.name !== undefined) {
    if (
      typeof body.name !== "string"
    ) {
      return errorResponse(
        "Неправильное название метки.",
        400,
      );
    }

    const name = body.name.trim();

    if (!name) {
      return errorResponse(
        "Введите название NFC-метки.",
        400,
      );
    }

    if (name.length > 120) {
      return errorResponse(
        "Название NFC-метки слишком длинное.",
        400,
      );
    }

    updateData.name = name;
  }

  if (
    body.googleReviewUrl !==
    undefined
  ) {
    if (
      typeof body.googleReviewUrl !==
      "string"
    ) {
      return errorResponse(
        "Неправильная Google-ссылка.",
        400,
      );
    }

    const googleReviewUrl =
      normalizeGoogleUrl(
        body.googleReviewUrl.trim(),
      );

    if (!googleReviewUrl) {
      return errorResponse(
        "Введите правильную HTTPS-ссылку Google или Google Maps.",
        400,
      );
    }

    updateData.google_review_url =
      googleReviewUrl;
  }

  if (body.isActive !== undefined) {
    if (
      typeof body.isActive !==
      "boolean"
    ) {
      return errorResponse(
        "Неправильный статус NFC-метки.",
        400,
      );
    }

    updateData.is_active =
      body.isActive;
  }

  if (
    Object.keys(updateData).length ===
    0
  ) {
    return errorResponse(
      "Нет изменений для сохранения.",
      400,
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("nfc_tags")
    .update(updateData)
    .eq("id", tagId)
    .select(
      "id, branch_id, name, code, google_review_url, is_active, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    return errorResponse(
      `Не удалось изменить NFC-метку: ${error.message}`,
      500,
    );
  }

  if (!data) {
    return errorResponse(
      "NFC-метка не найдена.",
      404,
    );
  }

  return NextResponse.json(
    {
      success: true,
      tag: normalizeTag(
        data as TagRow,
      ),
    },
    noStoreOptions(200),
  );
}

function normalizeTag(
  tag: TagRow,
) {
  return {
    id: tag.id,
    branchId: tag.branch_id,

    name:
      tag.name?.trim() ||
      "NFC-метка",

    code: tag.code,

    googleReviewUrl:
      tag.google_review_url,

    publicPath:
      `/t/${tag.code}`,

    isActive:
      tag.is_active,

    createdAt:
      tag.created_at,

    updatedAt:
      tag.updated_at,
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