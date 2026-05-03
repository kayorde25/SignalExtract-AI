import { NextResponse } from "next/server";

import { uploadDocument } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    if (!formData.get("file")) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const result = await uploadDocument(formData);

    return NextResponse.json({
      documentId: result.document.document_id,
      filename: result.document.filename,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
