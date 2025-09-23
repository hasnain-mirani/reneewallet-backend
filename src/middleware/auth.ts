import type { Request, Response, NextFunction } from "express";

export function authRequired(_req: Request, _res: Response, next: NextFunction) {
  // TODO: verify token here; for now just pass through
  next();
}

export function requireRole(..._roles: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // TODO: check req.user.role against _roles
    next();
  };
}
