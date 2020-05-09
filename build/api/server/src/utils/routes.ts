import express from "express";
import { logs } from "../logs";

export class HttpError extends Error {
  code: number;
  constructor(message?: string, code?: number) {
    super(message);
    this.code = code || 500;
  }
}

/**
 * Wrap express routes to be able to safely throw errors and return JSON
 * @param handler
 */
export function wrapRoute(
  handler: express.RequestHandler
): express.RequestHandler {
  return async (req, res, next) => {
    try {
      const result = await handler(req, res, next);
      if (!res.headersSent) res.send({ success: true, result });
    } catch (e) {
      if (e instanceof HttpError)
        return res.status(e.code).send({ success: false, message: e.message });

      // Unexpected error
      logs.error(e);
      res.status(500).send({ success: false, message: e.message });
    }
  };
}
