import type { z } from "zod";

export interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

type AnyDef = { typeName?: string; description?: string; innerType?: unknown; schema?: unknown; values?: unknown[] };
const defOf = (s: unknown): AnyDef => (s as { _def?: AnyDef })?._def ?? {};

const TYPE_LABEL: Record<string, string> = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBoolean: "boolean",
  ZodRecord: "object",
  ZodObject: "object",
  ZodArray: "array",
  ZodAny: "any",
  ZodUnknown: "any",
  ZodDate: "date",
};

/** Best-effort description of one schema field (type, required, description). */
function describeField(field: unknown): { type: string; required: boolean; description: string } {
  let f = field;
  let required = true;
  let description = defOf(f).description;
  // Unwrap optional/default/nullable/effects wrappers.
  while (f) {
    const d = defOf(f);
    if (d.typeName === "ZodOptional" || d.typeName === "ZodDefault" || d.typeName === "ZodNullable") {
      required = false;
      f = d.innerType;
    } else if (d.typeName === "ZodEffects") {
      f = d.schema;
    } else {
      break;
    }
    if (!description) description = defOf(f).description;
  }
  const d = defOf(f);
  let type = TYPE_LABEL[d.typeName ?? ""] ?? "string";
  if (d.typeName === "ZodEnum" && Array.isArray(d.values)) type = d.values.join(" | ");
  if (d.typeName === "ZodUnion") type = "string | array";
  return { type, required, description: description ?? "" };
}

/** Extract a parameter list from a Zod object schema (its `.shape`). */
export function describeSchema(schema: z.ZodTypeAny): ParamInfo[] {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return [];
  return Object.entries(shape).map(([name, field]) => {
    const { type, required, description } = describeField(field);
    return { name, type, required, description };
  });
}
