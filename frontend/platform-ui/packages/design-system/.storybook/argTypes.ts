import type { ArgTypes } from "@storybook/vue3";

type StoryArgType = ArgTypes[string];

type ArgControl =
  | string
  | boolean
  | {
      type: string;
    };

export type PropDocOptions = {
  description: string;
  type: string;
  required?: boolean;
  control?: ArgControl | false;
  options?: readonly string[];
  defaultValue?: string;
  detail?: string;
};

/** Formats option values as a union type for Storybook docs, e.g. `'default' | 'accent'`. */
export function formatUnionType(options: readonly string[]): string {
  return options.map((option) => `'${option}'`).join(" | ");
}

function splitTopLevelUnion(type: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of type) {
    if ("<{[(".includes(char)) {
      depth += 1;
    } else if (">}])".includes(char)) {
      depth = Math.max(0, depth - 1);
    }

    if (char === "|" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.length > 0 ? parts : [type.trim()];
}

function isFunctionLikeType(type: string): boolean {
  const trimmed = type.trim();
  return (
    trimmed === "slot" ||
    trimmed.includes("=>") ||
    trimmed.startsWith("(") ||
    /^\w+\s*\([^)]*\)\s*=>/.test(trimmed)
  );
}

function isBooleanLikeType(type: string): boolean {
  const allowed = new Set(["boolean", "true", "false", "null", "undefined"]);
  const parts = splitTopLevelUnion(type);
  return (
    parts.every((part) => allowed.has(part)) &&
    parts.some((part) => part === "boolean" || part === "true" || part === "false")
  );
}

function isNumberLikeType(type: string): boolean {
  const parts = splitTopLevelUnion(type);
  return (
    parts.every(
      (part) =>
        part === "number" ||
        part === "null" ||
        part === "undefined" ||
        /^-?\d+(\.\d+)?$/.test(part),
    ) &&
    parts.some((part) => part === "number" || /^-?\d+(\.\d+)?$/.test(part))
  );
}

function isObjectLikeType(type: string): boolean {
  const trimmed = type.trim();
  if (isFunctionLikeType(trimmed)) {
    return false;
  }
  if (/[[{]/.test(trimmed) || /\bRecord\s*</.test(trimmed)) {
    return true;
  }

  const parts = splitTopLevelUnion(trimmed);
  // A single part is this same type (no top-level `|`). Recursing would
  // infinite-loop on primitives like `"string"`.
  if (parts.length <= 1) {
    return false;
  }

  return parts.some((part) => {
    if (part === "null" || part === "undefined") {
      return false;
    }
    return isObjectLikeType(part);
  });
}

function inferControlFromType(type: string): ArgControl | false {
  if (isFunctionLikeType(type)) {
    return false;
  }
  if (isBooleanLikeType(type)) {
    return "boolean";
  }
  if (isNumberLikeType(type)) {
    return "number";
  }
  if (isObjectLikeType(type)) {
    return "object";
  }
  return "text";
}

function inferStorybookTypeName(type: string): "boolean" | "number" | "object" | "string" {
  if (isBooleanLikeType(type)) {
    return "boolean";
  }
  if (isNumberLikeType(type)) {
    return "number";
  }
  if (isObjectLikeType(type)) {
    return "object";
  }
  return "string";
}

/** Storybook argType with description, type summary, and optional required marker. */
export function propDoc(options: PropDocOptions): StoryArgType {
  const {
    description,
    type,
    required = false,
    control,
    options: selectOptions,
    defaultValue,
    detail,
  } = options;

  const hasSelectOptions = Boolean(selectOptions?.length);
  let resolvedControl: ArgControl | false;

  if (control === false) {
    resolvedControl = false;
  } else if (hasSelectOptions) {
    if (
      control === undefined ||
      control === "select" ||
      (typeof control === "object" && control.type === "select")
    ) {
      resolvedControl = { type: "select" };
    } else {
      resolvedControl = control;
    }
  } else if (control === undefined) {
    resolvedControl = inferControlFromType(type);
  } else {
    resolvedControl = control;
  }

  const inferredTypeName = hasSelectOptions ? "enum" : inferStorybookTypeName(type);

  return {
    description,
    ...(hasSelectOptions ? { options: [...selectOptions!] } : {}),
    ...(required ? { type: { name: inferredTypeName, required: true } } : {}),
    control: resolvedControl as StoryArgType["control"],
    table: {
      type: {
        summary: type,
        ...(detail ? { detail } : {}),
      },
      ...(defaultValue !== undefined
        ? { defaultValue: { summary: defaultValue } }
        : {}),
    },
  } as StoryArgType;
}
