import type { Metadata } from "next";
import AdminAnalyticsDashboard from "./ui";

export const metadata: Metadata = {
  title: "Analytics administrativo | LEMMAS",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsDashboard />;
}
