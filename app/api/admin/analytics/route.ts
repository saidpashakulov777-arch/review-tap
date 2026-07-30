import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS =
  24 * 60 * 60 * 1000;

const TIME_ZONE =
  "Asia/Tashkent";

const EVENT_BATCH_SIZE = 1000;

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
  created_at: string | null;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
  address: string | null;
  created_at: string | null;
};

type TagRow = {
  id: string;
  branch_id: string | null;
  code: string;
  google_review_url: string;
  created_at: string | null;
};

type TapEventRow = {
  id: string;
  nfc_tag_id: string;
  visitor_id: string | null;
  created_at: string;
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
    const todayStart =
      getTashkentTodayStart();

    const sevenDaysStart =
      new Date(
        todayStart.getTime() -
          6 * DAY_MS,
      );

    const thirtyDaysStart =
      new Date(
        todayStart.getTime() -
          29 * DAY_MS,
      );

    const [
      profilesCountResult,
      restaurantsResult,
      branchesResult,
      tagsResult,
      totalTapsResult,
      todayTapsResult,
      sevenDaysTapsResult,
      thirtyDaysTapsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        }),

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
          "id, restaurant_id, name, address, created_at",
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("nfc_tags")
        .select(
          "id, branch_id, code, google_review_url, created_at",
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("tap_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_type", "tap"),

      supabaseAdmin
        .from("tap_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_type", "tap")
        .gte(
          "created_at",
          todayStart.toISOString(),
        ),

      supabaseAdmin
        .from("tap_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_type", "tap")
        .gte(
          "created_at",
          sevenDaysStart.toISOString(),
        ),

      supabaseAdmin
        .from("tap_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_type", "tap")
        .gte(
          "created_at",
          thirtyDaysStart.toISOString(),
        ),
    ]);

    const countErrors = [
      profilesCountResult.error,
      totalTapsResult.error,
      todayTapsResult.error,
      sevenDaysTapsResult.error,
      thirtyDaysTapsResult.error,
    ].filter(Boolean);

    if (countErrors.length > 0) {
      return errorResponse(
        `Не удалось посчитать статистику: ${
          countErrors[0]?.message ??
          "неизвестная ошибка"
        }`,
        500,
      );
    }

    if (restaurantsResult.error) {
      return errorResponse(
        `Не удалось загрузить рестораны: ${restaurantsResult.error.message}`,
        500,
      );
    }

    if (branchesResult.error) {
      return errorResponse(
        `Не удалось загрузить филиалы: ${branchesResult.error.message}`,
        500,
      );
    }

    if (tagsResult.error) {
      return errorResponse(
        `Не удалось загрузить NFC-метки: ${tagsResult.error.message}`,
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

    const [
      thirtyDayEvents,
      recentEventsResult,
    ] = await Promise.all([
      fetchTapEventsSince(
        thirtyDaysStart.toISOString(),
      ),

      supabaseAdmin
        .from("tap_events")
        .select(
          "id, nfc_tag_id, visitor_id, created_at",
        )
        .eq("event_type", "tap")
        .order("created_at", {
          ascending: false,
        })
        .limit(12),
    ]);

    if (recentEventsResult.error) {
      return errorResponse(
        `Не удалось загрузить последние переходы: ${recentEventsResult.error.message}`,
        500,
      );
    }

    const recentEvents =
      (recentEventsResult.data ??
        []) as TapEventRow[];

    const restaurantById =
      new Map(
        restaurants.map(
          (restaurant) => [
            restaurant.id,
            restaurant,
          ],
        ),
      );

    const branchById =
      new Map(
        branches.map(
          (branch) => [
            branch.id,
            branch,
          ],
        ),
      );

    const tagById =
      new Map(
        tags.map((tag) => [
          tag.id,
          tag,
        ]),
      );

    const tapsByBranch =
      new Map<string, number>();

    const tapsByRestaurant =
      new Map<string, number>();

    const visitors30Days =
      new Set<string>();

    const chartCountByDate =
      new Map<string, number>();

    const emptyChart =
      createEmptyChart();

    for (const item of emptyChart) {
      chartCountByDate.set(
        item.date,
        0,
      );
    }

    for (
      const event of thirtyDayEvents
    ) {
      if (event.visitor_id) {
        visitors30Days.add(
          event.visitor_id,
        );
      }

      const dateKey =
        getTashkentDateKey(
          new Date(event.created_at),
        );

      if (
        chartCountByDate.has(dateKey)
      ) {
        chartCountByDate.set(
          dateKey,
          (
            chartCountByDate.get(
              dateKey,
            ) ?? 0
          ) + 1,
        );
      }

      const tag =
        tagById.get(
          event.nfc_tag_id,
        );

      const branchId =
        tag?.branch_id;

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

      const branch =
        branchById.get(branchId);

      const restaurantId =
        branch?.restaurant_id;

      if (!restaurantId) {
        continue;
      }

      tapsByRestaurant.set(
        restaurantId,
        (
          tapsByRestaurant.get(
            restaurantId,
          ) ?? 0
        ) + 1,
      );
    }

    const chart =
      emptyChart.map((item) => ({
        ...item,

        count:
          chartCountByDate.get(
            item.date,
          ) ?? 0,
      }));

    const topRestaurants =
      restaurants
        .map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,

          taps:
            tapsByRestaurant.get(
              restaurant.id,
            ) ?? 0,

          branchCount:
            branches.filter(
              (branch) =>
                branch.restaurant_id ===
                restaurant.id,
            ).length,
        }))
        .sort(
          (first, second) =>
            second.taps -
            first.taps,
        )
        .slice(0, 7);

    const topBranches =
      branches
        .map((branch) => ({
          id: branch.id,
          name: branch.name,

          restaurantName:
            branch.restaurant_id
              ? restaurantById.get(
                  branch.restaurant_id,
                )?.name ??
                "Ресторан"
              : "Ресторан",

          taps:
            tapsByBranch.get(
              branch.id,
            ) ?? 0,

          nfcTagCount:
            tags.filter(
              (tag) =>
                tag.branch_id ===
                branch.id,
            ).length,
        }))
        .sort(
          (first, second) =>
            second.taps -
            first.taps,
        )
        .slice(0, 7);

    const normalizedRecentEvents =
      recentEvents.map((event) => {
        const tag =
          tagById.get(
            event.nfc_tag_id,
          );

        const branch = tag?.branch_id
          ? branchById.get(
              tag.branch_id,
            )
          : null;

        const restaurant =
          branch?.restaurant_id
            ? restaurantById.get(
                branch.restaurant_id,
              )
            : null;

        return {
          id: event.id,

          restaurantName:
            restaurant?.name ??
            "Неизвестный ресторан",

          branchName:
            branch?.name ??
            "Неизвестный филиал",

          tagCode:
            tag?.code ?? "—",

          visitorId:
            event.visitor_id,

          createdAt:
            event.created_at,
        };
      });

    return NextResponse.json(
      {
        success: true,

        admin: {
          role: auth.role,
        },

        summary: {
          customers:
            profilesCountResult.count ??
            0,

          restaurants:
            restaurants.length,

          branches:
            branches.length,

          nfcTags:
            tags.length,

          totalTaps:
            totalTapsResult.count ?? 0,

          tapsToday:
            todayTapsResult.count ?? 0,

          taps7Days:
            sevenDaysTapsResult.count ??
            0,

          taps30Days:
            thirtyDaysTapsResult.count ??
            0,

          uniqueVisitors30Days:
            visitors30Days.size,
        },

        chart,
        topRestaurants,
        topBranches,

        recentEvents:
          normalizedRecentEvents,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Не удалось загрузить аналитику.",
      500,
    );
  }
}

