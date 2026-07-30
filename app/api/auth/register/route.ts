import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
};

type JsonObject = Record<string, unknown>;

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as RegisterBody;

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!fullName) {
      return errorResponse(
        "Введите ваше имя.",
        400,
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return errorResponse(
        "Введите правильный email.",
        400,
      );
    }

    if (password.length < 6) {
      return errorResponse(
        "Пароль должен содержать минимум 6 символов.",
        400,
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return errorResponse(
        "Не настроен адрес Supabase.",
        500,
      );
    }

    if (!supabaseKey) {
      return errorResponse(
        "Не настроен публичный ключ Supabase.",
        500,
      );
    }

    const cleanUrl =
      supabaseUrl.replace(/\/+$/, "");

    const authResponse = await fetch(
      `${cleanUrl}/auth/v1/signup`,
      {
        method: "POST",

        headers: {
          apikey: supabaseKey,
          Authorization:
            `Bearer ${supabaseKey}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password,

          data: {
            full_name: fullName,
          },
        }),

        cache: "no-store",
      },
    );

    const responseText =
      await authResponse.text();

    const authResult =
      parseJson(responseText);

    if (!authResponse.ok) {
      const errorMessage =
        getString(authResult, [
          "msg",
          "message",
          "error_description",
          "error",
          "code",
        ]) ||
        `Supabase вернул ошибку ${authResponse.status}.`;

      return errorResponse(
        translateAuthError(
          errorMessage,
        ),
        authResponse.status,
      );
    }

    /*
     * Supabase может вернуть:
     *
     * 1. { user: {...}, session: {...} }
     * 2. Сам объект пользователя:
     *    { id, email, role, ... }
     */

    const nestedUser =
      getObject(authResult, "user");

    const user =
      getString(nestedUser, ["id"])
        ? nestedUser
        : authResult;

    const nestedSession =
      getObject(authResult, "session");

    const userId =
      getString(user, ["id"]);

    const userEmail =
      getString(user, ["email"]) ||
      email;

    const accessToken =
      getString(authResult, [
        "access_token",
      ]) ||
      getString(nestedSession, [
        "access_token",
      ]);

    const refreshToken =
      getString(authResult, [
        "refresh_token",
      ]) ||
      getString(nestedSession, [
        "refresh_token",
      ]);

    if (!userId) {
      return errorResponse(
        "Supabase не вернул ID созданного пользователя.",
        502,
      );
    }

    return NextResponse.json(
      {
        success: true,

        user: {
          id: userId,
          email: userEmail,
        },

        session:
          accessToken && refreshToken
            ? {
                access_token:
                  accessToken,

                refresh_token:
                  refreshToken,
              }
            : null,

        confirmationRequired:
          !accessToken,

        message: accessToken
          ? "Аккаунт успешно создан. Теперь можно войти."
          : "Аккаунт успешно создан. Проверьте почту и подтвердите email.",
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
      error instanceof Error
        ? error.message
        : "Не удалось создать аккаунт.",
      500,
    );
  }
}

function parseJson(
  text: string,
): JsonObject {
  if (!text) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(text) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as JsonObject;
    }

    return {};
  } catch {
    return {};
  }
}

function getObject(
  record: JsonObject,
  key: string,
): JsonObject {
  const value = record[key];

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

function getString(
  record: JsonObject,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function translateAuthError(
  message: string,
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "already registered",
    ) ||
    normalized.includes(
      "already exists",
    )
  ) {
    return "Аккаунт с таким email уже существует.";
  }

  if (
    normalized.includes(
      "invalid email",
    )
  ) {
    return "Введите правильный email.";
  }

  if (
    normalized.includes(
      "rate limit",
    )
  ) {
    return "Слишком много попыток. Подождите несколько минут.";
  }

  if (
    normalized.includes(
      "signup is disabled",
    )
  ) {
    return "Регистрация отключена в Supabase.";
  }

  if (
    normalized.includes(
      "database error",
    )
  ) {
    return "Ошибка базы данных при создании аккаунта.";
  }

  return message;
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