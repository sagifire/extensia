import type { RuntimeInspection } from "@sagifire/ioc";

import {
  safeDiagnosticsFromReport,
  type SafeCompositionDiagnostic,
} from "./diagnostics.js";

export interface SafeModuleInspection {
  readonly id: string;
  readonly version?: string;
  readonly requiredPortIds: readonly string[];
  readonly capabilityIds: readonly string[];
}

export interface SafeRequiredPortInspection {
  readonly moduleId: string;
  readonly tokenId: string;
  readonly required: boolean;
  readonly kind: "external" | "shared";
  readonly cardinality: "single" | "multi";
  readonly providerCount: number;
  readonly satisfiedBy: "binding" | "capability" | "optional" | "missing";
}

export interface SafeCapabilityInspection {
  readonly moduleId: string;
  readonly tokenId: string;
  readonly kind:
    | "public-api"
    | "admin-contribution"
    | "event-publisher"
    | "event-subscriber"
    | "shared-service"
    | "custom";
  readonly cardinality: "single" | "multi";
  readonly providerCount: number;
}

export interface SafeBindingInspection {
  readonly tokenId: string;
  readonly kind: "value" | "factory" | "class" | "async-factory" | "adapter";
  readonly providerKind:
    "value" | "factory" | "class" | "async-factory" | "async-resource";
  readonly lifetime?: "singleton" | "transient" | "scoped";
  readonly initialization?: "lazy" | "eager";
}

export interface SafeEdgeInspection {
  readonly edgeKind: "capability" | "binding" | "adapter-source";
  readonly consumerModuleId: string;
  readonly requiredTokenId: string;
  readonly dependencyKind: "external" | "shared";
}

export interface SafeProviderRegistrationInspection {
  readonly source: "module" | "composition-root";
  readonly moduleId?: string;
  readonly tokenId: string;
  readonly cardinality: "single" | "multi";
  readonly registrationKind: "single" | "multi";
  readonly providerCount: number;
}

export interface SafeCompositionInspection {
  readonly modules: readonly SafeModuleInspection[];
  readonly requiredPorts: readonly SafeRequiredPortInspection[];
  readonly capabilities: readonly SafeCapabilityInspection[];
  readonly bindings: readonly SafeBindingInspection[];
  readonly edges: readonly SafeEdgeInspection[];
  readonly providerRegistrations: readonly SafeProviderRegistrationInspection[];
  readonly diagnostics: readonly SafeCompositionDiagnostic[];
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

export function createSafeCompositionInspection(
  inspection: RuntimeInspection,
): SafeCompositionInspection {
  const modules = inspection.modules.map((module) =>
    Object.freeze({
      id: module.id,
      ...(module.version === undefined ? {} : { version: module.version }),
      requiredPortIds: freezeStrings(module.requiredPortIds),
      capabilityIds: freezeStrings(module.capabilityIds),
    }),
  );
  const requiredPorts = inspection.requiredPorts.map((port) =>
    Object.freeze({
      moduleId: port.moduleId,
      tokenId: port.tokenId,
      required: port.required,
      kind: port.kind,
      cardinality: port.cardinality,
      providerCount: port.providerCount,
      satisfiedBy: port.satisfiedBy,
    }),
  );
  const capabilities = inspection.capabilities.map((capability) =>
    Object.freeze({
      moduleId: capability.moduleId,
      tokenId: capability.tokenId,
      kind: capability.kind,
      cardinality: capability.cardinality,
      providerCount: capability.providers.length,
    }),
  );
  const bindings = inspection.bindings.map((binding) =>
    Object.freeze({
      tokenId: binding.tokenId,
      kind: binding.kind,
      providerKind: binding.providerKind,
      ...(binding.lifetime === undefined ? {} : { lifetime: binding.lifetime }),
      ...(binding.initialization === undefined
        ? {}
        : { initialization: binding.initialization }),
    }),
  );
  const edges = inspection.edges.map((edge) =>
    Object.freeze({
      edgeKind: edge.edgeKind,
      consumerModuleId: edge.consumerModuleId,
      requiredTokenId: edge.requiredTokenId,
      dependencyKind: edge.dependencyKind,
    }),
  );
  const providerRegistrations = inspection.providerRegistrations.map(
    (registration) =>
      Object.freeze({
        source: registration.source,
        ...(registration.moduleId === undefined
          ? {}
          : { moduleId: registration.moduleId }),
        tokenId: registration.tokenId,
        cardinality: registration.cardinality,
        registrationKind: registration.registrationKind,
        providerCount: registration.providers.length,
      }),
  );

  return Object.freeze({
    modules: Object.freeze(modules),
    requiredPorts: Object.freeze(requiredPorts),
    capabilities: Object.freeze(capabilities),
    bindings: Object.freeze(bindings),
    edges: Object.freeze(edges),
    providerRegistrations: Object.freeze(providerRegistrations),
    diagnostics: safeDiagnosticsFromReport(inspection.validation),
  });
}
