import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_error",
      message: "Provjerite označena polja.",
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join(".") || "_", i.message])),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "invalid_json", message: "Neispravan zahtjev." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "server_error", message: "Greška na serveru. Pokušajte ponovo ili nas kontaktirajte." });
};
