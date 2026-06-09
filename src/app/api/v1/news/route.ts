export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import * as cryptocompare from "@/lib/cryptocompare";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categories = searchParams.get("categories") ?? undefined;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const articles = await cryptocompare.getNews(categories, limit);

    return apiSuccess(
      articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        source: a.source,
        sourceLogo: a.source_info?.img,
        publishedAt: new Date(a.published_on * 1000).toISOString(),
        categories: a.categories,
        tags: a.tags,
        upvotes: a.upvotes,
        downvotes: a.downvotes,
      })),
      { total: articles.length }
    );
  } catch (error) {
    console.error("GET /api/v1/news error:", error);
    return apiError("Failed to fetch news", 502);
  }
}
