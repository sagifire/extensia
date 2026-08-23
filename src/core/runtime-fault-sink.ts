import type { ContributionToken, Token } from "@sagifire/ioc";

import {
  createExtensiaInternalNamespace,
  synchronousContributionToken,
} from "../composition/tokens.js";

const runtimeFaultTokens =
  createExtensiaInternalNamespace("core.runtime-fault");

export type RuntimeFault =
  | {
      readonly kind: "integrity";
      readonly code:
        | "RESOURCE_STORAGE_INTEGRITY"
        | "RESOURCE_INDEX_INTEGRITY"
        | "ASSET_STORAGE_INTEGRITY";
      readonly operation_id?: string;
    }
  | {
      readonly kind: "fatal-runtime";
      readonly code: "READ_MODEL_RUNTIME_FAILED";
    };

export interface RuntimeFaultSink {
  readonly failed: boolean;
  readonly fault: RuntimeFault | null;
  report(fault: RuntimeFault): void;
  subscribe(handler: (fault: RuntimeFault) => void): () => void;
  drain(): Promise<void>;
}

export const RUNTIME_FAULT_SINK: Token<RuntimeFaultSink> =
  runtimeFaultTokens.token("sink");
export const RUNTIME_FAULT_SINK_CONTRIBUTIONS: ContributionToken<RuntimeFaultSink> =
  synchronousContributionToken(runtimeFaultTokens, "sink-contributions");

export function createRuntimeFaultSink(input: {
  readonly closeIntake: () => void;
  readonly cleanup: (fault: RuntimeFault) => void | Promise<void>;
}): RuntimeFaultSink {
  let fault: RuntimeFault | null = null;
  let cleanup: Promise<void> = Promise.resolve();
  const subscribers = new Set<(fault: RuntimeFault) => void>();
  return Object.freeze({
    get failed(): boolean {
      return fault !== null;
    },
    get fault(): RuntimeFault | null {
      return fault;
    },
    report(next: RuntimeFault): void {
      if (fault !== null) return;
      fault = Object.freeze({ ...next });
      input.closeIntake();
      for (const subscriber of [...subscribers]) {
        try {
          subscriber(fault);
        } catch {
          // One fail-close consumer must not prevent the remaining consumers.
        }
      }
      cleanup = Promise.resolve()
        .then(() => input.cleanup(fault!))
        .catch(() => undefined);
    },
    subscribe(handler: (fault: RuntimeFault) => void): () => void {
      subscribers.add(handler);
      if (fault !== null) handler(fault);
      return () => subscribers.delete(handler);
    },
    drain(): Promise<void> {
      return cleanup;
    },
  });
}
