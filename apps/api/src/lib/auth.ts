import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { serverConfig } from "./config";

export type AuthClaims = {
  sub: string;
  username: string;
  type: "auth";
};

export type RiftSessionClaims = {
  sub: string;
  username: string;
  riftId: string;
  type: "rift-session";
};

export type AuthContext = {
  userId: string;
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signAuthToken(userId: string, username: string): string {
  const secret = requireJwtSecret();
  return jwt.sign({ sub: userId, username, type: "auth" } satisfies AuthClaims, secret, {
    expiresIn: "30d",
  });
}

export function signRiftSessionToken(userId: string, username: string, riftId: string): string {
  const secret = requireJwtSecret();
  return jwt.sign(
    { sub: userId, username, riftId, type: "rift-session" } satisfies RiftSessionClaims,
    secret,
    { expiresIn: "8m" },
  );
}

export function verifyAuthToken(token: string): AuthClaims {
  const secret = requireJwtSecret();
  const decoded = jwt.verify(token, secret);

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid auth token");
  }

  const sub = typeof decoded.sub === "string" ? decoded.sub : "";
  const username = typeof decoded.username === "string" ? decoded.username : "";
  const type = decoded.type;

  if (!sub || !ObjectId.isValid(sub) || !username || type !== "auth") {
    throw new Error("Invalid auth token");
  }

  return { sub, username, type };
}

export function verifyRiftSessionToken(token: string): RiftSessionClaims {
  const secret = requireJwtSecret();
  const decoded = jwt.verify(token, secret);

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid rift session token");
  }

  const sub = typeof decoded.sub === "string" ? decoded.sub : "";
  const username = typeof decoded.username === "string" ? decoded.username : "";
  const riftId = typeof decoded.riftId === "string" ? decoded.riftId : "";
  const type = decoded.type;

  if (!sub || !username || !riftId || type !== "rift-session") {
    throw new Error("Invalid rift session token");
  }

  return { sub, username, riftId, type };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const claims = verifyAuthToken(token);
    req.auth = {
      userId: claims.sub,
      username: claims.username,
    };
  } catch {
    req.auth = undefined;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const claims = verifyAuthToken(token);
    req.auth = {
      userId: claims.sub,
      username: claims.username,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim() || null;
}

function requireJwtSecret(): string {
  if (!serverConfig.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return serverConfig.jwtSecret;
}
