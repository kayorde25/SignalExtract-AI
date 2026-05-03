import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/api";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

type ExtractTextResponse = {
  document_id: string;
  text: string;
  chunks: Array<{ chunk_id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const payload = await backendFetch<ExtractTextResponse>(
      `/api/v1/documents/${documentId}/extract-text`,
      { method: "POST" }
    );

    return NextResponse.json({
      documentId: payload.document_id,
      textPreview: payload.text.slice(0, 1500),
      chunkCount: payload.chunks.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Text extraction failed.",
      },
      { status: 500 }
    );
  }
}
