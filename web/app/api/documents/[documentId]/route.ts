import { NextRequest } from "next/server";
import { proxyRequest } from "../../_proxy";

export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
  return proxyRequest(req, `/documents/${params.documentId}`);
}

export async function DELETE(req: NextRequest, { params }: { params: { documentId: string } }) {
  return proxyRequest(req, `/documents/${params.documentId}`);
}
