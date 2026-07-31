import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
  created_at: string | null;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
};

type TagRow = {
  id: string;
  branch_id: string | null;
  google_review_url: string;
};

type TapRow = {
  nfc_tag_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
};

export async function GET(
  request: NextRequest,
) {
  const auth =
    await requireAdmin(request);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const [
      restaurantsResult,
      branchesResult,
      tagsResult,
      tapsResult,
      profilesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("restaurants")
        .select(
          "id, owner_id, name, created_at",
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("branches")
        .select(
          "id, restaurant_id",
        ),

      supabaseAdmin
        .from("nfc_tags")
        .select(
          "id, branch_id, google_review_url",
        ),

      supabaseAdmin
        .from("tap_events")
        .select("nfc_tag_id")
        .eq("event_type", "tap"),

      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, company_name",
        ),
    ]);

    if (restaurantsResult.error) {
      return errorResponse(
        `Ошибка загрузки ресторанов: ${restaurantsResult.error.message}`,
        500,
      );
    }

    if (branchesResult.error) {
      return errorResponse(
        `Ошибка загрузки филиалов: ${branchesResult.error.message}`,
        500,
      );
    }

    if (tagsResult.error) {
      return errorResponse(
        `Ошибка загрузки NFC-меток: ${tagsResult.error.message}`,
        500,
      );
    }

    if (tapsResult.error) {
      return errorResponse(
        `Ошибка загрузки переходов: ${tapsResult.error.message}`,
        500,
      );
    }

    if (profilesResult.error) {
      return errorResponse(
        `Ошибка загрузки клиентов: ${profilesResult.error.message}`,
        500,
      );
    }

    const restaurants =
      (restaurantsResult.data ??
        []) as RestaurantRow[];

    const branches =
      (branchesResult.data ??
        []) as BranchRow[];

    const tags =
      (tagsResult.data ??
        []) as TagRow[];

    const taps =
      (tapsResult.data ??
        []) as TapRow[];

    const profiles =
      (profilesResult.data ??
        []) as ProfileRow[];

    const emailByUserId =
      await loadAuthEmails();

    const profileById = new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ]),
    );

    const branchesByRestaurant =
      new Map<string, string[]>();

    for (const branch of branches) {
      if (!branch.restaurant_id) {
        continue;
      }

      const current =
        branchesByRestaurant.get(
          branch.restaurant_id,
        ) ?? [];

      current.push(branch.id);

      branchesByRestaurant.set(
        branch.restaurant_id,
        current,
      );
    }

    const tagsByBranch =
      new Map<string, TagRow[]>();

    const branchIdByTagId =
      new Map<string, string>();

    for (const tag of tags) {
      if (!tag.branch_id) {
        continue;
      }

      const current =
        tagsByBranch.get(
          tag.branch_id,
        ) ?? [];

      current.push(tag);

      tagsByBranch.set(
        tag.branch_id,
        current,
      );

      branchIdByTagId.set(
        tag.id,
        tag.branch_id,
      );
    }

    const tapsByBranch =
      new Map<string, number>();

    for (const tap of taps) {
      const branchId =
        branchIdByTagId.get(
          tap.nfc_tag_id,
        );

      if (!branchId) {
        continue;
      }

      tapsByBranch.set(
        branchId,
        (
          tapsByBranch.get(
            branchId,
          ) ?? 0
        ) + 1,
      );
    }

    const normalized =
      restaurants.map(
        (restaurant) => {
          const branchIds =
            branchesByRestaurant.get(
              restaurant.id,
            ) ?? [];

          let nfcTagCount = 0;
          let tapCount = 0;
          let googleReviewUrl = "";

          for (const branchId of branchIds) {
            const branchTags =
              tagsByBranch.get(
                branchId,
              ) ?? [];

            nfcTagCount +=
              branchTags.length;

            tapCount +=
              tapsByBranch.get(
                branchId,
              ) ?? 0;

            if (
              !googleReviewUrl &&
              branchTags[0]
                ?.google_review_url
            ) {
              googleReviewUrl =
                branchTags[0]
                  .google_review_url;
            }
          }

          const profile =
            restaurant.owner_id
              ? profileById.get(
                  restaurant.owner_id,
                )
              : null;

          return {
            id: restaurant.id,

            name: restaurant.name,

            ownerId:
              restaurant.owner_id ?? "",

            ownerEmail:
              restaurant.owner_id
                ? emailByUserId.get(
                    restaurant.owner_id,
                  ) ?? ""
                : "",

            ownerName:
              profile?.full_name ||
              profile?.company_name ||
              "",

            companyName:
              profile?.company_name ?? "",

            branchCount:
              branchIds.length,

            nfcTagCount,

            activeNfcTagCount:
              nfcTagCount,

            tapCount,

            googleReviewUrl,

            isActive: true,

            createdAt:
              restaurant.created_at ?? "",
          };
        },
      );

    return NextResponse.json(
      {
        success: true,
        restaurants: normalized,
      },
      noStoreOptions(200),
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Не удалось загрузить рестораны.",
      500,
    );
  }
}

async function loadAuthEmails() {
  const result =
    new Map<string, string>();

  let page = 1;

  while (true) {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        },
      );

    if (error) {
      throw new Error(
        `Не удалось загрузить email клиентов: ${error.message}`,
      );
    }

    for (const user of data.users) {
      result.set(
        user.id,
        user.email ?? "",
      );
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return result;
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