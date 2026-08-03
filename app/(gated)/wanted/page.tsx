import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { WantedClient } from "@/components/wanted-client";
import { NAME_COOKIE, validateName } from "@/lib/identity";
import { SESSION_COOKIE, getSessionRole } from "@/lib/session";
import type { TitleRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Wanted" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function WantedPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const [{ data, error }, cookieStore] = await Promise.all([
    db.from("requests").select("*").order("created_at", { ascending: false }),
    cookies(),
  ]);

  if (error) {
    throw new Error(`Failed to load requests: ${error.message}`);
  }

  const role = await getSessionRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    process.env.COOKIE_SECRET!
  );

  return (
    <WantedClient
      requests={(data ?? []) as TitleRequest[]}
      initialQuery={typeof q === "string" ? q : ""}
      isAdmin={role === "admin"}
      viewerName={validateName(cookieStore.get(NAME_COOKIE)?.value)}
    />
  );
}
