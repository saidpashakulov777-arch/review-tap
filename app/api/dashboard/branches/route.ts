import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestaurantRow = {
  id: string;
  name: string;
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
  created_at: string | null;
};

type TapEventRow = {
  nfc_tag_id: string;
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
      return successResponse([]);
    }

    const restaurantIds =
      restaurants.map(
        (restaurant) => restaurant.id,
      );

    const {
      data: branchData,
      error: branchError,
    } = await supabaseAdmin
      .from("branches")
      .select(
        "id, restaurant_id, name, address, created_at",
      )
      .in(
        "restaurant_id",
        restaurantIds,
      )
      .order("created_at", {
        ascending: false,
      });

    if (branchError) {
      return errorResponse(
        `Не удалось загрузить филиалы: ${branchError.message}`,
        500,
      );
    }

    const branches =
      (branchData ?? []) as BranchRow[];

    if (branches.length === 0) {
      return successResponse([]);
    }

    const branchIds =
      branches.map(
        (branch) => branch.id,
      );

    const {
      data: tagData,
      error: tagError,
    } = await supabaseAdmin
      .from("nfc_tags")
      .select(
        "id, branch_id, code, created_at",
      )
      .in("branch_id", branchIds)
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
      (tagData ?? []) as TagRow[];

    const tagIds =
      tags.map((tag) => tag.id);

    let tapEvents: TapEventRow[] = [];

    if (tagIds.length > 0) {
      const {
        data: tapData,
        error: tapError,
      } = await supabaseAdmin
        .from("tap_events")
        .select("nfc_tag_id")
        .in("nfc_tag_id", tagIds)
        .eq("event_type", "tap");

      if (tapError) {
        return errorResponse(
          `Не удалось загрузить переходы: ${tapError.message}`,
          500,
        );
      }

      tapEvents =
        (tapData ?? []) as TapEventRow[];
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

    const tagCountByBranch =
      new Map<string, number>();

    const firstTagCodeByBranch =
      new Map<string, string>();

    const branchIdByTagId =
      new Map<string, string>();

    for (const tag of tags) {
      if (!tag.branch_id) {
        continue;
      }

      branchIdByTagId.set(
        tag.id,
        tag.branch_id,
      );

      tagCountByBranch.set(
        tag.branch_id,
        (
          tagCountByBranch.get(
            tag.branch_id,
          ) ?? 0
        ) + 1,
      );

      if (
        !firstTagCodeByBranch.has(
          tag.branch_id,
        )
      ) {
        firstTagCodeByBranch.set(
          tag.branch_id,
          tag.code,
        );
      }
    }

    const tapCountByBranch =
      new Map<string, number>();

    for (const event of tapEvents) {
      const branchId =
        branchIdByTagId.get(
          event.nfc_tag_id,
        );

      if (!branchId) {
        continue;
      }

      tapCountByBranch.set(
        branchId,
        (
          tapCountByBranch.get(
            branchId,
          ) ?? 0
        ) + 1,
      );
    }

    const normalizedBranches =
      branches.map((branch) => {
        const firstTagCode =
          firstTagCodeByBranch.get(
            branch.id,
          );

        return {
          id: branch.id,
          restaurantId:
            branch.restaurant_id,
          restaurantName:
            branch.restaurant_id
              ? restaurantNameById.get(
                  branch.restaurant_id,
                ) ?? "Ресторан"
              : "Ресторан",
          name: branch.name,
          address:
            branch.address ?? "",
          createdAt:
            branch.created_at,
          nfcTagCount:
            tagCountByBranch.get(
              branch.id,
            ) ?? 0,
          tapCount:
            tapCountByBranch.get(
              branch.id,
            ) ?? 0,
          publicPath: firstTagCode
            ? `/t/${firstTagCode}`
            : null,
        };
      });

    return successResponse(
      normalizedBranches,
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Не удалось загрузить филиалы.",
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

function successResponse(
  branches: unknown[],
) {
  return NextResponse.json(
    {
      success: true,
      branches,
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
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