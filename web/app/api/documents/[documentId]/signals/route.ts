import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/api";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

type SignalResponse = {
  document_id: string;
  signals: Array<Record<string, unknown>>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const payload = await backendFetch<SignalResponse>(
      `/api/v1/documents/${documentId}/signals`
    );

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch signals.",
      },
      { status: 500 }
    );
  }
}
