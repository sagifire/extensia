import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type { FullResourceDriverAdapter } from "./full-resource-driver-adapter.js";
import {
  cloneCommittedOperationEntry,
  validateContiguousJournal,
} from "./resource-journal-integrity.js";
import type {
  CommittedOperationEntry,
  JournalSequence,
  ResourceRecoveryReport,
} from "./resource-write-protocol.js";

export interface RecoveryCleanResourceState {
  readonly recovery: ResourceRecoveryReport;
  readonly resources: readonly ResourceSnapshot[];
  readonly journal: readonly CommittedOperationEntry[];
  readonly journal_head: JournalSequence | null;
}

export async function scanRecoveryCleanResourceState(
  driver: FullResourceDriverAdapter,
  signal?: AbortSignal,
): Promise<RecoveryCleanResourceState> {
  const session = await driver.acquireStorageSession(signal);
  let result: RecoveryCleanResourceState;
  try {
    const resources: ResourceSnapshot[] = [];
    for await (const resource of session.listResources()) {
      resources.push(buildResourceSnapshot(resource));
    }

    const journal: CommittedOperationEntry[] = [];
    for await (const entry of session.readCommittedOperationsAfter(null)) {
      journal.push(cloneCommittedOperationEntry(entry));
    }
    validateContiguousJournal(journal);

    result = {
      journal,
      journal_head: journal.at(-1)?.sequence ?? null,
      recovery: { ...session.recovery },
      resources,
    };
  } catch (error) {
    try {
      await session.release();
    } catch {
      // The scan/integrity failure remains the primary startup cause.
    }
    throw error;
  }
  await session.release();
  return result;
}
