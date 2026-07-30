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

type JsonRecord = Record<string, unknown>;

export async function GET(
  request: NextRequest,
) {
  const adminAccess =
    await authorizeAdmin(request);

  if (!adminAccess.success) {
    return adminAccess.response;
  }

  try {
    const [
      usersResult,
      restaurantsResult,
      branchesResult,
      nfcTagsResult,
      profilesResult,
      subscriptionsResult,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),

      supabaseAdmin
        .from("restaurants")
        .select("*"),

      supabaseAdmin
        .from("branches")
        .select("*"),

      supabaseAdmin
        .from("nfc_tags")
        .select("*"),

      supabaseAdmin
        .from("profiles")
        .select("*"),

      supabaseAdmin
        .from("subscriptions")
        .select("*"),
    ]);

    if (usersResult.error) {
      return createErrorResponse(
        "USERS_LOAD_FAILED",
        "Не удалось загрузить пользователей.",
        500,
      );
    }

    if (restaurantsResult.error) {
      return createErrorResponse(
        "RESTAURANTS_LOAD_FAILED",
        `Не удалось загрузить рестораны: ${restaurantsResult.error.message}`,
        500,
      );
    }

    if (branchesResult.error) {
      return createErrorResponse(
        "BRANCHES_LOAD_FAILED",
        `Не удалось загрузить филиалы: ${branchesResult.error.message}`,
        500,
      );
    }

    if (nfcTagsResult.error) {
      return createErrorResponse(
        "NFC_TAGS_LOAD_FAILED",
        `Не удалось загрузить NFC-метки: ${nfcTagsResult.error.message}`,
        500,
      );
    }

    if (profilesResult.error) {
      return createErrorResponse(
        "PROFILES_LOAD_FAILED",
        `Не удалось загрузить профили: ${profilesResult.error.message}`,
        500,
      );
    }

    if (subscriptionsResult.error) {
      return createErrorResponse(
        "SUBSCRIPTIONS_LOAD_FAILED",
        `Не удалось загрузить подписки: ${subscriptionsResult.error.message}`,
        500,
      );
    }

    const authUsers =
      usersResult.data.users ?? [];

    const restaurants =
      toRecordArray(
        restaurantsResult.data,
      );

    const branches =
      toRecordArray(branchesResult.data);

    const nfcTags =
      toRecordArray(nfcTagsResult.data);

    const profiles =
      toRecordArray(profilesResult.data);

    const subscriptions =
      toRecordArray(
        subscriptionsResult.data,
      );

    const emailByUserId =
      new Map<string, string>();

    for (const user of authUsers) {
      emailByUserId.set(
        user.id,
        user.email ?? "",
      );
    }

    const profileByUserId =
      new Map<string, JsonRecord>();

    for (const profile of profiles) {
      const profileId = getString(
        profile,
        ["id"],
      );

      if (profileId) {
        profileByUserId.set(
          profileId,
          profile,
        );
      }
    }

    const latestSubscriptionByOwner =
      new Map<string, JsonRecord>();

    const sortedSubscriptions = [
      ...subscriptions,
    ].sort(
      (first, second) =>
        getTimestamp(second, [
          "updated_at",
          "created_at",
        ]) -
        getTimestamp(first, [
          "updated_at",
          "created_at",
        ]),
    );

    for (
      const subscription of
      sortedSubscriptions
    ) {
      const ownerId = getString(
        subscription,
        ["owner_id", "user_id"],
      );

      if (
        ownerId &&
        !latestSubscriptionByOwner.has(
          ownerId,
        )
      ) {
        latestSubscriptionByOwner.set(
          ownerId,
          subscription,
        );
      }
    }

    const branchCountByRestaurant =
      new Map<string, number>();

    const restaurantIdByBranch =
      new Map<string, string>();

    for (const branch of branches) {
      const branchId = getString(
        branch,
        ["id"],
      );

      const restaurantId = getString(
        branch,
        ["restaurant_id"],
      );

      if (!restaurantId) {
        continue;
      }

      branchCountByRestaurant.set(
        restaurantId,
        (branchCountByRestaurant.get(
          restaurantId,
        ) ?? 0) + 1,
      );

      if (branchId) {
        restaurantIdByBranch.set(
          branchId,
          restaurantId,
        );
      }
    }

    const nfcCountByRestaurant =
      new Map<string, number>();

    for (const tag of nfcTags) {
      const branchId = getString(
        tag,
        ["branch_id"],
      );

      if (!branchId) {
        continue;
      }

      const restaurantId =
        restaurantIdByBranch.get(
          branchId,
        );

      if (!restaurantId) {
        continue;
      }

      nfcCountByRestaurant.set(
        restaurantId,
        (nfcCountByRestaurant.get(
          restaurantId,
        ) ?? 0) + 1,
      );
    }

    const normalizedRestaurants =
      restaurants
        .map((restaurant) => {
          const restaurantId =
            getString(restaurant, [
              "id",
            ]);

          const ownerId = getString(
            restaurant,
            [
              "owner_id",
              "user_id",
              "profile_id",
            ],
          );

          if (!restaurantId) {
            return null;
          }

          const profile = ownerId
            ? profileByUserId.get(
                ownerId,
              ) ?? null
            : null;

          const subscription = ownerId
            ? latestSubscriptionByOwner.get(
                ownerId,
              ) ?? null
            : null;

          return {
            id: restaurantId,

            name:
              getString(restaurant, [
                "name",
                "restaurant_name",
                "title",
              ]) || "Без названия",

            ownerId: ownerId ?? "",

            ownerEmail: ownerId
              ? emailByUserId.get(
                  ownerId,
                ) ?? ""
              : "",

            ownerName: profile
              ? getString(profile, [
                  "full_name",
                  "name",
                ])
              : "",

            companyName: profile
              ? getString(profile, [
                  "company_name",
                ])
              : "",

            googleReviewUrl:
              getString(restaurant, [
                "google_review_url",
                "google_maps_url",
                "review_url",
              ]),

            createdAt:
              getString(restaurant, [
                "created_at",
              ]),

            updatedAt:
              getString(restaurant, [
                "updated_at",
              ]),

            branchCount:
              branchCountByRestaurant.get(
                restaurantId,
              ) ?? 0,

            nfcTagCount:
              nfcCountByRestaurant.get(
                restaurantId,
              ) ?? 0,

            subscription: subscription
              ? {
                  id: getString(
                    subscription,
                    ["id"],
                  ),

                  plan:
                    getString(
                      subscription,
                      ["plan"],
                    ) || "trial",

                  status:
                    getString(
                      subscription,
                      ["status"],
                    ) || "inactive",

                  currentPeriodEnd:
                    getString(
                      subscription,
                      [
                        "current_period_end",
                      ],
                    ),

                  trialEndsAt:
                    getString(
                      subscription,
                      ["trial_ends_at"],
                    ),

                  paymentProvider:
                    getString(
                      subscription,
                      [
                        "payment_provider",
                      ],
                    ),
                }
              : null,
          };
        })
        .filter(
          (
            restaurant,
          ): restaurant is NonNullable<
            typeof restaurant
          > => restaurant !== null,
        )
        .sort(
          (first, second) =>
            dateToTimestamp(
              second.createdAt,
            ) -
            dateToTimestamp(
              first.createdAt,
            ),
        );

    return NextResponse.json(
      {
        success: true,

        admin: {
          userId:
            adminAccess.userId,
          role: adminAccess.role,
        },

        restaurants:
          normalizedRestaurants,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      getErrorMessage(
        error,
        "Не удалось загрузить рестораны.",
      ),
      500,
    );
  }
}

