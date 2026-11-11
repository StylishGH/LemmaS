import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AdminAnalyticsDashboard from "./ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics administrativo | LEMMAS",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) notFound();

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_analytics_admin");
  if (adminCheckError || isAdmin !== true) notFound();

  return <AdminAnalyticsDashboard />;
}
