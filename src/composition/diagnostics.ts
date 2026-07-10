import {
  isSagifireIocError,
  type Diagnostic,
  type DiagnosticReport,
  type DiagnosticSeverity,
} from "@sagifire/ioc";

export type SafeCompositionDiagnosticCategory =
  | "adapter"
  | "cardinality"
  | "cycle"
  | "duplicate"
  | "invalid"
  | "missing"
  | "private-access"
  | "unexpected";

export type CompositionFailureStage =
  | "registration"
  | "validation"
  | "compose"
  | "capability-export"
  | "inspection";

export interface SafeCompositionDiagnostic {
  readonly code:
    | "EXTENSIA_COMPOSITION_ADAPTER_INVALID"
    | "EXTENSIA_COMPOSITION_CARDINALITY_INVALID"
    | "EXTENSIA_COMPOSITION_CYCLE"
    | "EXTENSIA_COMPOSITION_DUPLICATE"
    | "EXTENSIA_COMPOSITION_INVALID"
    | "EXTENSIA_COMPOSITION_MISSING"
    | "EXTENSIA_COMPOSITION_PRIVATE_ACCESS"
    | "EXTENSIA_COMPOSITION_UNEXPECTED";
  readonly severity: DiagnosticSeverity;
  readonly category: SafeCompositionDiagnosticCategory;
}

function safeDiagnosticCode(
  category: SafeCompositionDiagnosticCategory,
): SafeCompositionDiagnostic["code"] {
  switch (category) {
    case "adapter":
      return "EXTENSIA_COMPOSITION_ADAPTER_INVALID";
    case "cardinality":
      return "EXTENSIA_COMPOSITION_CARDINALITY_INVALID";
    case "cycle":
      return "EXTENSIA_COMPOSITION_CYCLE";
    case "duplicate":
      return "EXTENSIA_COMPOSITION_DUPLICATE";
    case "invalid":
      return "EXTENSIA_COMPOSITION_INVALID";
    case "missing":
      return "EXTENSIA_COMPOSITION_MISSING";
    case "private-access":
      return "EXTENSIA_COMPOSITION_PRIVATE_ACCESS";
    case "unexpected":
      return "EXTENSIA_COMPOSITION_UNEXPECTED";
  }
}

export interface SafeCompositionFailure {
  readonly code:
    "EXTENSIA_COMPOSITION_INVALID_GRAPH" | "EXTENSIA_COMPOSITION_FAILED";
  readonly stage: CompositionFailureStage;
  readonly diagnostics: readonly SafeCompositionDiagnostic[];
}

function categorizeDiagnostic(code: string): SafeCompositionDiagnosticCategory {
  if (code.includes("ADAPTER")) return "adapter";
  if (
    code.includes("CARDINALITY") ||
    code.includes("GET_ALL") ||
    code.includes("GET_USED_FOR_MULTI")
  ) {
    return "cardinality";
  }
  if (code.includes("CYCLE")) return "cycle";
  if (code.includes("DUPLICATE")) return "duplicate";
  if (code.includes("MISSING") || code.includes("NOT_FOUND")) return "missing";
  if (code.includes("PRIVATE")) return "private-access";
  if (code.includes("INVALID") || code.includes("MISMATCH")) return "invalid";
  return "unexpected";
}

function toSafeDiagnostic(diagnostic: Diagnostic): SafeCompositionDiagnostic {
  const category = categorizeDiagnostic(diagnostic.code);
  return Object.freeze({
    code: safeDiagnosticCode(category),
    severity: diagnostic.severity,
    category,
  });
}

export function safeDiagnosticsFromReport(
  report: DiagnosticReport,
): readonly SafeCompositionDiagnostic[] {
  return Object.freeze(report.diagnostics.map(toSafeDiagnostic));
}

export function normalizeCompositionReport(
  report: DiagnosticReport,
): SafeCompositionFailure {
  return Object.freeze({
    code: "EXTENSIA_COMPOSITION_INVALID_GRAPH",
    stage: "validation",
    diagnostics: safeDiagnosticsFromReport(report),
  });
}

export function normalizeCompositionError(
  error: unknown,
  stage: CompositionFailureStage,
): SafeCompositionFailure {
  const category = isSagifireIocError(error)
    ? categorizeDiagnostic(error.code)
    : "unexpected";
  const diagnostic: SafeCompositionDiagnostic = Object.freeze({
    code: safeDiagnosticCode(category),
    severity: "error",
    category,
  });

  return Object.freeze({
    code: "EXTENSIA_COMPOSITION_FAILED",
    stage,
    diagnostics: Object.freeze([diagnostic]),
  });
}
