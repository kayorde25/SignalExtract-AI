import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/api";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

type ExtractSignalsResponse = {
  document_id: string;
  signals: Array<{ signal_id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const payload = await backendFetch<ExtractSignalsResponse>(
      `/api/v1/documents/${documentId}/extract-signals`,
      { method: "POST" }
    );

    return NextResponse.json({
      documentId: payload.document_id,
      signalCount: payload.signals.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Signal extraction failed.",
      },
      { status: 500 }
    );
  }
}
