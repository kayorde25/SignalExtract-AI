import { backendFetch } from "@/lib/api";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const payload = await backendFetch<string>(
      `/api/v1/documents/${documentId}/export-approved.csv`,
      {
        headers: { Accept: "text/csv" },
        responseType: "text",
      }
    );

    return new Response(payload ?? "", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${documentId}-approved-export.csv"`,
      },
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Approved export failed.",
      },
      { status: 500 }
    );
  }
}
