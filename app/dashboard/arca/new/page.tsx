import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import { resolveUser, hasProAccess, FREE_LIMITS } from "@/lib/auth/user";
import NewArcaForm from "./NewArcaForm";

export const metadata = { title: "New Arca — ARCA" };

export default async function NewArcaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const resolvedUser = await resolveUser(authUser);
  if (!hasProAccess(resolvedUser)) {
    const packCount = await prisma.messagePack.count({ where: { ownerId: authUser.id } });
    if (packCount >= FREE_LIMITS.maxPacks) redirect("/dashboard/billing");
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-10">
        {/* Nav */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a new Arca
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            An Arca is a sealed message pack — delivered to the people you
            choose, at the moment you decide. Start by choosing what kind of
            message you want to leave.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <Step n={1} label="Choose type" active />
          <Connector />
          <Step n={2} label="Write your message" />
          <Connector />
          <Step n={3} label="Set delivery" />
        </div>

        {/* The interactive form */}
        <NewArcaForm />
      </div>
    </main>
  );
}

function Step({
  n,
  label,
  active = false,
}: {
  n: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
          active
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <span
        className={`text-xs ${active ? "text-foreground" : "text-muted-foreground/50"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Connector() {
  return <div className="flex-1 h-px bg-border max-w-8" />;
}
