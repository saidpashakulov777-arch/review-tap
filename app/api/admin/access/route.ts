import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminRole =
  | "owner"
  | "admin"
  | "support";

type AdminUserRow = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
};

export async function GET(
  request: NextRequest,
) {
  try {
    const token = getBearerToken(
      request.headers.get("authorization"),
    );

    if (!token) {
      return createResponse(
        false,
        "AUTHORIZATION_REQUIRED",
        "Войдите в аккаунт.",
        401,
      );
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      token,
    );

    if (
      userError ||
      !userData.user
    ) {
      return createResponse(
        false,
        "INVALID_SESSION",
        "Сессия истекла. Войдите снова.",
        401,
      );
    }

    const {
      data: adminData,
      error: adminError,
    } = await supabaseAdmin
      .from("admin_users")
      .select("user_id, role, is_active")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (
      adminError ||
      !adminData
    ) {
      return createResponse(
        false,
        "ADMIN_ACCESS_DENIED",
        "У вас нет доступа к админ-панели.",
        403,
      );
    }

    const admin =
      adminData as unknown as AdminUserRow;

    if (
      !admin.is_active ||
      !isAdminRole(admin.role)
    ) {
      return createResponse(
        false,
        "ADMIN_ACCESS_DISABLED",
        "Доступ администратора отключён.",
        403,
      );
    }

    return NextResponse.json(
      {
        success: true,

        admin: {
          userId: userData.user.id,
          email:
            userData.user.email ?? "",
          role: admin.role,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return createResponse(
      false,
      "INTERNAL_SERVER_ERROR",
      "Не удалось проверить права администратора.",
      500,
    );
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

function isAdminRole(
  value: unknown,
): value is AdminRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "support"
  );
}

function createResponse(
  success: boolean,
  error: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success,
      error,
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