import { NextRequest } from "next/server";
import { proxyRequest } from "../../../_proxy";

export async function PATCH(req: NextRequest, { params }: { params: { signalId: string } }) {
  return proxyRequest(req, `/signals/${params.signalId}/review`);
}
