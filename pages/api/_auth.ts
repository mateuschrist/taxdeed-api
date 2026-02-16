// pages/api/_auth.ts
import type { NextApiRequest } from "next";

export function requireBearer(req: NextApiRequest) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.INGEST_API_TOKEN || "";

  if (!expected || token !== expected) {
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.statusCode = 401;
    throw err;
  }
}

export function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