async function authorizeAdmin(
  request: NextRequest,
): Promise<
  | {
      success: true;
      userId: string;
      role: AdminRole;
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

      response: createErrorResponse(
        "AUTHORIZATION_REQUIRED",
        "Войдите в аккаунт.",
        401,
      ),
    };
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
    return {
      success: false,

      response: createErrorResponse(
        "INVALID_SESSION",
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
    .select("*")
    .eq(
      "user_id",
      userData.user.id,
    )
    .maybeSingle();

  if (
    adminError ||
    !adminData
  ) {
    return {
      success: false,

      response: createErrorResponse(
        "ADMIN_ACCESS_DENIED",
        "У вас нет доступа к админ-панели.",
        403,
      ),
    };
  }

  const admin =
    adminData as unknown as AdminUserRow;

  if (
    !admin.is_active ||
    !isAdminRole(admin.role)
  ) {
    return {
      success: false,

      response: createErrorResponse(
        "ADMIN_ACCESS_DISABLED",
        "Доступ администратора отключён.",
        403,
      ),
    };
  }

  return {
    success: true,
    userId: userData.user.id,
    role: admin.role,
  };
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

function toRecordArray(
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
      return value;
    }
  }

  return "";
}

function getTimestamp(
  record: JsonRecord,
  keys: string[],
) {
  return dateToTimestamp(
    getString(record, keys),
  );
}

function dateToTimestamp(
  value: string,
) {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
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