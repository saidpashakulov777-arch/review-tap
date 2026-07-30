export type ReviewTapPlanId =
  | "starter"
  | "pro"
  | "business";

export type ReviewTapPlan = {
  id: ReviewTapPlanId;
  name: string;
  priceUzs: number;
  branchLimit: number | null;
  description: string;
  features: string[];
};

export const REVIEWTAP_PLANS: Record<
  ReviewTapPlanId,
  ReviewTapPlan
> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceUzs: 99_000,
    branchLimit: 5,
    description:
      "Для небольших ресторанов и кафе.",
    features: [
      "До 5 филиалов",
      "NFC и QR-ссылки",
      "Базовая аналитика",
      "Управление ссылками",
      "Поддержка",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    priceUzs: 199_000,
    branchLimit: 15,
    description:
      "Для развивающихся сетей ресторанов.",
    features: [
      "До 15 филиалов",
      "Расширенная аналитика",
      "Отчёты",
      "Управление сотрудниками",
      "Приоритетная поддержка",
    ],
  },

  business: {
    id: "business",
    name: "Business",
    priceUzs: 399_000,
    branchLimit: null,
    description:
      "Для крупных сетей ресторанов и отелей.",
    features: [
      "Без ограничения филиалов",
      "API",
      "White Label",
      "Персональный менеджер",
      "Индивидуальные интеграции",
    ],
  },
};

export const REVIEWTAP_PLAN_LIST =
  Object.values(REVIEWTAP_PLANS);

export const TRIAL_DAYS = 14;

export function getReviewTapPlan(
  planId: string,
): ReviewTapPlan | null {
  const normalizedPlanId =
    planId.trim().toLowerCase();

  if (
    normalizedPlanId !== "starter" &&
    normalizedPlanId !== "pro" &&
    normalizedPlanId !== "business"
  ) {
    return null;
  }

  return REVIEWTAP_PLANS[
    normalizedPlanId
  ];
}

export function formatPlanPrice(
  priceUzs: number,
) {
  return `${new Intl.NumberFormat(
    "ru-RU",
  ).format(priceUzs)} сум`;
}