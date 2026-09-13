import { NextRequest } from "next/server";
import { proxyRequest } from "../../_proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { collectionId: string } },
) {
  return proxyRequest(req, `/collections/${params.collectionId}`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { collectionId: string } },
) {
  return proxyRequest(req, `/collections/${params.collectionId}`);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { collectionId: string } },
) {
  return proxyRequest(req, `/collections/${params.collectionId}`);
}
