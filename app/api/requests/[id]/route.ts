import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, getSessionRole } from "@/lib/session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

async function isAdmin(req: NextRequest): Promise<boolean> {
  const role = await getSessionRole(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.COOKIE_SECRET!
  );
  return role === "admin";
}

function forbidden() {
  return NextResponse.json(
    { ok: false, error: "Admin passphrase required." },
    { status: 403 }
  );
}

/**
 * Admin status changes: requested ↔ declined only. The nightly sync owns the
 * requested → added transition; the app never sets 'added'.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAdmin(req))) return forbidden();

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "decline" && action !== "undecline") {
    return NextResponse.json(
      { ok: false, error: "action must be 'decline' or 'undecline'." },
      { status: 400 }
    );
  }

  const from = action === "decline" ? "requested" : "declined";
  const to = action === "decline" ? "declined" : "requested";

  const { data, error } = await db
    .from("requests")
    .update({ status: to })
    .eq("id", id)
    .eq("status", from)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Couldn't update the request." },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Request not found or not in the right state." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, status: to });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAdmin(req))) return forbidden();

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  const { data, error } = await db
    .from("requests")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Couldn't delete the request." },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Request not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
