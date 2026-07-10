import { expectTypeOf, it } from "vitest";

import type { JSONArray, JSONObject, JSONValue } from "./json.js";
import type { IDString, Timestamp } from "./scalars.js";
import type {
  AssetSnapshot,
  ResourceKVSnapshot,
  ResourceSnapshot,
} from "./snapshots.js";

it("exposes deeply readonly branded data contracts at compile time", () => {
  expectTypeOf<ResourceSnapshot["assets"]>().toEqualTypeOf<
    readonly AssetSnapshot[]
  >();
  expectTypeOf<ResourceSnapshot["kv"]>().toEqualTypeOf<ResourceKVSnapshot>();
  expectTypeOf<AssetSnapshot["data"]>().toEqualTypeOf<JSONObject | null>();
  expectTypeOf<JSONArray>().toEqualTypeOf<readonly JSONValue[]>();

  const verifyRejectedMutations = (): void => {
    const resource = {} as ResourceSnapshot;
    const asset = {} as AssetSnapshot;

    // @ts-expect-error Raw strings do not satisfy the branded ID boundary.
    const rawID: IDString = "550e8400-e29b-41d4-a716-446655440000";
    // @ts-expect-error Raw numbers do not satisfy the branded Timestamp boundary.
    const rawTimestamp: Timestamp = 0;
    // @ts-expect-error Resource properties are readonly.
    resource.data.title = "changed";
    // @ts-expect-error Aggregate arrays are readonly.
    resource.assets.push(asset);
    // @ts-expect-error Nested KV records are readonly.
    resource.kv["app"]!["key"] = "changed";
    // @ts-expect-error Asset JSON data is deeply readonly.
    asset.data!["nested"] = null;
    // @ts-expect-error Recursive JSON arrays are readonly.
    (asset.data!["items"] as JSONArray).push(null);
    // @ts-expect-error Readonly arrays cannot be assigned to mutable arrays.
    const mutableAssets: AssetSnapshot[] = resource.assets;

    void rawID;
    void rawTimestamp;
    void mutableAssets;
  };

  void verifyRejectedMutations;
});
