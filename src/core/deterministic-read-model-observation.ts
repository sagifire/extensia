import type { AssetPayloadState } from "../domain/asset-metadata.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import {
  createCoreMetadataObservationPort,
  type CommittedChangeObservation,
  type CoreCommittedChangeObservationPort,
  type CoreMetadataObservationPort,
} from "./read-model-observation.js";
import { markIdentityKey } from "./read-model-generation.js";

export interface DeterministicObservationBarrier {
  readonly entered: Promise<void>;
  release(): void;
}

export function createDeterministicObservationBarrier(): DeterministicObservationBarrier {
  let release!: () => void;
  let enter!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  observationBarrierWaiters.set(entered, Object.freeze({ enter, wait }));
  return Object.freeze({ entered, release });
}

const observationBarrierWaiters = new WeakMap<
  Promise<void>,
  { readonly enter: () => void; readonly wait: Promise<void> }
>();

export interface DeterministicMetadataObservationAdapter {
  readonly port: CoreMetadataObservationPort;
  readonly reads: number;
  failNext(error?: Error): void;
  blockNext(barrier: DeterministicObservationBarrier): void;
  replace(
    resources: readonly ResourceSnapshot[],
    payloadStates?: readonly AssetPayloadState[],
  ): void;
}

export function createDeterministicMetadataObservationAdapter(
  initialResources: readonly ResourceSnapshot[],
  initialPayloadStates: readonly AssetPayloadState[] = [],
): DeterministicMetadataObservationAdapter {
  let resources = initialResources.map(buildResourceSnapshot);
  let payloadStates = initialPayloadStates.map((state) => ({
    active_upload:
      state.active_upload === null ? null : { ...state.active_upload },
    asset_id: state.asset_id,
    committed: state.committed,
  }));
  let reads = 0;
  let failure: Error | null = null;
  let barrier: DeterministicObservationBarrier | null = null;
  async function capture() {
    reads += 1;
    const nextFailure = failure;
    failure = null;
    if (nextFailure !== null) throw nextFailure;
    const nextBarrier = barrier;
    barrier = null;
    if (nextBarrier !== null) {
      const waiter = observationBarrierWaiters.get(nextBarrier.entered);
      if (waiter === undefined) throw new Error("Unknown observation barrier");
      waiter.enter();
      await waiter.wait;
    }
    return Object.freeze({
      asset_payload_states: Object.freeze(
        payloadStates.map((item) => ({
          active_upload:
            item.active_upload === null ? null : { ...item.active_upload },
          asset_id: item.asset_id,
          committed: item.committed,
        })),
      ),
      resources: Object.freeze(resources.map(buildResourceSnapshot)),
    });
  }
  const port = createCoreMetadataObservationPort({
    readComplete: capture,
    async readMarkResources(type, name) {
      const captured = await capture();
      const key = markIdentityKey({ name, type });
      return Object.freeze(
        captured.resources.filter(
          (resource) =>
            !resource.data.is_deleted &&
            resource.marks.some((mark) => markIdentityKey(mark) === key),
        ),
      );
    },
  });
  return Object.freeze({
    port,
    get reads(): number {
      return reads;
    },
    failNext(error = new Error("Injected metadata observation failure")): void {
      failure = error;
    },
    blockNext(next: DeterministicObservationBarrier): void {
      barrier = next;
    },
    replace(
      nextResources: readonly ResourceSnapshot[],
      nextPayloadStates: readonly AssetPayloadState[] = [],
    ): void {
      resources = nextResources.map(buildResourceSnapshot);
      payloadStates = nextPayloadStates.map((state) => ({
        active_upload:
          state.active_upload === null ? null : { ...state.active_upload },
        asset_id: state.asset_id,
        committed: state.committed,
      }));
    },
  });
}

export interface DeterministicCommittedChangeObservationAdapter {
  readonly port: CoreCommittedChangeObservationPort;
  readonly reads: number;
  failNext(error?: Error): void;
  blockNext(barrier: DeterministicObservationBarrier): void;
  replace(observation: CommittedChangeObservation): void;
}

function detachedCommittedObservation(
  observation: CommittedChangeObservation,
): CommittedChangeObservation {
  const detached = structuredClone(observation) as CommittedChangeObservation;
  const freeze = (value: unknown): void => {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
      return;
    }
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(detached);
  return detached;
}

export function createDeterministicCommittedChangeObservationAdapter(
  initial: CommittedChangeObservation,
): DeterministicCommittedChangeObservationAdapter {
  let observation = detachedCommittedObservation(initial);
  let reads = 0;
  let failure: Error | null = null;
  let barrier: DeterministicObservationBarrier | null = null;
  const port: CoreCommittedChangeObservationPort = Object.freeze({
    async observeCommittedChanges() {
      reads += 1;
      const nextFailure = failure;
      failure = null;
      if (nextFailure !== null) throw nextFailure;
      const nextBarrier = barrier;
      barrier = null;
      if (nextBarrier !== null) {
        const waiter = observationBarrierWaiters.get(nextBarrier.entered);
        if (waiter === undefined)
          throw new Error("Unknown observation barrier");
        waiter.enter();
        await waiter.wait;
      }
      return detachedCommittedObservation(observation);
    },
  });
  return Object.freeze({
    port,
    get reads(): number {
      return reads;
    },
    failNext(
      error = new Error("Injected committed-change observation failure"),
    ): void {
      failure = error;
    },
    blockNext(next: DeterministicObservationBarrier): void {
      barrier = next;
    },
    replace(next: CommittedChangeObservation): void {
      observation = detachedCommittedObservation(next);
    },
  });
}
