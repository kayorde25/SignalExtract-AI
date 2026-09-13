import { NextRequest } from "next/server";
import { proxyRequest } from "../../_proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: { entityId: string } },
) {
  return proxyRequest(req, `/entities/${params.entityId}`);
}
