"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  FormEvent,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email_notifications: boolean | null;
  review_notifications: boolean | null;
  weekly_report: boolean | null;
};

type SubscriptionRow = {
  id: string;
  owner_id: string;
  user_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  payment_provider: string | null;
  created_at: string | null;
};

type NotificationSettings = {
  emailNotifications: boolean;
  reviewNotifications: boolean;
  weeklyReport: boolean;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] =
    useState(false);
  const [
    savingNotifications,
    setSavingNotifications,
  ] = useState(false);
  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);
  const [signingOut, setSigningOut] =
    useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [subscription, setSubscription] =
    useState<SubscriptionRow | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationSettings>({
      emailNotifications: true,
      reviewNotifications: true,
      weeklyReport: true,
    });

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);
      setMessage(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) {
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");

        const [
          profileResult,
          subscriptionResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("subscriptions")
            .select("*")
            .eq("owner_id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) {
          return;
        }

        const loadingErrors: string[] = [];

        if (profileResult.error) {
          loadingErrors.push(
            `Не удалось загрузить профиль: ${profileResult.error.message}`,
          );
        } else if (profileResult.data) {
          const profile =
            profileResult.data as unknown as ProfileRow;

          setFullName(profile.full_name ?? "");
          setCompanyName(
            profile.company_name ?? "",
          );

          setNotifications({
            emailNotifications:
              profile.email_notifications ?? true,
            reviewNotifications:
              profile.review_notifications ?? true,
            weeklyReport:
              profile.weekly_report ?? true,
          });
        }

        if (subscriptionResult.error) {
          loadingErrors.push(
            `Не удалось загрузить подписку: ${subscriptionResult.error.message}`,
          );
        } else if (subscriptionResult.data) {
          const currentSubscription =
            subscriptionResult.data as unknown as SubscriptionRow;

          setSubscription(currentSubscription);
        } else {
          setSubscription(null);
        }

        if (loadingErrors.length > 0) {
          setMessage({
            type: "error",
            text: loadingErrors.join(" "),
          });
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            "Не удалось загрузить настройки.",
          ),
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [router]);

  const planName = useMemo(() => {
    if (!subscription?.plan) {
      return "Не подключён";
    }

    return formatPlanName(subscription.plan);
  }, [subscription]);

  const subscriptionStatus = useMemo(() => {
    if (!subscription?.status) {
      return "Неактивна";
    }

    return formatSubscriptionStatus(
      subscription.status,
    );
  }, [subscription]);

  const subscriptionEndDate = useMemo(() => {
    const dateValue =
      subscription?.current_period_end ??
      subscription?.trial_ends_at ??
      null;

    if (!dateValue) {
      return "Не указана";
    }

    return formatDate(dateValue);
  }, [subscription]);

  const paymentProvider = useMemo(() => {
    if (!subscription?.payment_provider) {
      return "Не указан";
    }

    return formatPaymentProvider(
      subscription.payment_provider,
    );
  }, [subscription]);

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!userId) {
      setMessage({
        type: "error",
        text: "Не удалось определить пользователя.",
      });

      return;
    }

    try {
      setSavingProfile(true);
      setMessage(null);

      const profileUpdate = {
        full_name: fullName.trim() || null,
        company_name:
          companyName.trim() || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate as never)
        .eq("id", userId);

      if (error) {
        throw new Error(error.message);
      }

      setMessage({
        type: "success",
        text: "Данные профиля сохранены.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось сохранить профиль.",
        ),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleNotificationsSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!userId) {
      setMessage({
        type: "error",
        text: "Не удалось определить пользователя.",
      });

      return;
    }

    try {
      setSavingNotifications(true);
      setMessage(null);

      const notificationUpdate = {
        email_notifications:
          notifications.emailNotifications,
        review_notifications:
          notifications.reviewNotifications,
        weekly_report:
          notifications.weeklyReport,
      };

      const { error } = await supabase
        .from("profiles")
        .update(notificationUpdate as never)
        .eq("id", userId);

      if (error) {
        throw new Error(error.message);
      }

      setMessage({
        type: "success",
        text:
          "Настройки уведомлений сохранены.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось сохранить уведомления.",
        ),
      });
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text:
          "Пароль должен содержать минимум 8 символов.",
      });

      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Пароли не совпадают.",
      });

      return;
    }

    try {
      setChangingPassword(true);

      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        throw new Error(error.message);
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage({
        type: "success",
        text: "Пароль успешно изменён.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось изменить пароль.",
        ),
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setMessage(null);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось выйти из аккаунта.",
        ),
      });

      setSigningOut(false);
    }
  }

  return (
    <DashboardLayout
      title="Настройки"
      subtitle="Управляй профилем, подпиской и безопасностью аккаунта"
    >
      {message && (
        <div
          className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          <p>{message.text}</p>

          <button
            type="button"
            aria-label="Закрыть сообщение"
            onClick={() => setMessage(null)}
            className="text-lg leading-none opacity-70 transition hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <SettingsLoadingState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-6">
            <SettingsCard
              title="Профиль"
              description="Основная информация о владельце аккаунта"
            >
              <form
                onSubmit={handleProfileSubmit}
                className="space-y-5"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <SettingsInput
                    label="Имя"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Введите имя"
                    autoComplete="name"
                  />

                  <SettingsInput
                    label="Email"
                    value={email}
                    onChange={() => undefined}
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    disabled
                    helperText="Email связан с аккаунтом Supabase"
                  />
                </div>

                <SettingsInput
                  label="Название компании"
                  value={companyName}
                  onChange={setCompanyName}
                  placeholder="Например, ReviewTap"
                  autoComplete="organization"
                />

                <div className="flex justify-end">
                  <PrimaryButton
                    type="submit"
                    loading={savingProfile}
                    loadingText="Сохраняем..."
                  >
                    Сохранить профиль
                  </PrimaryButton>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Уведомления"
              description="Выбери, какие сообщения получать на email"
            >
              <form
                onSubmit={
                  handleNotificationsSubmit
                }
                className="space-y-3"
              >
                <NotificationSwitch
                  title="Email-уведомления"
                  description="Основные системные сообщения и новости сервиса"
                  checked={
                    notifications.emailNotifications
                  }
                  onChange={(checked) =>
                    setNotifications(
                      (current) => ({
                        ...current,
                        emailNotifications:
                          checked,
                      }),
                    )
                  }
                />

                <NotificationSwitch
                  title="Новые переходы и отзывы"
                  description="Уведомления о новой активности клиентов"
                  checked={
                    notifications.reviewNotifications
                  }
                  onChange={(checked) =>
                    setNotifications(
                      (current) => ({
                        ...current,
                        reviewNotifications:
                          checked,
                      }),
                    )
                  }
                />

                <NotificationSwitch
                  title="Еженедельный отчёт"
                  description="Краткая статистика по ресторанам и NFC-стендам"
                  checked={
                    notifications.weeklyReport
                  }
                  onChange={(checked) =>
                    setNotifications(
                      (current) => ({
                        ...current,
                        weeklyReport: checked,
                      }),
                    )
                  }
                />

                <div className="flex justify-end pt-3">
                  <PrimaryButton
                    type="submit"
                    loading={
                      savingNotifications
                    }
                    loadingText="Сохраняем..."
                  >
                    Сохранить уведомления
                  </PrimaryButton>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Безопасность"
              description="Измени пароль для входа в аккаунт"
            >
              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-5"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <SettingsInput
                    label="Новый пароль"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Минимум 8 символов"
                    type="password"
                    autoComplete="new-password"
                  />

                  <SettingsInput
                    label="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Повторите пароль"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex justify-end">
                  <PrimaryButton
                    type="submit"
                    loading={changingPassword}
                    loadingText="Изменяем..."
                  >
                    Изменить пароль
                  </PrimaryButton>
                </div>
              </form>
            </SettingsCard>
          </div>

          <div className="space-y-6">
            <SettingsCard
              title="Подписка"
              description="Информация о текущем тарифе"
            >
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-purple-300">
                      Текущий тариф
                    </p>

                    <h3 className="mt-2 text-2xl font-bold">
                      {planName}
                    </h3>
                  </div>

                  <SubscriptionBadge
                    status={
                      subscription?.status ??
                      "inactive"
                    }
                    label={subscriptionStatus}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <SubscriptionInfoRow
                    label="Статус"
                    value={subscriptionStatus}
                  />

                  <SubscriptionInfoRow
                    label="Дата окончания"
                    value={subscriptionEndDate}
                  />

                  <SubscriptionInfoRow
                    label="Оплата"
                    value={paymentProvider}
                  />

                  <SubscriptionInfoRow
                    label="ID подписки"
                    value={
                      subscription?.id
                        ? shortenId(
                            subscription.id,
                          )
                        : "Не создана"
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/pricing")
                  }
                  className="mt-6 w-full rounded-xl border border-purple-400/20 bg-purple-500/20 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
                >
                  Управление тарифом
                </button>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Аккаунт"
              description="Управление текущей сессией"
            >
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs text-gray-600">
                  Вы вошли как
                </p>

                <p className="mt-2 break-all text-sm font-medium text-gray-200">
                  {email || "Email не указан"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut
                  ? "Выходим..."
                  : "Выйти из аккаунта"}
              </button>
            </SettingsCard>

            <SettingsCard
              title="Опасная зона"
              description="Необратимые действия с аккаунтом"
              danger
            >
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-200">
                  Удаление аккаунта
                </p>

                <p className="mt-2 text-sm leading-6 text-red-200/70">
                  Удаление аккаунта будет
                  подключено после создания
                  безопасного серверного маршрута.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setMessage({
                      type: "error",
                      text:
                        "Удаление аккаунта пока отключено для защиты данных.",
                    })
                  }
                  className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  Удалить аккаунт
                </button>
              </div>
            </SettingsCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

type SettingsCardProps = {
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
};

function SettingsCard({
  title,
  description,
  danger = false,
  children,
}: SettingsCardProps) {
  return (
    <section
      className={`rounded-[28px] border p-6 backdrop-blur-xl ${
        danger
          ? "border-red-500/20 bg-red-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm text-gray-400">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

type SettingsInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  type?: string;
  autoComplete?: string;
};

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  disabled = false,
  type = "text",
  autoComplete,
}: SettingsInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {helperText && (
        <p className="mt-2 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </label>
  );
}

type NotificationSwitchProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function NotificationSwitch({
  title,
  description,
  checked,
  onChange,
}: NotificationSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div>
        <h4 className="font-medium text-white">
          {title}
        </h4>

        <p className="mt-1 text-sm text-gray-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-14 shrink-0 rounded-full transition ${
          checked
            ? "bg-purple-600"
            : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

type PrimaryButtonProps = {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  type?: "button" | "submit";
};

function PrimaryButton({
  children,
  loading = false,
  loadingText = "Загрузка...",
  type = "button",
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={loading}
      className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingText : children}
    </button>
  );
}

type SubscriptionBadgeProps = {
  status: string;
  label: string;
};

function SubscriptionBadge({
  status,
  label,
}: SubscriptionBadgeProps) {
  const normalizedStatus =
    status.toLowerCase();

  let classes =
    "border-red-500/20 bg-red-500/15 text-red-300";

  if (normalizedStatus === "active") {
    classes =
      "border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  } else if (
    normalizedStatus === "trialing"
  ) {
    classes =
      "border-blue-500/20 bg-blue-500/15 text-blue-300";
  } else if (
    normalizedStatus === "past_due"
  ) {
    classes =
      "border-yellow-500/20 bg-yellow-500/15 text-yellow-300";
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}

type SubscriptionInfoRowProps = {
  label: string;
  value: string;
};

function SubscriptionInfoRow({
  label,
  value,
}: SubscriptionInfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
      <span className="text-sm text-gray-400">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}

function SettingsLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-52 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}

function shortenId(id: string) {
  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function formatPlanName(plan: string) {
  switch (plan.toLowerCase()) {
    case "trial":
      return "Пробный период";

    case "free":
      return "Бесплатный";

    case "starter":
      return "Starter";

    case "pro":
      return "Pro";

    case "business":
      return "Business";

    case "enterprise":
      return "Enterprise";

    default:
      return plan;
  }
}

function formatSubscriptionStatus(
  status: string,
) {
  switch (status.toLowerCase()) {
    case "active":
      return "Активна";

    case "trialing":
      return "Пробный период";

    case "past_due":
      return "Ожидает оплату";

    case "canceled":
    case "cancelled":
      return "Отменена";

    case "unpaid":
      return "Не оплачена";

    case "expired":
      return "Истекла";

    case "inactive":
      return "Неактивна";

    default:
      return status;
  }
}

function formatPaymentProvider(
  provider: string,
) {
  switch (provider.toLowerCase()) {
    case "click":
      return "Click";

    case "payme":
      return "Payme";

    case "uzum":
      return "Uzum";

    default:
      return provider;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Некорректная дата";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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