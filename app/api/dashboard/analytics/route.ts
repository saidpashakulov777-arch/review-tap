import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Tashkent";

type RestaurantRow = {
  id: string;
  name: string;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
};

type TagRow = {
  id: string;
  branch_id: string | null;
};

type TapEventRow = {
  nfc_tag_id: string;
  visitor_id: string | null;
  created_at: string;
};

export async function GET(
  request: NextRequest,
) {
  const auth = await requireUser(request);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const {
      data: restaurantData,
      error: restaurantError,
    } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .eq("owner_id", auth.userId)
      .order("created_at", {
        ascending: false,
      });

    if (restaurantError) {
      return errorResponse(
        `Не удалось загрузить рестораны: ${restaurantError.message}`,
        500,
      );
    }

    const restaurants =
      (restaurantData ?? []) as RestaurantRow[];

    if (restaurants.length === 0) {
      return emptyAnalyticsResponse();
    }

    const restaurantIds = restaurants.map(
      (restaurant) => restaurant.id,
    );

    const {
      data: branchData,
      error: branchError,
    } = await supabaseAdmin
      .from("branches")
      .select(
        "id, restaurant_id, name",
      )
      .in(
        "restaurant_id",
        restaurantIds,
      );

    if (branchError) {
      return errorResponse(
        `Не удалось загрузить филиалы: ${branchError.message}`,
        500,
      );
    }

    const branches =
      (branchData ?? []) as BranchRow[];

    if (branches.length === 0) {
      return NextResponse.json(
        {
          success: true,
          summary: {
            restaurants:
              restaurants.length,
            branches: 0,
            nfcTags: 0,
            totalTaps: 0,
            tapsToday: 0,
            taps7Days: 0,
            taps30Days: 0,
            uniqueVisitors30Days: 0,
          },
          chart: createEmptyChart(),
          topBranches: [],
          recentEvents: [],
        },
        noStoreOptions(200),
      );
    }

    const branchIds = branches.map(
      (branch) => branch.id,
    );

    const {
      data: tagData,
      error: tagError,
    } = await supabaseAdmin
      .from("nfc_tags")
      .select("id, branch_id")
      .in("branch_id", branchIds);

    if (tagError) {
      return errorResponse(
        `Не удалось загрузить NFC-метки: ${tagError.message}`,
        500,
      );
    }

    const tags =
      (tagData ?? []) as TagRow[];

    if (tags.length === 0) {
      return NextResponse.json(
        {
          success: true,
          summary: {
            restaurants:
              restaurants.length,
            branches: branches.length,
            nfcTags: 0,
            totalTaps: 0,
            tapsToday: 0,
            taps7Days: 0,
            taps30Days: 0,
            uniqueVisitors30Days: 0,
          },
          chart: createEmptyChart(),
          topBranches:
            branches.slice(0, 5).map(
              (branch) => ({
                id: branch.id,
                name: branch.name,
                restaurantName:
                  getRestaurantName(
                    branch.restaurant_id,
                    restaurants,
                  ),
                taps: 0,
              }),
            ),
          recentEvents: [],
        },
        noStoreOptions(200),
      );
    }

    const tagIds = tags.map(
      (tag) => tag.id,
    );

    const todayStart =
      getTashkentTodayStart();

    const sevenDaysStart = new Date(
      todayStart.getTime() -
        6 * DAY_MS,
    );

    const thirtyDaysStart = new Date(
      todayStart.getTime() -
        29 * DAY_MS,
    );

    const [
      totalCountResult,
      eventResult,
      recentResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("tap_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .in("nfc_tag_id", tagIds)
        .eq("event_type", "tap"),

      supabaseAdmin
        .from("tap_events")
        .select(
          "nfc_tag_id, visitor_id, created_at",
        )
        .in("nfc_tag_id", tagIds)
        .eq("event_type", "tap")
        .gte(
          "created_at",
          thirtyDaysStart.toISOString(),
        )
        .order("created_at", {
          ascending: true,
        }),

      supabaseAdmin
        .from("tap_events")
        .select(
          "nfc_tag_id, visitor_id, created_at",
        )
        .in("nfc_tag_id", tagIds)
        .eq("event_type", "tap")
        .order("created_at", {
          ascending: false,
        })
        .limit(10),
    ]);

    if (totalCountResult.error) {
      return errorResponse(
        `Не удалось посчитать переходы: ${totalCountResult.error.message}`,
        500,
      );
    }

    if (eventResult.error) {
      return errorResponse(
        `Не удалось загрузить аналитику: ${eventResult.error.message}`,
        500,
      );
    }

    if (recentResult.error) {
      return errorResponse(
        `Не удалось загрузить последние переходы: ${recentResult.error.message}`,
        500,
      );
    }

    const events =
      (eventResult.data ??
        []) as TapEventRow[];

    const recentEvents =
      (recentResult.data ??
        []) as TapEventRow[];

    const tagToBranch =
      new Map<string, string>();

    for (const tag of tags) {
      if (tag.branch_id) {
        tagToBranch.set(
          tag.id,
          tag.branch_id,
        );
      }
    }

    const branchToRestaurant =
      new Map<string, string>();

    for (const branch of branches) {
      if (branch.restaurant_id) {
        branchToRestaurant.set(
          branch.id,
          branch.restaurant_id,
        );
      }
    }

    const restaurantNameById =
      new Map(
        restaurants.map(
          (restaurant) => [
            restaurant.id,
            restaurant.name,
          ],
        ),
      );

    const branchById = new Map(
      branches.map((branch) => [
        branch.id,
        branch,
      ]),
    );

    const tapsToday = events.filter(
      (event) =>
        new Date(
          event.created_at,
        ).getTime() >=
        todayStart.getTime(),
    ).length;

    const taps7Days = events.filter(
      (event) =>
        new Date(
          event.created_at,
        ).getTime() >=
        sevenDaysStart.getTime(),
    ).length;

    const uniqueVisitors =
      new Set(
        events
          .map(
            (event) =>
              event.visitor_id,
          )
          .filter(
            (
              visitorId,
            ): visitorId is string =>
              Boolean(visitorId),
          ),
      );

    const chartCountByDate =
      new Map<string, number>();

    for (const item of createEmptyChart()) {
      chartCountByDate.set(
        item.date,
        0,
      );
    }

    const tapsByBranch =
      new Map<string, number>();

    for (const event of events) {
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

      const branchId =
        tagToBranch.get(
          event.nfc_tag_id,
        );

      if (branchId) {
        tapsByBranch.set(
          branchId,
          (
            tapsByBranch.get(
              branchId,
            ) ?? 0
          ) + 1,
        );
      }
    }

    const chart = createEmptyChart().map(
      (item) => ({
        ...item,
        count:
          chartCountByDate.get(
            item.date,
          ) ?? 0,
      }),
    );

    const topBranches = branches
      .map((branch) => {
        const restaurantId =
          branchToRestaurant.get(
            branch.id,
          );

        return {
          id: branch.id,
          name: branch.name,
          restaurantName:
            restaurantId
              ? restaurantNameById.get(
                  restaurantId,
                ) ?? "Ресторан"
              : "Ресторан",
          taps:
            tapsByBranch.get(
              branch.id,
            ) ?? 0,
        };
      })
      .sort(
        (first, second) =>
          second.taps -
          first.taps,
      )
      .slice(0, 5);

    const normalizedRecentEvents =
      recentEvents.map((event) => {
        const branchId =
          tagToBranch.get(
            event.nfc_tag_id,
          );

        const branch = branchId
          ? branchById.get(branchId)
          : null;

        const restaurantName =
          branch?.restaurant_id
            ? restaurantNameById.get(
                branch.restaurant_id,
              ) ?? "Ресторан"
            : "Ресторан";

        return {
          branchName:
            branch?.name ??
            "Неизвестный филиал",
          restaurantName,
          createdAt:
            event.created_at,
          visitorId:
            event.visitor_id,
        };
      });

    return NextResponse.json(
      {
        success: true,

        summary: {
          restaurants:
            restaurants.length,
          branches: branches.length,
          nfcTags: tags.length,
          totalTaps:
            totalCountResult.count ?? 0,
          tapsToday,
          taps7Days,
          taps30Days: events.length,
          uniqueVisitors30Days:
            uniqueVisitors.size,
        },

        chart,
        topBranches,
        recentEvents:
          normalizedRecentEvents,
      },
      noStoreOptions(200),
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

function emptyAnalyticsResponse() {
  return NextResponse.json(
    {
      success: true,
      summary: {
        restaurants: 0,
        branches: 0,
        nfcTags: 0,
        totalTaps: 0,
        tapsToday: 0,
        taps7Days: 0,
        taps30Days: 0,
        uniqueVisitors30Days: 0,
      },
      chart: createEmptyChart(),
      topBranches: [],
      recentEvents: [],
    },
    noStoreOptions(200),
  );
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
          (29 - index) * DAY_MS,
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
  const now = new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(now);

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
      (part) => part.type === "day",
    )?.value;

  return new Date(
    `${year}-${month}-${day}T00:00:00+05:00`,
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
      (part) => part.type === "day",
    )?.value;

  return `${year}-${month}-${day}`;
}

function getRestaurantName(
  restaurantId: string | null,
  restaurants: RestaurantRow[],
) {
  return (
    restaurants.find(
      (restaurant) =>
        restaurant.id ===
        restaurantId,
    )?.name ?? "Ресторан"
  );
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