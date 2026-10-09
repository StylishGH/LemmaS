import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  try {
    const { count, error } = await supabase
      .from("questoes")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          service: "lemmas-web-api",
          database: "error",
          error: error.message,
          total_questions: 288,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: "ok",
      service: "lemmas-supabase-engine",
      database: "connected",
      total_questions: count ?? 288,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        service: "lemmas-web-api",
        database: "disconnected",
        message,
        total_questions: 288,
      },
      { status: 500 }
    );
  }
}
