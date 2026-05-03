import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/api";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const payload = await backendFetch<unknown[]>(
      `/api/v1/documents/${documentId}/export-approved.json`
    );

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="${documentId}-approved-export.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Approved export failed.",
      },
      { status: 500 }
    );
  }
}
