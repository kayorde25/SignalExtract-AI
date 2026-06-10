import { NextRequest } from "next/server";
import { proxyRequest } from "../../../_proxy";

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  return proxyRequest(req, `/documents/${params.documentId}/extract-signals`);
}
