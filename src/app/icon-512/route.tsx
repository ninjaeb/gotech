import { brandIconResponse } from "@/lib/pwa-icon";

export function GET() {
  return brandIconResponse(512, 0.62);
}
