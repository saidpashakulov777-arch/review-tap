import {
  createHash,
  randomUUID,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

type TagRow = {
  id: string;
  code: string;
  google_review_url: string;
  is_active: boolean;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { code } = await context.params;

  if (!code) {
    return new NextResponse(
      "NFC-ссылка не найдена.",
      {
        status: 404,
      },
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("nfc_tags")
    .select(
      "id, code, google_review_url, is_active",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return new NextResponse(
      "Не удалось открыть NFC-ссылку.",
      {
        status: 500,
      },
    );
  }

  if (!data) {
    return new NextResponse(
      "NFC-ссылка не найдена.",
      {
        status: 404,
      },
    );
  }

  const tag = data as TagRow;

  if (!tag.is_active) {
    return new NextResponse(
      "NFC-ссылка отключена.",
      {
        status: 410,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const targetUrl =
    validateRedirectUrl(
      tag.google_review_url,
    );

  if (!targetUrl) {
    return new NextResponse(
      "Для этой NFC-метки указана неправильная Google-ссылка.",
      {
        status: 400,
      },
    );
  }

  const oldVisitorId =
    request.cookies.get(
      "reviewtap_visitor",
    )?.value;

  const visitorId =
    oldVisitorId || randomUUID();

  const ipAddress =
    getRequestIp(request);

  const ipHash =
    createIpHash(ipAddress);

  await supabaseAdmin
    .from("tap_events")
    .insert({
      nfc_tag_id: tag.id,
      event_type: "tap",
      visitor_id: visitorId,
      user_agent:
        request.headers.get(
          "user-agent",
        ),
      referrer:
        request.headers.get(
          "referer",
        ),
      ip_hash: ipHash,
    });

  const response =
    NextResponse.redirect(
      targetUrl,
      307,
    );

  response.headers.set(
    "Cache-Control",
    "no-store",
  );

  if (!oldVisitorId) {
    response.cookies.set(
      "reviewtap_visitor",
      visitorId,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          60 * 60 * 24 * 365,
      },
    );
  }

  return response;
}

function validateRedirectUrl(
  value: string,
) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    const hostname =
      url.hostname.toLowerCase();

    const isGoogleDomain =
      /(^|\.)google\.[a-z.]+$/.test(
        hostname,
      );

    const isShortGoogleDomain =
      hostname === "g.page" ||
      hostname.endsWith(".g.page") ||
      hostname === "goo.gl" ||
      hostname.endsWith(".goo.gl");

    if (
      !isGoogleDomain &&
      !isShortGoogleDomain
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function getRequestIp(
  request: NextRequest,
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for",
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() || null
    );
  }

  return (
    request.headers.get(
      "x-real-ip",
    ) || null
  );
}

function createIpHash(
  ipAddress: string | null,
) {
  const salt =
    process.env.IP_HASH_SALT;

  if (!ipAddress || !salt) {
    return null;
  }

  return createHash("sha256")
    .update(`${salt}:${ipAddress}`)
    .digest("hex");
}
