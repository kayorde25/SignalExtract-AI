import { NextRequest } from "next/server";
import { proxyRequest } from "../../../../_proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { collectionId: string; documentId: string } },
) {
  return proxyRequest(req, `/collections/${params.collectionId}/documents/${params.documentId}`);
}
