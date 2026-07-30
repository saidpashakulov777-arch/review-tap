import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

export async function GET(
  request: NextRequest,
) {
  try {
    const authorization =
      request.headers.get("authorization");

    const token =
      getBearerToken(authorization);

    if (!token) {
      return createError(
        "Необходимо войти в аккаунт.",
        401,
      );
    }

    /*
     * Проверяем пользователя.
     */
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
      console.error(
        "BRANCHES USER ERROR:",
        userError,
      );

      return createError(
        "Сессия истекла. Войдите снова.",
        401,
      );
    }

    /*
     * Проверяем права администратора.
     */
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
      console.error(
        "BRANCHES ADMIN ERROR:",
        adminError,
      );

      return createError(
        `Не удалось проверить права администратора: ${adminError.message}`,
        500,
      );
    }

    if (
      !adminData ||
      adminData.is_active !== true
    ) {
      return createError(
        "Нет доступа к админ-панели.",
        403,
      );
    }

    /*
     * Загружаем рестораны.
     */
    const {
      data: restaurantsData,
      error: restaurantsError,
    } = await supabaseAdmin
      .from("restaurants")
      .select("*");

    if (restaurantsError) {
      console.error(
        "BRANCHES RESTAURANTS ERROR:",
        restaurantsError,
      );

      return createError(
        `Ошибка загрузки ресторанов: ${restaurantsError.message}`,
        500,
      );
    }

    /*
     * Загружаем филиалы.
     */
    const {
      data: branchesData,
      error: branchesError,
    } = await supabaseAdmin
      .from("branches")
      .select("*");

    if (branchesError) {
      console.error(
        "BRANCHES TABLE ERROR:",
        branchesError,
      );

      return createError(
        `Ошибка загрузки филиалов: ${branchesError.message}`,
        500,
      );
    }

    /*
     * Загружаем NFC-метки.
     */
    const {
      data: tagsData,
      error: tagsError,
    } = await supabaseAdmin
      .from("nfc_tags")
      .select("*");

    if (tagsError) {
      console.error(
        "BRANCHES NFC ERROR:",
        tagsError,
      );

      return createError(
        `Ошибка загрузки NFC-меток: ${tagsError.message}`,
        500,
      );
    }

    /*
     * Загружаем переходы.
     */
    const {
      data: eventsData,
      error: eventsError,
    } = await supabaseAdmin
      .from("tap_events")
      .select("*");

    if (eventsError) {
      console.error(
        "BRANCHES EVENTS ERROR:",
        eventsError,
      );

      return createError(
        `Ошибка загрузки переходов: ${eventsError.message}`,
        500,
      );
    }

    const restaurants =
      toRecords(restaurantsData);

    const branches =
      toRecords(branchesData);

    const tags =
      toRecords(tagsData);

    const events =
      toRecords(eventsData);

    /*
     * Создаём список ресторанов по ID.
     */
    const restaurantById =
      new Map<string, JsonRecord>();

    for (
      const restaurant of restaurants
    ) {
      const restaurantId =
        getString(restaurant, [
          "id",
        ]);

      if (restaurantId) {
        restaurantById.set(
          restaurantId,
          restaurant,
        );
      }
    }

    /*
     * Создаём список NFC-меток по ID.
     */
    const tagById =
      new Map<string, JsonRecord>();

    const totalTagsByBranch =
      new Map<string, number>();

    const activeTagsByBranch =
      new Map<string, number>();

    for (const tag of tags) {
      const tagId =
        getString(tag, ["id"]);

      const branchId =
        getString(tag, [
          "branch_id",
        ]);

      if (tagId) {
        tagById.set(tagId, tag);
      }

      if (!branchId) {
        continue;
      }

      totalTagsByBranch.set(
        branchId,
        (totalTagsByBranch.get(
          branchId,
        ) ?? 0) + 1,
      );

      if (isActiveRecord(tag)) {
        activeTagsByBranch.set(
          branchId,
          (activeTagsByBranch.get(
            branchId,
          ) ?? 0) + 1,
        );
      }
    }

    /*
     * Считаем переходы для каждого филиала.
     */
    const tapsByBranch =
      new Map<string, number>();

    for (const event of events) {
      const tagId =
        getString(event, [
          "nfc_tag_id",
        ]);

      if (!tagId) {
        continue;
      }

      const tag =
        tagById.get(tagId);

      if (!tag) {
        continue;
      }

      const branchId =
        getString(tag, [
          "branch_id",
        ]);

      if (!branchId) {
        continue;
      }

      tapsByBranch.set(
        branchId,
        (tapsByBranch.get(
          branchId,
        ) ?? 0) + 1,
      );
    }

    /*
     * Формируем готовые филиалы для страницы.
     */
    const normalizedBranches =
      branches
        .map((branch) => {
          const branchId =
            getString(branch, [
              "id",
            ]);

          if (!branchId) {
            return null;
          }

          const restaurantId =
            getString(branch, [
              "restaurant_id",
            ]);

          const restaurant =
            restaurantId
              ? restaurantById.get(
                  restaurantId,
                )
              : undefined;

          const branchReviewUrl =
            getString(branch, [
              "google_review_url",
              "google_maps_url",
              "review_url",
            ]);

          const restaurantReviewUrl =
            restaurant
              ? getString(
                  restaurant,
                  [
                    "google_review_url",
                    "google_maps_url",
                    "review_url",
                  ],
                )
              : "";

          return {
            id: branchId,

            name:
              getString(branch, [
                "name",
                "branch_name",
                "title",
              ]) || "Без названия",

            address:
              getString(branch, [
                "address",
                "full_address",
                "location",
              ]) || "Адрес не указан",

            city:
              getString(branch, [
                "city",
              ]),

            restaurantId,

            restaurantName:
              restaurant
                ? getString(
                    restaurant,
                    [
                      "name",
                      "restaurant_name",
                      "title",
                    ],
                  ) ||
                  "Без названия"
                : "Ресторан не найден",

            ownerId: "",
            ownerEmail: "",
            ownerName: "",
            companyName: "",

            googleReviewUrl:
              branchReviewUrl ||
              restaurantReviewUrl,

            isActive:
              isActiveRecord(branch),

            nfcTagCount:
              totalTagsByBranch.get(
                branchId,
              ) ?? 0,

            activeNfcTagCount:
              activeTagsByBranch.get(
                branchId,
              ) ?? 0,

            tapCount:
              tapsByBranch.get(
                branchId,
              ) ?? 0,

            createdAt:
              getString(branch, [
                "created_at",
              ]),

            updatedAt:
              getString(branch, [
                "updated_at",
              ]),
          };
        })
        .filter(
          (
            branch,
          ): branch is NonNullable<
            typeof branch
          > => branch !== null,
        );

    const restaurantOptions =
      restaurants
        .map((restaurant) => {
          const id =
            getString(restaurant, [
              "id",
            ]);

          if (!id) {
            return null;
          }

          return {
            id,

            name:
              getString(
                restaurant,
                [
                  "name",
                  "restaurant_name",
                  "title",
                ],
              ) || "Без названия",
          };
        })
        .filter(
          (
            restaurant,
          ): restaurant is {
            id: string;
            name: string;
          } => restaurant !== null,
        );

    return NextResponse.json(
      {
        success: true,

        admin: {
          userId: userData.user.id,
          role:
            typeof adminData.role ===
            "string"
              ? adminData.role
              : "admin",
        },

        branches:
          normalizedBranches,

        restaurants:
          restaurantOptions,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "BRANCHES API ERROR:",
      error,
    );

    return createError(
      error instanceof Error
        ? `Ошибка API филиалов: ${error.message}`
        : "Не удалось загрузить филиалы.",
      500,
    );
  }
}

function getBearerToken(
  authorization: string | null,
) {
  if (!authorization) {
    return null;
  }

  const parts =
    authorization
      .trim()
      .split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !==
      "bearer"
  ) {
    return null;
  }

  return parts[1];
}

function toRecords(
  value: unknown,
): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is JsonRecord =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item),
  );
}

function getString(
  record: JsonRecord,
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

function isActiveRecord(
  record: JsonRecord,
) {
  const directValue =
    record.is_active;

  if (
    typeof directValue ===
    "boolean"
  ) {
    return directValue;
  }

  const status =
    getString(record, [
      "status",
    ]).toLowerCase();

  if (
    status === "inactive" ||
    status === "disabled"
  ) {
    return false;
  }

  return true;
}

function createError(
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