async function fetchTapEventsSince(
  startIso: string,
) {
  const allEvents: TapEventRow[] =
    [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("tap_events")
      .select(
        "id, nfc_tag_id, visitor_id, created_at",
      )
      .eq("event_type", "tap")
      .gte("created_at", startIso)
      .order("created_at", {
        ascending: true,
      })
      .range(
        from,
        from +
          EVENT_BATCH_SIZE -
          1,
      );

    if (error) {
      throw new Error(
        `Не удалось загрузить переходы: ${error.message}`,
      );
    }

    const batch =
      (data ?? []) as TapEventRow[];

    allEvents.push(...batch);

    if (
      batch.length <
      EVENT_BATCH_SIZE
    ) {
      break;
    }

    from += EVENT_BATCH_SIZE;
  }

  return allEvents;
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

function createEmptyChart() {
  const todayStart =
    getTashkentTodayStart();

  return Array.from(
    {
      length: 30,
    },
    (_, index) => {
      const date = new Date(
        todayStart.getTime() -
          (29 - index) *
            DAY_MS,
      );

      return {
        date:
          getTashkentDateKey(date),

        count: 0,
      };
    },
  );
}

function getTashkentTodayStart() {
  const dateKey =
    getTashkentDateKey(
      new Date(),
    );

  return new Date(
    `${dateKey}T00:00:00+05:00`,
  );
}

function getTashkentDateKey(
  date: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day",
    )?.value;

  return `${year}-${month}-${day}`;
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
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}