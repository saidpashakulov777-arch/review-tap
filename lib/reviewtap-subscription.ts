import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  REVIEWTAP_PLANS,
  type ReviewTapPlanId,
} from "./reviewtap-plans";

type SubscriptionRow = {
  owner_id: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  ends_at: string | null;
};

type RestaurantIdRow = {
  id: string;
};

export type ReviewTapAccessPlan =
  | "trial"
  | ReviewTapPlanId
  | null;

export type ReviewTapSubscriptionAccess = {
  ownerId: string;

  plan: ReviewTapAccessPlan;
  storedPlan: string | null;
  status: string | null;

  isActive: boolean;
  canCreateBranch: boolean;

  branchLimit: number | null;
  branchCount: number;
  remainingBranches: number | null;

  expiresAt: string | null;
  reason: string | null;
};

export async function getOwnerSubscriptionAccess(
  ownerId: string,
): Promise<ReviewTapSubscriptionAccess> {
  const [
    subscriptionResult,
    restaurantsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select(
        `
          owner_id,
          plan,
          status,
          trial_ends_at,
          current_period_end,
          ends_at
        `,
      )
      .eq("owner_id", ownerId)
      .maybeSingle(),

    supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("owner_id", ownerId),
  ]);

  if (subscriptionResult.error) {
    throw new Error(
      `Не удалось проверить подписку: ${subscriptionResult.error.message}`,
    );
  }

  if (restaurantsResult.error) {
    throw new Error(
      `Не удалось проверить рестораны клиента: ${restaurantsResult.error.message}`,
    );
  }

  const restaurantIds = (
    (restaurantsResult.data ??
      []) as RestaurantIdRow[]
  ).map((restaurant) => restaurant.id);

  let branchCount = 0;

  if (restaurantIds.length > 0) {
    const {
      count,
      error: branchCountError,
    } = await supabaseAdmin
      .from("branches")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in(
        "restaurant_id",
        restaurantIds,
      );

    if (branchCountError) {
      throw new Error(
        `Не удалось посчитать филиалы: ${branchCountError.message}`,
      );
    }

    branchCount = count ?? 0;
  }

  const subscription =
    subscriptionResult.data as
      | SubscriptionRow
      | null;

  if (!subscription) {
    return {
      ownerId,

      plan: null,
      storedPlan: null,
      status: null,

      isActive: false,
      canCreateBranch: false,

      branchLimit: null,
      branchCount,
      remainingBranches: null,

      expiresAt: null,

      reason:
        "У клиента нет подписки.",
    };
  }

  const storedPlan =
    subscription.plan
      .trim()
      .toLowerCase();

  const status =
    subscription.status
      .trim()
      .toLowerCase();

  const now = Date.now();

  if (status === "trialing") {
    const expiresAt =
      subscription.trial_ends_at;

    const isActive =
      isFutureDate(
        expiresAt,
        now,
      );

    const branchLimit =
      REVIEWTAP_PLANS.pro
        .branchLimit;

    const remainingBranches =
      isActive &&
      branchLimit !== null
        ? Math.max(
            0,
            branchLimit -
              branchCount,
          )
        : null;

    return {
      ownerId,

      plan: "trial",
      storedPlan,
      status,

      isActive,

      canCreateBranch:
        isActive &&
        (
          branchLimit === null ||
          branchCount <
            branchLimit
        ),

      branchLimit,
      branchCount,
      remainingBranches,

      expiresAt,

      reason: isActive
        ? null
        : "Пробный период закончился.",
    };
  }

  const paidPlan =
    normalizePaidPlan(
      storedPlan,
    );

  if (status !== "active") {
    return {
      ownerId,

      plan: paidPlan,
      storedPlan,
      status,

      isActive: false,
      canCreateBranch: false,

      branchLimit:
        paidPlan
          ? REVIEWTAP_PLANS[
              paidPlan
            ].branchLimit
          : null,

      branchCount,
      remainingBranches: null,

      expiresAt:
        subscription
          .current_period_end ??
        subscription.ends_at,

      reason:
        getInactiveReason(status),
    };
  }

  if (!paidPlan) {
    return {
      ownerId,

      plan: null,
      storedPlan,
      status,

      isActive: false,
      canCreateBranch: false,

      branchLimit: null,
      branchCount,
      remainingBranches: null,

      expiresAt:
        subscription
          .current_period_end ??
        subscription.ends_at,

      reason:
        "У подписки указан неправильный тариф.",
    };
  }

  const expiresAt =
    subscription
      .current_period_end ??
    subscription.ends_at;

  const isActive =
    !expiresAt ||
    isFutureDate(
      expiresAt,
      now,
    );

  const branchLimit =
    REVIEWTAP_PLANS[
      paidPlan
    ].branchLimit;

  const remainingBranches =
    isActive &&
    branchLimit !== null
      ? Math.max(
          0,
          branchLimit -
            branchCount,
        )
      : null;

  return {
    ownerId,

    plan: paidPlan,
    storedPlan,
    status,

    isActive,

    canCreateBranch:
      isActive &&
      (
        branchLimit === null ||
        branchCount <
          branchLimit
      ),

    branchLimit,
    branchCount,
    remainingBranches,

    expiresAt,

    reason: isActive
      ? null
      : "Срок подписки закончился.",
  };
}

function normalizePaidPlan(
  value: string,
): ReviewTapPlanId | null {
  if (
    value === "starter" ||
    value === "pro" ||
    value === "business"
  ) {
    return value;
  }

  return null;
}

function isFutureDate(
  value: string | null,
  now: number,
) {
  if (!value) {
    return false;
  }

  const timestamp =
    new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > now
  );
}

function getInactiveReason(
  status: string,
) {
  if (status === "past_due") {
    return "Оплата подписки просрочена.";
  }

  if (status === "cancelled") {
    return "Подписка отменена.";
  }

  if (status === "expired") {
    return "Срок подписки закончился.";
  }

  return "Подписка неактивна.";
}