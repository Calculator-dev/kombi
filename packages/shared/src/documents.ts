import { z } from "zod";

/**
 * Documents an owner may ask the customer to upload with a booking request:
 * a photo of the ID card or passport, and of the driving licence.
 */
export const DOCUMENT_KINDS = ["id", "license"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** "off": not asked; "optional": the customer may add it; "required": no request without it. */
export const DOCUMENT_RULES = ["off", "optional", "required"] as const;
export type DocumentRule = (typeof DOCUMENT_RULES)[number];

export const documentRulesSchema = z.object({
  id: z.enum(DOCUMENT_RULES).default("off"),
  license: z.enum(DOCUMENT_RULES).default("off"),
});
export type DocumentRules = z.infer<typeof documentRulesSchema>;

export const NO_DOCUMENTS: DocumentRules = { id: "off", license: "off" };

/** Front and back of a card. */
export const MAX_FILES_PER_DOCUMENT = 2;
/** Per photo, before it is shrunk on the server. */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
/** Photos of documents are deleted this many days after the rental ends (or right away when it doesn't happen). */
export const KEEP_DOCUMENTS_DAYS = 30;

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  id: "Lična karta ili pasoš",
  license: "Vozačka dozvola",
};

/** Kinds the owner asks for at all. */
export const askedDocuments = (rules: DocumentRules): DocumentKind[] => DOCUMENT_KINDS.filter((k) => rules[k] !== "off");

/** Which required documents are missing from an upload, by kind. */
export function missingDocuments(rules: DocumentRules, uploaded: Partial<Record<DocumentKind, number>>): DocumentKind[] {
  return DOCUMENT_KINDS.filter((k) => rules[k] === "required" && !uploaded[k]);
}
