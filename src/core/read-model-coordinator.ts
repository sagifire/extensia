import type { ResourceSnapshot } from "../domain/snapshots.js";
import {
  journalSequence,
  parseJournalSequence,
} from "../storage/resource-journal-integrity.js";
import type {
  CommittedOperationEntry,
  JournalSequence,
} from "../storage/resource-write-protocol.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import {
  applyCompleteReadModelDelta,
  type ReadModelGeneration,
} from "./read-model-generation.js";

export type ReadModelCoordinatorState =
  | {
      readonly kind: "synchronized";
      readonly revision: number;
      readonly generation: ReadModelGeneration;
      readonly cursor: JournalSequence | null;
      readonly cursor_behind: boolean;
    }
  | {
      readonly kind: "static-unsupported";
      readonly revision: number;
      readonly generation: ReadModelGeneration;
    };

export interface ReadModelCoordinatorCandidate {
  readonly base_revision: number;
  readonly base_cursor: JournalSequence | null | undefined;
  readonly generation: ReadModelGeneration;
  readonly cursor: JournalSequence | null | undefined;
}

export interface PreparedLocalReadModelChange {
  readonly changed_resources: readonly ResourceSnapshot[];
  publish(entry: CommittedOperationEntry): ReadModelCoordinatorState;
}

export interface ReadModelPublicationCoordinator {
  readonly ready: boolean;
  initializeStatic(generation: ReadModelGeneration): void;
  initializeSynchronized(
    generation: ReadModelGeneration,
    cursor: JournalSequence | null,
  ): void;
  capture(): ReadModelCoordinatorState;
  prepareLocal(
    resources: readonly ResourceSnapshot[],
  ): PreparedLocalReadModelChange;
  candidate(
    generation: ReadModelGeneration,
    cursor?: JournalSequence | null,
  ): ReadModelCoordinatorCandidate;
  publishCandidate(candidate: ReadModelCoordinatorCandidate): boolean;
  setCursorBehindListener(listener: (() => void) | null): void;
  isCursorBehind(): boolean;
  clear(): void;
}

function exactNext(
  cursor: JournalSequence | null,
  entry: JournalSequence,
): boolean {
  const expected = cursor === null ? 1n : parseJournalSequence(cursor) + 1n;
  return parseJournalSequence(entry) === expected;
}

function localCursorAfter(
  cursor: JournalSequence | null,
  entry: JournalSequence,
): JournalSequence | null {
  const entryValue = parseJournalSequence(entry);
  if (cursor !== null && entryValue <= parseJournalSequence(cursor)) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_INDEX_INTEGRITY",
      "Local committed receipt does not advance journal authority",
    );
  }
  return exactNext(cursor, entry) ? entry : cursor;
}

function assertCandidateCursor(
  current: JournalSequence | null,
  candidate: JournalSequence | null,
): void {
  const currentValue = current === null ? null : parseJournalSequence(current);
  const candidateValue =
    candidate === null ? null : parseJournalSequence(candidate);
  if (
    currentValue !== null &&
    (candidateValue === null || candidateValue < currentValue)
  ) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_INDEX_INTEGRITY",
      "Read-model candidate cursor regresses synchronized authority",
    );
  }
}

