import { NextResponse } from "next/server";

export interface ApiResponse<T> {
  data: T | null;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
    cursor?: string;
  };
  error: string | null;
}

export function apiSuccess<T>(data: T, meta?: ApiResponse<T>["meta"]): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, meta, error: null });
}

export function apiError(message: string, status = 400): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ data: null, error: message }, { status });
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    data,
    meta: { page, pageSize, total, hasMore: page * pageSize < total },
    error: null,
  });
}
