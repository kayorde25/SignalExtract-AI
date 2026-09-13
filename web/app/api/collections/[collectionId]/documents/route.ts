import { NextRequest } from "next/server";
import { proxyRequest } from "../../../_proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: { collectionId: string } },
) {
  return proxyRequest(req, `/collections/${params.collectionId}/documents`);
}
