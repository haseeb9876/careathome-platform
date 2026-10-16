import { getAuth } from "@/lib/database/auth-server";
export async function GET(request: Request) { return getAuth().handler(request); }
export async function POST(request: Request) { return getAuth().handler(request); }
export const dynamic = "force-dynamic";
