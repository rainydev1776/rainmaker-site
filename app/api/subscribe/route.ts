import { NextRequest, NextResponse } from "next/server";

type SubscribeRequestBody = {
  email: string;
};

function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SubscribeRequestBody;
    const email = body?.email?.trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const apiKey = process.env.MAILCHIMP_API_KEY ?? "";
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID ?? "";
    const serverPrefix =
      process.env.MAILCHIMP_SERVER_PREFIX ?? apiKey.split("-")[1] ?? "";

    if (!apiKey || !audienceId || !serverPrefix) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Mailchimp is not configured. Set MAILCHIMP_API_KEY, MAILCHIMP_AUDIENCE_ID, and MAILCHIMP_SERVER_PREFIX.",
        },
        { status: 500 }
      );
    }

    const endpoint = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

    const payload = {
      email_address: email,
      status: "subscribed" as const,
    };

    const authHeader = Buffer.from(`anystring:${apiKey}`).toString("base64");

    const mcResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(payload),
      // Mailchimp is external; don't cache
      cache: "no-store",
    });

    const data = (await mcResponse.json()) as {
      status?: number | string;
      title?: string;
      detail?: string;
      id?: string;
    };

    if (mcResponse.ok) {
      return NextResponse.json(
        { ok: true, message: "Thanks! You're on the waitlist." },
        { status: 201 }
      );
    }

    // Handle common Mailchimp errors with friendly messages
    const title = (data.title ?? "").toString().toLowerCase();
    if (title.includes("member exists")) {
      return NextResponse.json(
        { ok: true, message: "You're already on the waitlist." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          data.detail || "Could not subscribe at the moment. Please try again.",
      },
      { status: mcResponse.status || 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { ok: false, message: "Unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
