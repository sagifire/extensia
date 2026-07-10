import type { ContributionToken } from "@sagifire/ioc";

import type { SafeCompositionFailure } from "../composition/diagnostics.js";
import {
  composeExtensia,
  multiCapability,
  type ExtensiaComposition,
  type ExtensiaCompositionRegistry,
} from "../composition/root.js";
import {
  createExtensiaInternalNamespace,
  synchronousContributionToken,
} from "../composition/tokens.js";

const LIFECYCLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const MAX_LIFECYCLE_ID_LENGTH = 128;
const lifecycleTokens = createExtensiaInternalNamespace("runtime.lifecycle");

export type LifecycleState =
  "created" | "starting" | "started" | "stopping" | "stopped" | "failed";

export type LifecycleFailureCode =
  | "LIFECYCLE_VALIDATION_FAILED"
  | "LIFECYCLE_START_FAILED"
  | "LIFECYCLE_PUBLICATION_FAILED"
  | "LIFECYCLE_STOP_FAILED"
  | "RUNTIME_DISPOSE_FAILED"
  | "LIFECYCLE_BUSY"
  | "LIFECYCLE_INVALID_STATE";

export type LifecycleFailureStage =
  "validation" | "start" | "publication" | "stop" | "dispose" | "transition";

export interface LifecycleContribution {
  readonly id: string;
  readonly order: number;
  start(): Promise<void>;
  publishReady?(): void;
  unpublishReady?(): void;
  stop(): Promise<void>;
}

export interface LifecycleFailureEntry {
  readonly code: LifecycleFailureCode;
  readonly stage: LifecycleFailureStage;
  readonly contributionId?: string;
}

export interface LifecycleSuccess {
  readonly ok: true;
  readonly state: LifecycleState;
}

export interface LifecycleFailure {
  readonly ok: false;
  readonly state: LifecycleState;
  readonly failures: readonly LifecycleFailureEntry[];
}

export type LifecycleResult = LifecycleSuccess | LifecycleFailure;

export interface LifecycleInspection {
  readonly state: LifecycleState;
  readonly ready: boolean;
  readonly diagnostics: readonly LifecycleFailureEntry[];
}

export interface RuntimeLifecycleHost {
  readonly state: LifecycleState;
  start(): Promise<LifecycleResult>;
  stop(): Promise<LifecycleResult>;
  inspect(): LifecycleInspection;
}

export interface RuntimeHostSpec {
  readonly register: (registry: ExtensiaCompositionRegistry) => undefined;
}

export type RuntimeHostCompositionResult =
  | {
      readonly ok: true;
      readonly host: RuntimeLifecycleHost;
    }
  | {
      readonly ok: false;
      readonly failure: SafeCompositionFailure;
    };

export const LIFECYCLE_CONTRIBUTIONS: ContributionToken<LifecycleContribution> =
  synchronousContributionToken<LifecycleContribution>(
    lifecycleTokens,
    "contributions",
  );

interface CleanupLedgerEntry {
  readonly contribution: LifecycleContribution;
  published: boolean;
  unpublishAttempted: boolean;
  stopAttempted: boolean;
}

export function lifecycleContribution(
  contribution: LifecycleContribution,
): LifecycleContribution {
  return Object.freeze({
    id: contribution.id,
    order: contribution.order,
    start: contribution.start,
    ...(contribution.publishReady === undefined
      ? {}
      : { publishReady: contribution.publishReady }),
    ...(contribution.unpublishReady === undefined
      ? {}
      : { unpublishReady: contribution.unpublishReady }),
    stop: contribution.stop,
  });
}

function isSafeContributionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_LIFECYCLE_ID_LENGTH &&
    LIFECYCLE_ID_PATTERN.test(value)
  );
}

function failureEntry(
  code: LifecycleFailureCode,
  stage: LifecycleFailureStage,
  contributionId?: string,
): LifecycleFailureEntry {
  return Object.freeze({
    code,
    stage,
    ...(contributionId === undefined ? {} : { contributionId }),
  });
}

function successful(state: LifecycleState): LifecycleSuccess {
  return Object.freeze({ ok: true, state });
}

function failed(
  state: LifecycleState,
  failures: readonly LifecycleFailureEntry[],
): LifecycleFailure {
  return Object.freeze({
    ok: false,
    state,
    failures: Object.freeze([...failures]),
  });
}

function validateContributions(
  contributions: readonly LifecycleContribution[],
): readonly LifecycleFailureEntry[] {
  const failures: LifecycleFailureEntry[] = [];
  const seenIds = new Set<string>();

  for (const contribution of contributions) {
    const safeId = isSafeContributionId(contribution.id);
    if (!safeId) {
      failures.push(failureEntry("LIFECYCLE_VALIDATION_FAILED", "validation"));
    }

    if (!Number.isSafeInteger(contribution.order)) {
      failures.push(
        failureEntry(
          "LIFECYCLE_VALIDATION_FAILED",
          "validation",
          safeId ? contribution.id : undefined,
        ),
      );
    }

    if (
      (contribution.publishReady === undefined) !==
      (contribution.unpublishReady === undefined)
    ) {
      failures.push(
        failureEntry(
          "LIFECYCLE_VALIDATION_FAILED",
          "validation",
          safeId ? contribution.id : undefined,
        ),
      );
    }

    if (safeId) {
      if (seenIds.has(contribution.id)) {
        failures.push(
          failureEntry(
            "LIFECYCLE_VALIDATION_FAILED",
            "validation",
            contribution.id,
          ),
        );
      } else {
        seenIds.add(contribution.id);
      }
    }
  }

  return Object.freeze(failures);
}

