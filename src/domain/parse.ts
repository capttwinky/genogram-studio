import { ZodError } from "zod";
import { extractGenogramJson } from "./markdown";
import { GenogramSchema } from "./schema";
import { normalizeGenogram, type NormalizedGenogram, type ValidationIssue } from "./normalize";

export type ParseResult =
  | { ok: true; graph: NormalizedGenogram; warning?: string }
  | { ok: false; issues: ValidationIssue[]; warning?: string };

export function parseMarkdownGenogram(markdown: string): ParseResult {
  const extracted = extractGenogramJson(markdown);

  try {
    const raw = JSON.parse(extracted.source) as unknown;
    const parsed = GenogramSchema.parse(raw);
    const normalized = normalizeGenogram(parsed);

    if (!normalized.graph) {
      return { ok: false, issues: normalized.issues, warning: extracted.warning };
    }

    return { ok: true, graph: normalized.graph, warning: extracted.warning };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, issues: [{ message: error.message, path: "json" }], warning: extracted.warning };
    }
    if (error instanceof ZodError) {
      return {
        ok: false,
        issues: error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
        warning: extracted.warning,
      };
    }
    return { ok: false, issues: [{ message: "Unexpected parser failure." }], warning: extracted.warning };
  }
}

