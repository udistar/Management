import { createSign } from "node:crypto";
import { isAllowedOwnerEmail } from "../../client/src/lib/allowedEmail";
import { parseGa4Rows } from "../../shared/homepageVisits";

declare const Netlify: { env: { get(name: string): string | undefined } };

export const config = {
  path: "/api/ga4-daily-visits",
  method: "GET",
};

function env(name: string): string {
  return (Netlify.env.get(name) || "").trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function googleAccessToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(privateKeyPem).toString("base64url");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error("ga4 token failed");
  }
  const payload = (await tokenResponse.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("ga4 token missing");
  return payload.access_token;
}

function serviceAccount(): { clientEmail: string; privateKey: string } | null {
  const rawJson = env("GA4_SERVICE_ACCOUNT_JSON");
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        client_email?: string;
        private_key?: string;
      };
      const clientEmail = (parsed.client_email || "").trim();
      const privateKey = (parsed.private_key || "")
        .replace(/\\n/g, "\n")
        .trim();
      if (clientEmail && privateKey) return { clientEmail, privateKey };
    } catch {
      return null;
    }
  }

  const clientEmail = env("GA4_CLIENT_EMAIL");
  const privateKey = env("GA4_PRIVATE_KEY").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

async function callerEmail(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const token = match?.[1] || "";
  const supabaseUrl = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const anonKey = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("auth config missing");
  }
  if (!token) return null;

  const userResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { email?: string };
  return user.email ?? null;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "허용되지 않은 요청입니다." }, 405);
  }

  let email: string | null = null;
  try {
    email = await callerEmail(request);
  } catch {
    return json({ error: "GA4 조회수를 불러오지 못했습니다." }, 503);
  }
  if (!isAllowedOwnerEmail(email)) {
    return json({ error: "로그인 후 다시 열어 주세요." }, 401);
  }

  const propertyId = env("GA4_PROPERTY_ID");
  const account = serviceAccount();
  if (!/^\d+$/.test(propertyId) || !account) {
    return json({ error: "GA4 조회수를 불러오지 못했습니다." }, 503);
  }

  try {
    const accessToken = await googleAccessToken(
      account.clientEmail,
      account.privateKey
    );
    const report = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "45daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "screenPageViews" }],
        }),
      }
    );
    if (!report.ok) {
      console.error("ga4 report failed", report.status);
      return json({ error: "GA4 조회수를 불러오지 못했습니다." }, 502);
    }
    const payload = (await report.json()) as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    return json({ days: parseGa4Rows(payload.rows ?? []) });
  } catch (error) {
    console.error(
      "ga4 report error",
      error instanceof Error ? error.name : "error"
    );
    return json({ error: "GA4 조회수를 불러오지 못했습니다." }, 502);
  }
}