function orderContributions(
  contributions: readonly LifecycleContribution[],
): readonly LifecycleContribution[] {
  return Object.freeze(
    [...contributions].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order < right.order ? -1 : 1;
      }
      if (left.id === right.id) return 0;
      return left.id < right.id ? -1 : 1;
    }),
  );
}

export function createRuntimeLifecycleHost(
  composition: ExtensiaComposition<
    Readonly<{
      lifecycle: ReturnType<typeof multiCapability<LifecycleContribution>>;
    }>
  >,
): RuntimeLifecycleHost {
  const contributions = Object.freeze(
    composition.capabilities.lifecycle.map(lifecycleContribution),
  );
  const ledger: CleanupLedgerEntry[] = [];
  const diagnosticHistory: LifecycleFailureEntry[] = [];
  let state: LifecycleState = "created";
  let disposeAttempted = false;

  function record(
    failures: readonly LifecycleFailureEntry[],
  ): readonly LifecycleFailureEntry[] {
    diagnosticHistory.push(...failures);
    return failures;
  }

  function transitionFailure(code: LifecycleFailureCode): LifecycleFailure {
    const failures = record([failureEntry(code, "transition")]);
    return failed(state, failures);
  }

  async function disposeRuntime(): Promise<readonly LifecycleFailureEntry[]> {
    if (disposeAttempted) return Object.freeze([]);
    disposeAttempted = true;

    try {
      await composition.dispose();
      return Object.freeze([]);
    } catch {
      return Object.freeze([failureEntry("RUNTIME_DISPOSE_FAILED", "dispose")]);
    }
  }

  async function cleanupLedger(): Promise<readonly LifecycleFailureEntry[]> {
    const failures: LifecycleFailureEntry[] = [];

    for (let index = ledger.length - 1; index >= 0; index -= 1) {
      const entry = ledger[index];
      if (entry === undefined || entry.stopAttempted) continue;

      entry.stopAttempted = true;
      try {
        await entry.contribution.stop();
      } catch {
        failures.push(
          failureEntry("LIFECYCLE_STOP_FAILED", "stop", entry.contribution.id),
        );
      }
    }

    return Object.freeze(failures);
  }

  function unpublishLedger(): readonly LifecycleFailureEntry[] {
    const failures: LifecycleFailureEntry[] = [];

    for (let index = ledger.length - 1; index >= 0; index -= 1) {
      const entry = ledger[index];
      if (entry === undefined || !entry.published || entry.unpublishAttempted) {
        continue;
      }

      entry.unpublishAttempted = true;
      try {
        entry.contribution.unpublishReady?.();
      } catch {
        failures.push(
          failureEntry(
            "LIFECYCLE_PUBLICATION_FAILED",
            "publication",
            entry.contribution.id,
          ),
        );
      }
    }

    return Object.freeze(failures);
  }

  async function start(): Promise<LifecycleResult> {
    if (state === "started") return successful(state);
    if (state === "starting" || state === "stopping") {
      return transitionFailure("LIFECYCLE_BUSY");
    }
    if (state === "stopped" || state === "failed") {
      return transitionFailure("LIFECYCLE_INVALID_STATE");
    }

    state = "starting";
    const validationFailures = validateContributions(contributions);
    if (validationFailures.length > 0) {
      const failures = [...validationFailures, ...(await disposeRuntime())];
      state = "failed";
      return failed(state, record(failures));
    }

    for (const contribution of orderContributions(contributions)) {
      try {
        await contribution.start();
        ledger.push({
          contribution,
          published: false,
          unpublishAttempted: false,
          stopAttempted: false,
        });
      } catch {
        const failures = [
          failureEntry("LIFECYCLE_START_FAILED", "start", contribution.id),
          ...(await cleanupLedger()),
          ...(await disposeRuntime()),
        ];
        state = "failed";
        return failed(state, record(failures));
      }
    }

    for (const entry of ledger) {
      if (entry.contribution.publishReady === undefined) continue;

      entry.published = true;
      try {
        entry.contribution.publishReady();
      } catch {
        const failures = [
          failureEntry(
            "LIFECYCLE_PUBLICATION_FAILED",
            "publication",
            entry.contribution.id,
          ),
          ...unpublishLedger(),
          ...(await cleanupLedger()),
          ...(await disposeRuntime()),
        ];
        state = "failed";
        return failed(state, record(failures));
      }
    }

    state = "started";
    return successful(state);
  }

  async function stop(): Promise<LifecycleResult> {
    if (state === "stopped") return successful(state);
    if (state === "starting" || state === "stopping") {
      return transitionFailure("LIFECYCLE_BUSY");
    }
    if (state === "failed") {
      state = "stopped";
      return successful(state);
    }

    state = "stopping";
    const failures = [
      ...unpublishLedger(),
      ...(await cleanupLedger()),
      ...(await disposeRuntime()),
    ];
    state = "stopped";

    return failures.length === 0
      ? successful(state)
      : failed(state, record(failures));
  }

  return Object.freeze({
    get state(): LifecycleState {
      return state;
    },
    start,
    stop,
    inspect(): LifecycleInspection {
      return Object.freeze({
        state,
        ready: state === "started",
        diagnostics: Object.freeze([...diagnosticHistory]),
      });
    },
  });
}

export async function composeRuntimeHost(
  spec: RuntimeHostSpec,
): Promise<RuntimeHostCompositionResult> {
  const result = await composeExtensia({
    register: spec.register,
    exports: {
      lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
    },
  });

  return result.ok
    ? Object.freeze({
        ok: true,
        host: createRuntimeLifecycleHost(result.composition),
      })
    : Object.freeze({ ok: false, failure: result.failure });
}