export function createReadModelPublicationCoordinator(): ReadModelPublicationCoordinator {
  let state: ReadModelCoordinatorState | null = null;
  let cursorBehindListener: (() => void) | null = null;

  function assertReady(): ReadModelCoordinatorState {
    if (state === null) throw new Error("Read-model coordinator is not ready");
    return state;
  }

  function initialize(next: ReadModelCoordinatorState): void {
    if (state !== null) {
      throw new Error("Read-model coordinator is already initialized");
    }
    state = Object.freeze(next);
  }

  return Object.freeze({
    get ready(): boolean {
      return state !== null;
    },
    initializeStatic(generation: ReadModelGeneration): void {
      initialize({ generation, kind: "static-unsupported", revision: 0 });
    },
    initializeSynchronized(
      generation: ReadModelGeneration,
      cursor: JournalSequence | null,
    ): void {
      if (cursor !== null) journalSequence(parseJournalSequence(cursor));
      initialize({
        cursor,
        cursor_behind: false,
        generation,
        kind: "synchronized",
        revision: 0,
      });
    },
    capture(): ReadModelCoordinatorState {
      return assertReady();
    },
    prepareLocal(
      resources: readonly ResourceSnapshot[],
    ): PreparedLocalReadModelChange {
      const captured = assertReady();
      const changed = Object.freeze([...resources]);
      const preparedGeneration = applyCompleteReadModelDelta(
        captured.generation,
        changed,
        { localPublication: true, storageValidatedLocalDelta: true },
      );
      let published = false;
      return Object.freeze({
        changed_resources: changed,
        publish(entry: CommittedOperationEntry): ReadModelCoordinatorState {
          if (published) {
            throw new Error("Prepared read-model change was already published");
          }
          published = true;
          const latest = assertReady();
          if (
            latest.revision !== captured.revision ||
            latest.kind !== captured.kind ||
            (latest.kind === "synchronized" &&
              captured.kind === "synchronized" &&
              latest.cursor !== captured.cursor)
          ) {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Prepared local read-model publication is stale",
            );
          }
          const nextCursor =
            latest.kind === "synchronized"
              ? localCursorAfter(latest.cursor, entry.sequence)
              : undefined;
          state = Object.freeze(
            latest.kind === "synchronized"
              ? {
                  cursor: nextCursor!,
                  cursor_behind:
                    latest.cursor_behind || nextCursor === latest.cursor,
                  generation: preparedGeneration,
                  kind: "synchronized" as const,
                  revision: latest.revision + 1,
                }
              : {
                  generation: preparedGeneration,
                  kind: "static-unsupported" as const,
                  revision: latest.revision + 1,
                },
          );
          if (state.kind === "synchronized" && state.cursor_behind) {
            try {
              cursorBehindListener?.();
            } catch {
              // Publication is committed/no-fail; polling is only a trigger.
            }
          }
          return state;
        },
      });
    },
    candidate(
      generation: ReadModelGeneration,
      cursor?: JournalSequence | null,
    ): ReadModelCoordinatorCandidate {
      const current = assertReady();
      if (current.kind === "synchronized" && cursor === undefined) {
        throw new TypeError("Synchronized candidate requires a cursor");
      }
      if (current.kind === "static-unsupported" && cursor !== undefined) {
        throw new TypeError("Static candidate cannot carry a cursor");
      }
      if (current.kind === "synchronized") {
        assertCandidateCursor(current.cursor, cursor!);
      }
      return Object.freeze({
        base_cursor:
          current.kind === "synchronized" ? current.cursor : undefined,
        base_revision: current.revision,
        cursor,
        generation,
      });
    },
    publishCandidate(candidate: ReadModelCoordinatorCandidate): boolean {
      const current = assertReady();
      if (
        current.revision !== candidate.base_revision ||
        (current.kind === "synchronized"
          ? candidate.base_cursor !== current.cursor ||
            candidate.cursor === undefined
          : candidate.base_cursor !== undefined ||
            candidate.cursor !== undefined)
      ) {
        return false;
      }
      if (current.kind === "synchronized") {
        assertCandidateCursor(current.cursor, candidate.cursor!);
      }
      state = Object.freeze(
        current.kind === "synchronized"
          ? {
              cursor: candidate.cursor!,
              cursor_behind:
                current.cursor_behind && candidate.cursor === current.cursor,
              generation: candidate.generation,
              kind: "synchronized" as const,
              revision: current.revision + 1,
            }
          : {
              generation: candidate.generation,
              kind: "static-unsupported" as const,
              revision: current.revision + 1,
            },
      );
      return true;
    },
    isCursorBehind(): boolean {
      return state?.kind === "synchronized" && state.cursor_behind;
    },
    setCursorBehindListener(listener: (() => void) | null): void {
      cursorBehindListener = listener;
    },
    clear(): void {
      state = null;
      cursorBehindListener = null;
    },
  });
}
