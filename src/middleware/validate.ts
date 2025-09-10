import { AnyZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError";

export const validate =
  (schema: AnyZodObject, which: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[which as keyof typeof req]);
      Object.assign(req, { [which]: data });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new HttpError(400, "Validation error", err.flatten()));
      }
      next(err);
    }
  };