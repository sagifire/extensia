"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APPLY_PATCH_TABLE: () => APPLY_PATCH_TABLE,
  Config: () => Config,
  Context: () => Context,
  Extensia: () => Extensia,
  MARK_DATA_TABLE: () => MARK_DATA_TABLE,
  MARK_KV_TABLE: () => MARK_KV_TABLE,
  ON_CORE_INIT_EVENT: () => ON_CORE_INIT_EVENT,
  ON_DB_CLEAN_EVENT: () => ON_DB_CLEAN_EVENT,
  ON_DB_FULL_DROP_EVENT: () => ON_DB_FULL_DROP_EVENT,
  ON_FULL_RESCAN: () => ON_FULL_RESCAN,
  ON_MARK_CREATED_EVENT: () => ON_MARK_CREATED_EVENT,
  ON_MARK_DELETED_EVENT: () => ON_MARK_DELETED_EVENT,
  ON_MARK_UPDATED_EVENT: () => ON_MARK_UPDATED_EVENT,
  ON_PLUGIN_INIT_EVENT: () => ON_PLUGIN_INIT_EVENT,
  ON_REPRESENTATION_CREATED_EVENT: () => ON_REPRESENTATION_CREATED_EVENT,
  ON_REPRESENTATION_DELETED_EVENT: () => ON_REPRESENTATION_DELETED_EVENT,
  ON_REPRESENTATION_UPDATED_EVENT: () => ON_REPRESENTATION_UPDATED_EVENT,
  ON_RESOURCE_CREATED_EVENT: () => ON_RESOURCE_CREATED_EVENT,
  ON_RESOURCE_DELETED_EVENT: () => ON_RESOURCE_DELETED_EVENT,
  ON_RESOURCE_KV_CREATED_EVENT: () => ON_RESOURCE_KV_CREATED_EVENT,
  ON_RESOURCE_KV_DELETED_EVENT: () => ON_RESOURCE_KV_DELETED_EVENT,
  ON_RESOURCE_KV_UPDATED_EVENT: () => ON_RESOURCE_KV_UPDATED_EVENT,
  ON_RESOURCE_UPDATED_EVENT: () => ON_RESOURCE_UPDATED_EVENT,
  ON_STARTED_EVENT: () => ON_STARTED_EVENT,
  Plugin: () => Plugin,
  REPRESENTATION_DATA_TABLE: () => REPRESENTATION_DATA_TABLE,
  REPRESENTATION_INFO_TABLE: () => REPRESENTATION_INFO_TABLE,
  REPRESENTATION_SOURCE_TABLE: () => REPRESENTATION_SOURCE_TABLE,
  RESOURCE_DATA_TABLE: () => RESOURCE_DATA_TABLE,
  RESOURCE_HIERARCHY_TABLE: () => RESOURCE_HIERARCHY_TABLE,
  RESOURCE_INFO_TABLE: () => RESOURCE_INFO_TABLE,
  makeIndexFromResourceEntity: () => makeIndexFromResourceEntity
});
module.exports = __toCommonJS(index_exports);

// src/core/contracts.ts
var APPLY_PATCH_TABLE = "applied_patches";
var RESOURCE_DATA_TABLE = "resource_data";
var RESOURCE_INFO_TABLE = "resource_info";
var RESOURCE_HIERARCHY_TABLE = "resource_hierarchy";
var REPRESENTATION_DATA_TABLE = "representation_data";
var REPRESENTATION_SOURCE_TABLE = "representation_source";
var REPRESENTATION_INFO_TABLE = "representation_info";
var MARK_DATA_TABLE = "mark_data";
var MARK_KV_TABLE = "mark_kv";
var ON_CORE_INIT_EVENT = "on_core_init";
var ON_PLUGIN_INIT_EVENT = "on_plugin_init";
var ON_STARTED_EVENT = "on_started";
var ON_RESOURCE_CREATED_EVENT = "on_resource_created";
var ON_RESOURCE_UPDATED_EVENT = "on_resource_updated";
var ON_RESOURCE_DELETED_EVENT = "on_resource_deleted";
var ON_REPRESENTATION_CREATED_EVENT = "on_representation_created";
var ON_REPRESENTATION_UPDATED_EVENT = "on_representation_updated";
var ON_REPRESENTATION_DELETED_EVENT = "on_representation_deleted";
var ON_MARK_CREATED_EVENT = "on_mark_created";
var ON_MARK_UPDATED_EVENT = "on_mark_updated";
var ON_MARK_DELETED_EVENT = "on_mark_deleted";
var ON_RESOURCE_KV_CREATED_EVENT = "on_resource_kv_created";
var ON_RESOURCE_KV_UPDATED_EVENT = "on_resource_kv_updated";
var ON_RESOURCE_KV_DELETED_EVENT = "on_resource_kv_deleted";
var ON_DB_FULL_DROP_EVENT = "on_db_full_drop";
var ON_DB_CLEAN_EVENT = "on_db_clean";
var ON_FULL_RESCAN = "on_full_rescan";

// src/core/ErrorCodes.ts
var Codes = {
  THROWN_EXCEPTION: "THROWN_EXCEPTION",
  THROWN_UNKNOWN: "THROWN_UNKNOWN",
  INVALID_ERROR_CODE: "INVALID_ERROR_CODE",
  CONFLICT: "CONFLICT",
  CANNOT_ROLLBACK: "CANNOT_ROLLBACK",
  CANNOT_APPLY: "CANNOT_APPLY",
  BROKEN_INDEX: "BROKEN_INDEX",
  PARENT_NOT_FOUND: "PARENT_NOT_FOUND",
  INVALID_DATA: "INVALID_DATA",
  NOT_FOUND: "NOT_FOUND"
};
var ErrorCodes = Codes;
var ErrorMessages = {
  THROWN_EXCEPTION: "{message}",
  THROWN_UNKNOWN: "Unknown is thrown as error",
  INVALID_ERROR_CODE: "{code}",
  CONFLICT: "{reason}",
  CANNOT_ROLLBACK: "Cannot rollback {target}",
  CANNOT_APPLY: "Cannot apply {target}",
  BROKEN_INDEX: "{reason}, need store reindex!",
  PARENT_NOT_FOUND: "Parent {entity} not found",
  INVALID_DATA: "Invalid {entity}",
  NOT_FOUND: "{entity} not found"
};

// src/core/Context.ts
var Context = class {
  resultValue;
  statusValue = true;
  errorMessage = void 0;
  errorCodeValue = void 0;
  errorInfoData = {};
  scope = {};
  constructor(...args) {
    this.resultValue = args.length ? args[0] : void 0;
  }
  isSuccess() {
    return this.status;
  }
  isFailed() {
    return !this.status;
  }
  set status(newStatus) {
    this.statusValue = newStatus;
  }
  get status() {
    return this.statusValue;
  }
  get result() {
    return this.resultValue;
  }
  set result(newResult) {
    this.resultValue = newResult;
  }
  $cast() {
    return this;
  }
  setupResult(result) {
    const casted = this.$cast();
    casted.result = result;
    return casted;
  }
  get error() {
    return this.errorMessage;
  }
  get errorCode() {
    return this.errorCodeValue;
  }
  get errorInfo() {
    return this.errorInfoData;
  }
  setError(code, placeholders = {}, info = {}) {
    this.status = false;
    if ("undefined" === typeof ErrorCodes[code]) {
      this.errorCodeValue = ErrorCodes.INVALID_ERROR_CODE;
      this.errorMessage = this.errorCodeValue + ": " + ErrorMessages[ErrorCodes.INVALID_ERROR_CODE].replace("{code}", code);
      this.errorInfoData = {
        invalidError: { code, placeholders, info }
      };
    } else {
      this.errorCodeValue = code;
      this.errorMessage = code + ": " + ErrorMessages[code];
      this.errorInfoData = info;
      for (const placeholderName in placeholders) {
        this.errorMessage = this.errorMessage?.replace(
          "{" + placeholderName + "}",
          "" + placeholders[placeholderName]
        );
      }
    }
  }
  apply(ctx) {
    this.status = this.status && ctx.status;
    this.errorMessage = ctx.error;
    this.errorCodeValue = ctx.errorCode;
    this.errorInfoData = ctx.errorInfo;
    return this;
  }
  applyResult(ctx) {
    return this.apply(ctx).setupResult(ctx.result);
  }
  applyException(err) {
    if (err instanceof Error) {
      this.setError(ErrorCodes.THROWN_EXCEPTION, {
        message: err.message
      }, {
        stack: err.stack
      });
    } else {
      this.setError(ErrorCodes.THROWN_UNKNOWN, {}, { unknown: err });
    }
    return this;
  }
};

// src/core/utils.ts
function nowInS() {
  return Math.trunc(Date.now() / 1e3);
}
function makeIndexFromResourceEntity(resourceEntity) {
  let representationsIndex = {};
  let marksIndex = {};
  let kvIndex = {};
  for (const representation of resourceEntity.representations || []) {
    representationsIndex[representation.data.id] = true;
  }
  for (const mark of resourceEntity.marks || []) {
    marksIndex[mark.name + "|" + mark.type] = true;
  }
  const kvComponents = resourceEntity.kv || {};
  for (const kvComponent in kvComponents) {
    for (const kvAttribute in kvComponents[kvComponent]) {
      kvIndex[kvComponent + "|" + kvAttribute] = true;
    }
  }
  return {
    id: resourceEntity.data.id,
    hierarchy: resourceEntity.hierarchy,
    representations: representationsIndex,
    marks: marksIndex,
    kv: kvIndex
  };
}

// src/core/Core.ts
var import_node_events = require("events");
var import_knex = __toESM(require("knex"), 1);

// src/core/DBSchemeManager.ts
var DBSchemeManager = class {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }
  appliedPatches = [];
  genericPatches = {
    gen_resource_data: async (db) => {
      await db.schema.createTable(RESOURCE_DATA_TABLE, (table) => {
        table.string("id", 32).primary();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.boolean("locked").defaultTo(false);
        table.boolean("hidden").defaultTo(false);
        table.boolean("is_deleted").defaultTo(false);
      });
      return true;
    },
    gen_resource_info: async (db) => {
      await db.schema.createTable(RESOURCE_INFO_TABLE, (table) => {
        table.string("id", 32).primary();
        table.string("title");
        table.text("description").nullable();
        table.foreign("id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_resource_hierarchy: async (db) => {
      await db.schema.createTable("resource_hierarchy", (table) => {
        table.string("id", 32).primary();
        table.string("parent_id", 32);
        table.integer("order_index").defaultTo(0);
        table.foreign("id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
        table.foreign("parent_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_representation_data: async (db) => {
      await db.schema.createTable(REPRESENTATION_DATA_TABLE, (table) => {
        table.string("id", 32).primary();
        table.string("resource_id", 32);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.string("type");
        table.string("role");
        table.string("mime").nullable();
        table.string("extension").nullable();
        table.boolean("is_external").defaultTo(false);
        table.boolean("is_primary").defaultTo(false);
        table.boolean("uploading").defaultTo(false);
        table.foreign("resource_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
        table.index(["resource_id"]);
      });
      return true;
    },
    gen_representation_source: async (db) => {
      await db.schema.createTable(REPRESENTATION_SOURCE_TABLE, (table) => {
        table.string("id", 32).primary();
        table.string("url").nullable();
        table.string("derived_from", 32).nullable();
        table.foreign("id").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
        table.foreign("derived_from").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_representation_info: async (db) => {
      await db.schema.createTable(REPRESENTATION_INFO_TABLE, (table) => {
        table.string("id", 32).primary();
        table.json("data").defaultTo("{}");
        table.foreign("id").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_mark_data: async (db) => {
      await db.schema.createTable(MARK_DATA_TABLE, (table) => {
        table.string("resource_id", 32);
        table.string("name", 120);
        table.string("type", 120);
        table.integer("value").nullable();
        table.primary(["resource_id", "name", "type"]);
        table.index(["resource_id"]);
        table.index(["name"]);
        table.index(["type"]);
        table.foreign("resource_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_mark_kv: async (db) => {
      await db.schema.createTable(MARK_KV_TABLE, (table) => {
        table.string("resource_id", 32);
        table.string("component", 120);
        table.string("attribute", 120);
        table.string("value").nullable();
        table.primary(["resource_id", "component", "attribute"]);
        table.index(["resource_id"]);
        table.foreign("resource_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    }
  };
  async init(applyGeneric = true) {
    let ctx = new Context();
    const patchListCtx = await this.getOrInitAppliedPatchesList();
    ctx.apply(patchListCtx);
    if (ctx.isSuccess()) {
      this.appliedPatches = patchListCtx.result;
      if (applyGeneric) {
        for (const genericPatchId in this.genericPatches) {
          if (!this.appliedPatches.includes(genericPatchId)) {
            const result = await this.applySchemePatch(genericPatchId, this.genericPatches[genericPatchId]);
            if (!result) {
              ctx.setError(ErrorCodes.CANNOT_APPLY, { target: "generic patch" }, { id: genericPatchId });
              break;
            }
          }
        }
      }
    }
    return ctx;
  }
  async applySchemePatch(id, patch) {
    let ctx = new Context();
    try {
      if (id in this.appliedPatches) {
        ctx.setError(ErrorCodes.CONFLICT, { reason: "Patch already applied" }, { id });
      } else {
        const result = await patch(this.db);
        if (result) {
          this.appliedPatches.push(id);
          await this.db(APPLY_PATCH_TABLE).insert({ id });
          this.logger.info(`Applied DB scheme patch ${id}`);
        }
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async rollbackSchemePatch(id, patch) {
    let ctx = new Context();
    try {
      let result = false;
      if (id in this.genericPatches) {
        ctx.setError(ErrorCodes.CANNOT_ROLLBACK, { target: "generic patch" }, { id });
      } else {
        if (id in this.appliedPatches) {
          result = await patch(this.db);
          if (result) {
            this.appliedPatches = this.appliedPatches.filter((patchId) => patchId !== id);
            await this.db(APPLY_PATCH_TABLE).where("id", id).delete();
            this.logger.info(`Rolled back DB scheme patch ${id}`);
          }
        } else {
          ctx.setError(ErrorCodes.CANNOT_ROLLBACK, { target: "unknown patch" }, { id });
        }
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async getOrInitAppliedPatchesList() {
    let ctx = new Context([]);
    try {
      const hasTable = await this.db.schema.hasTable(APPLY_PATCH_TABLE);
      if (hasTable) {
        ctx.result = await this.db(APPLY_PATCH_TABLE).select("id").pluck("id");
      } else {
        await this.db.schema.createTable(APPLY_PATCH_TABLE, (table) => {
          table.string("id").primary();
          table.timestamp("on_create").defaultTo(this.db.fn.now());
        });
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async fullDrop() {
    let ctx = new Context();
    try {
      for (const patchId in this.appliedPatches.toReversed()) {
        if (patchId in this.genericPatches) {
          continue;
        }
        await this.rollbackSchemePatch(patchId, this.genericPatches[patchId]);
      }
      await this.db.schema.dropTableIfExists(MARK_DATA_TABLE);
      await this.db.schema.dropTableIfExists(MARK_KV_TABLE);
      await this.db.schema.dropTableIfExists(REPRESENTATION_SOURCE_TABLE);
      await this.db.schema.dropTableIfExists(REPRESENTATION_INFO_TABLE);
      await this.db.schema.dropTableIfExists(REPRESENTATION_DATA_TABLE);
      await this.db.schema.dropTableIfExists(RESOURCE_INFO_TABLE);
      await this.db.schema.dropTableIfExists(RESOURCE_DATA_TABLE);
      await this.db(APPLY_PATCH_TABLE).delete();
      this.logger.info("DB scheme dropped");
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
};

// src/core/FsManager.ts
var import_node_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);

// src/core/AsyncLockQueue.ts
var AsyncLockQueue = class {
  queues = /* @__PURE__ */ new Map();
  holders = /* @__PURE__ */ new Map();
  //debugging metric "how many holders now"
  /**
   * Grab the lock with the key.
   * Returns the release() function, which MUST be called in finally.
   */
  async lock(key, opts = {}) {
    const q = this.ensureQueue(key);
    let enter;
    const entered = new Promise((resolve) => {
      enter = resolve;
    });
    q.push(enter);
    const isHead = q.length === 1;
    if (!isHead) {
      await this.waitTurn(entered, opts);
    }
    this.holders.set(key, (this.holders.get(key) ?? 0) + 1);
    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      const qRef = this.queues.get(key);
      if (!qRef || qRef.length === 0) {
        this.holders.set(key, Math.max((this.holders.get(key) ?? 1) - 1, 0));
        return;
      }
      qRef.shift();
      this.holders.set(key, Math.max((this.holders.get(key) ?? 1) - 1, 0));
      if (qRef.length === 0) {
        this.queues.delete(key);
        this.holders.delete(key);
        return;
      }
      const next = qRef[0];
      next();
    };
    return { release };
  }
  /**
   * Perform an asynchronous action under lock.
   */
  async withLock(key, fn, opts = {}) {
    const { release } = await this.lock(key, opts);
    try {
      return await fn();
    } finally {
      release();
    }
  }
  /**
   * Capture multiple keys at once, without deadlocks:
   * keys are ordered globally (String(key)).
   */
  async lockMany(keys, opts = {}) {
    const ordered = [...keys].sort((a, b) => {
      const sa = String(a);
      const sb = String(b);
      if (sa < sb) {
        return -1;
      }
      if (sa > sb) {
        return 1;
      }
      return 0;
    });
    const releasers = [];
    try {
      for (const k of ordered) {
        const { release } = await this.lock(k, opts);
        releasers.push(release);
      }
      return {
        releaseAll: () => {
          for (let i = releasers.length - 1; i >= 0; i--) {
            releasers[i]();
          }
        }
      };
    } catch (e) {
      for (let i = releasers.length - 1; i >= 0; i--) {
        releasers[i]();
      }
      throw e;
    }
  }
  /**
   * A convenient option for multiple keys.
   */
  async withLocks(keys, fn, opts = {}) {
    const { releaseAll } = await this.lockMany(keys, opts);
    try {
      return await fn();
    } finally {
      releaseAll();
    }
  }
  ensureQueue(key) {
    let q = this.queues.get(key);
    if (!q) {
      q = [];
      this.queues.set(key, q);
    }
    return q;
  }
  async waitTurn(entered, opts) {
    const { timeoutMs, signal } = opts;
    if (!timeoutMs && !signal) {
      await entered;
      return;
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const onResolve = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve();
      };
      const onAbort = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error("Lock acquisition aborted"));
      };
      const onTimeout = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error("Lock acquisition timed out"));
      };
      let tm = null;
      const cleanup = () => {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
        if (tm) {
          clearTimeout(tm);
        }
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort);
      }
      if (timeoutMs && timeoutMs > 0) {
        tm = setTimeout(onTimeout, timeoutMs);
      }
      entered.then(onResolve, reject);
    });
  }
};

// src/core/FsManager.ts
var import_file_type = require("file-type");
var HIERARCHY_LOCK_NAME = "hierarchy";
var FsManager = class {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.absoluteRoot = import_node_path.default.resolve(config.root);
    this.lockQueue = new AsyncLockQueue();
  }
  absoluteRoot;
  lockQueue;
  hierarchyIndexTree = { parent: null, children: {}, representations: {} };
  hierarchyIndexMap = /* @__PURE__ */ new Map();
  representationResourceMap = /* @__PURE__ */ new Map();
  async init() {
    if (!await import_promises.default.access(this.absoluteRoot).then(() => true).catch(() => false)) {
      await import_promises.default.mkdir(this.absoluteRoot, { recursive: true });
    }
    return await this.initHierarchyIndex();
  }
  getHierarchyIndexFilePath() {
    return import_node_path.default.join(this.absoluteRoot, "hierarchy.json");
  }
  indexHierarchyNodeRecursive(node) {
    for (const childId of Object.keys(node.children)) {
      const childNode = node.children[childId];
      this.hierarchyIndexMap.set(childId, childNode);
      for (const representationId of Object.keys(childNode.representations)) {
        this.representationResourceMap.set(representationId, childId);
      }
      this.indexHierarchyNodeRecursive(childNode);
    }
  }
  async initHierarchyIndex() {
    let ctx = new Context();
    try {
      this.hierarchyIndexMap.clear();
      this.representationResourceMap.clear();
      const hierarchyIndexFilePath = this.getHierarchyIndexFilePath();
      if (await import_promises.default.access(hierarchyIndexFilePath).then(() => true).catch(() => false)) {
        this.hierarchyIndexTree = JSON.parse(await import_promises.default.readFile(hierarchyIndexFilePath, { encoding: "utf-8" }));
        this.indexHierarchyNodeRecursive(this.hierarchyIndexTree);
      }
    } catch (e) {
      this.hierarchyIndexTree = { parent: null, children: {}, representations: {} };
      ctx.applyException(e);
    }
    return ctx;
  }
  async saveHierarchyIndex(lock = true) {
    let ctx = new Context();
    const hiLock = lock ? await this.lockQueue.lock(HIERARCHY_LOCK_NAME) : void 0;
    try {
      await import_promises.default.writeFile(
        this.getHierarchyIndexFilePath(),
        JSON.stringify(this.hierarchyIndexTree, null, 4) + "\n",
        {
          encoding: "utf-8",
          flag: "w"
        }
      );
    } catch (e) {
      ctx.applyException(e);
    } finally {
      if (hiLock) {
        hiLock.release();
      }
    }
    return ctx;
  }
  getPath(id) {
    const ancestors = [];
    let node = this.hierarchyIndexMap.get(id);
    while (node?.parent) {
      ancestors.unshift(node.parent);
      node = this.hierarchyIndexMap.get(node.parent);
    }
    return ancestors;
  }
  getResourceIdByRepresentationId(representationId) {
    return this.representationResourceMap.get(representationId) || null;
  }
  resourceMetafileToDTE(resourceMetafile) {
    return {
      data: { ...resourceMetafile.data },
      info: { ...resourceMetafile.info },
      marks: structuredClone(resourceMetafile.marks),
      kv: structuredClone(resourceMetafile.kv),
      representations: structuredClone(resourceMetafile.representations),
      hierarchy: {
        children: resourceMetafile.hierarchy.children.map((value) => structuredClone(value)),
        order_index: resourceMetafile.hierarchy.order_index,
        parent_id: resourceMetafile.hierarchy.parent_id,
        path: this.getPath(resourceMetafile.data.id)
      }
    };
  }
  resourceDTEToMetafile(resourceEntity) {
    return {
      data: { ...resourceEntity.data },
      info: { ...resourceEntity.info },
      marks: structuredClone(resourceEntity.marks),
      kv: structuredClone(resourceEntity.kv),
      representations: structuredClone(resourceEntity.representations),
      hierarchy: {
        children: resourceEntity.hierarchy.children.map((value) => structuredClone(value)),
        order_index: resourceEntity.hierarchy.order_index,
        parent_id: resourceEntity.hierarchy.parent_id
      }
    };
  }
  inChildren(id, needle) {
    let result = false;
    const node = this.hierarchyIndexMap.get(id);
    for (const childId of Object.keys(node?.children ?? {})) {
      if (childId === needle) {
        result = true;
        break;
      } else if (this.inChildren(childId, needle)) {
        result = true;
        break;
      }
    }
    return result;
  }
  getAllChildIds(id) {
    const result = [];
    const node = this.hierarchyIndexMap.get(id);
    for (const childId of Object.keys(node?.children ?? {})) {
      result.push(childId);
      result.push(...this.getAllChildIds(childId));
    }
    return result;
  }
  deleteFromIndex(id) {
    const node = this.hierarchyIndexMap.get(id);
    if (node) {
      for (const representationId of Object.keys(node.representations)) {
        this.representationResourceMap.delete(representationId);
      }
      if (node.parent) {
        const parentNode = this.hierarchyIndexMap.get(node.parent);
        if (parentNode) {
          delete parentNode.children[id];
        }
      } else {
        delete this.hierarchyIndexTree.children[id];
      }
      this.hierarchyIndexMap.delete(id);
    }
  }
  getResourceDirectory(id) {
    return import_node_path.default.join(
      this.absoluteRoot,
      id.substring(0, 2),
      id.substring(2, 4),
      id.substring(4, 6),
      id.substring(6, 8),
      id
    );
  }
  getResourceFilePath(id) {
    return import_node_path.default.join(this.getResourceDirectory(id), id + ".json");
  }
  async createResourceMetafile(resourceMetafile) {
    let ctx = new Context();
    const resourceFilePath = this.getResourceFilePath(resourceMetafile.data.id);
    const resourceDirectory = this.getResourceDirectory(resourceMetafile.data.id);
    if (resourceMetafile.hierarchy.parent_id) {
      if (!await this.resourceExists(resourceMetafile.hierarchy.parent_id)) {
        ctx.setError(ErrorCodes.PARENT_NOT_FOUND, { entity: "resource" }, { id: resourceMetafile.hierarchy.parent_id });
        return ctx;
      }
      if (this.inChildren(resourceMetafile.data.id, resourceMetafile.hierarchy.parent_id)) {
        ctx.setError(
          ErrorCodes.CONFLICT,
          { reason: "Cyclic hierarchy detected, cannot create resource" },
          { id: resourceMetafile.data.id, conflict_id: resourceMetafile.hierarchy.parent_id }
        );
        return ctx;
      }
    }
    resourceMetafile.representations = [];
    resourceMetafile.hierarchy.children = [];
    const resLock = await this.lockQueue.lockMany([resourceMetafile.data.id, HIERARCHY_LOCK_NAME]);
    try {
      await import_promises.default.mkdir(resourceDirectory, { recursive: true });
      await import_promises.default.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + "\n", {
        encoding: "utf-8",
        flag: "wx"
      });
      const node = {
        parent: resourceMetafile.hierarchy.parent_id,
        children: {},
        representations: {}
      };
      this.hierarchyIndexMap.set(resourceMetafile.data.id, node);
      if (resourceMetafile.hierarchy.parent_id) {
        const parentNode = this.hierarchyIndexMap.get(resourceMetafile.hierarchy.parent_id);
        if (parentNode) {
          parentNode.children[resourceMetafile.data.id] = node;
        } else {
          ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Parent node not found" }, { id: resourceMetafile.hierarchy.parent_id });
        }
      } else {
        this.hierarchyIndexTree.children[resourceMetafile.data.id] = node;
      }
      ctx.apply(await this.saveHierarchyIndex(false));
    } catch (e) {
      ctx.applyException(e);
    } finally {
      resLock.releaseAll();
    }
    return ctx;
  }
  async updateResourceMetafile(resourceId, patch, lock = true) {
    let ctx = new Context();
    let resourceMetafile = null;
    const resLock = lock ? await this.lockQueue.lock(resourceId) : void 0;
    try {
      if ("function" === typeof patch) {
        let resourceMetafileCtx = await this.getResourceMetafile(resourceId);
        if (resourceMetafileCtx.isSuccess() && resourceMetafileCtx.result) {
          resourceMetafile = await patch(resourceMetafileCtx.result);
        } else {
          if (resourceMetafileCtx.isFailed()) {
            ctx.apply(resourceMetafileCtx);
          } else {
            ctx.setError(ErrorCodes.INVALID_DATA, { entity: "resource metafile" }, { id: resourceId });
          }
        }
      } else {
        resourceMetafile = patch;
      }
      if (ctx.isSuccess() && resourceMetafile) {
        resourceMetafile.data.updated_at = nowInS();
        const resourceFilePath = this.getResourceFilePath(resourceId);
        await import_promises.default.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + "\n", {
          encoding: "utf-8",
          flag: "w"
        });
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      if (resLock) {
        resLock.release();
      }
    }
    return ctx;
  }
  async updateResource(resourceMetafile) {
    let ctx = new Context();
    if (await this.resourceExists(resourceMetafile.data.id)) {
      const oldMetafileCtx = await this.getResourceMetafile(resourceMetafile.data.id);
      if (oldMetafileCtx.isFailed()) {
        ctx.apply(oldMetafileCtx);
        return ctx;
      }
      const oldMetafile = oldMetafileCtx.result;
      if (!oldMetafile) {
        ctx.setError(ErrorCodes.INVALID_DATA, { entity: "resource metafile" }, { id: resourceMetafile.data.id });
        return ctx;
      }
      const resLock = await this.lockQueue.lock(resourceMetafile.data.id);
      try {
        resourceMetafile.representations = oldMetafile.representations;
        resourceMetafile.hierarchy.children = oldMetafile.hierarchy.children;
        resourceMetafile.hierarchy.parent_id = oldMetafile.hierarchy.parent_id;
        resourceMetafile.data.updated_at = nowInS();
        resourceMetafile.data.is_deleted = false;
        ctx.apply(
          await this.updateResourceMetafile(resourceMetafile.data.id, resourceMetafile, false)
        );
      } catch (e) {
        ctx.applyException(e);
      } finally {
        resLock.release();
      }
    }
    return ctx;
  }
  async getResourceMetafile(resourceId) {
    let ctx = new Context(null);
    try {
      let resourceFilePath = this.getResourceFilePath(resourceId);
      if (!await import_promises.default.access(resourceFilePath).then(() => true).catch(() => false)) {
        ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource metafile" }, { id: resourceId });
        return ctx;
      }
      let content = await import_promises.default.readFile(resourceFilePath, { encoding: "utf-8" });
      ctx.result = JSON.parse(content);
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async appendChild(resourceID, childID) {
    let ctx = new Context();
    const childNode = this.hierarchyIndexMap.get(childID);
    if (!childNode) {
      ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { id: childID });
      return ctx;
    }
    const oldParentId = childNode.parent;
    let lockList = [resourceID, childID, HIERARCHY_LOCK_NAME];
    if (oldParentId) {
      lockList.push(oldParentId);
    }
    const resLock = await this.lockQueue.lockMany(lockList);
    try {
      if (this.inChildren(childID, resourceID)) {
        ctx.setError(ErrorCodes.CONFLICT, { reason: "Cyclic hierarchy detected, cannot append child" }, { id: childID, conflict_id: resourceID });
        return ctx;
      }
      let resourceNode = this.hierarchyIndexMap.get(resourceID);
      if (resourceNode) {
        if (resourceNode.children[childID]) {
          if (this.logger.warn) {
            this.logger.warn("Child already exists, cannot append child");
          }
          return ctx;
        }
      }
      const resourceEntityCtx = await this.getResourceMetafile(resourceID);
      const childEntityCtx = await this.getResourceMetafile(childID);
      const oldParentCtx = oldParentId ? await this.getResourceMetafile(oldParentId) : void 0;
      if (!resourceEntityCtx.result) {
        if (resourceEntityCtx.isFailed()) {
          ctx.apply(resourceEntityCtx);
        } else {
          ctx.setError(ErrorCodes.INVALID_DATA, { entity: "resource metafile" }, { id: resourceID });
        }
        return ctx;
      }
      if (!childEntityCtx.result) {
        if (childEntityCtx.isFailed()) {
          ctx.apply(childEntityCtx);
        } else {
          ctx.setError(ErrorCodes.INVALID_DATA, { entity: "resource metafile" }, { id: childID });
        }
        return ctx;
      }
      if (oldParentCtx && !oldParentCtx.result) {
        if (oldParentCtx.isFailed()) {
          ctx.apply(oldParentCtx);
        } else {
          ctx.setError(ErrorCodes.INVALID_DATA, { entity: "resource metafile" }, { id: oldParentId });
        }
      }
      let resourceEntity = resourceEntityCtx.result;
      let childEntity = childEntityCtx.result;
      childEntity.hierarchy.parent_id = resourceID;
      resourceEntity.hierarchy.children = resourceEntity.hierarchy.children.concat({
        id: childID,
        order_index: childEntity.hierarchy.order_index
      }).sort((a, b) => a.order_index - b.order_index);
      ctx.apply(await this.updateResourceMetafile(resourceID, resourceEntity, false));
      if (ctx.isSuccess()) {
        ctx.apply(await this.updateResourceMetafile(childID, childEntity, false));
        if (oldParentId && ctx.isSuccess()) {
          ctx.apply(
            await this.updateResourceMetafile(oldParentId, async (resourceMetafile) => {
              resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter((value) => value.id !== childID);
              resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
              return resourceMetafile;
            }, false)
          );
          let oldParentNode = this.hierarchyIndexMap.get(oldParentId);
          if (oldParentNode) {
            delete oldParentNode.children[childID];
          } else {
            ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Old parent node not found" }, { id: oldParentId });
          }
        }
        if (ctx.isSuccess()) {
          let childNode2 = this.hierarchyIndexMap.get(childID);
          if (oldParentId === null) {
            delete this.hierarchyIndexTree.children[childID];
          }
          if (resourceNode && childNode2) {
            resourceNode.children[childID] = childNode2;
            childNode2.parent = resourceID;
            ctx.apply(await this.saveHierarchyIndex(false));
          } else {
            ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Resource or child node not found" }, { id: resourceID, child_id: childID });
          }
        }
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      resLock.releaseAll();
    }
    return ctx;
  }
  async deleteResource(resourceId, recursive = false) {
    let ctx = new Context();
    if (!await this.resourceExists(resourceId)) {
      ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { id: resourceId });
      return ctx;
    }
    let lockList = [resourceId, HIERARCHY_LOCK_NAME];
    let childIds;
    let parentId = this.hierarchyIndexMap.get(resourceId)?.parent || null;
    if (parentId) {
      lockList.push(parentId);
    }
    if (recursive) {
      childIds = this.getAllChildIds(resourceId);
    } else {
      childIds = Object.keys(this.hierarchyIndexMap.get(resourceId)?.children || {});
    }
    lockList = lockList.concat(childIds);
    const resLock = await this.lockQueue.lockMany(lockList);
    try {
      ctx.apply(await this.deleteResourceFiles(resourceId));
      if (ctx.isFailed()) {
        return ctx;
      }
      if (recursive) {
        for (const childId of childIds) {
          ctx.apply(await this.deleteResourceFiles(childId));
          this.deleteFromIndex(childId);
        }
      } else {
        for (const childId of childIds) {
          ctx.apply(
            await this.updateResourceMetafile(childId, async (resourceMetafile) => {
              resourceMetafile.hierarchy.parent_id = null;
              return resourceMetafile;
            }, false)
          );
          if (ctx.isSuccess()) {
            let childNode = this.hierarchyIndexMap.get(childId);
            if (childNode) {
              childNode.parent = null;
              this.hierarchyIndexTree.children[childId] = childNode;
            } else {
              ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Child node not found" }, { id: childId });
            }
          }
        }
      }
      if (parentId && ctx.isSuccess()) {
        ctx.apply(
          await this.updateResourceMetafile(parentId, async (resourceMetafile) => {
            resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter((value) => value.id !== resourceId);
            resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
            return resourceMetafile;
          }, false)
        );
      }
      this.deleteFromIndex(resourceId);
      if (ctx.isSuccess()) {
        await this.saveHierarchyIndex(false);
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      resLock.releaseAll();
    }
    return ctx;
  }
  async deleteResourceFiles(resourceId) {
    let ctx = new Context();
    const resourceDirectory = this.getResourceDirectory(resourceId);
    try {
      await import_promises.default.rm(resourceDirectory, { recursive: true, force: true });
      const checkPaths = [
        import_node_path.default.join(
          this.absoluteRoot,
          resourceId.substring(0, 2),
          resourceId.substring(2, 4),
          resourceId.substring(4, 6),
          resourceId.substring(6, 8)
        ),
        import_node_path.default.join(
          this.absoluteRoot,
          resourceId.substring(0, 2),
          resourceId.substring(2, 4),
          resourceId.substring(4, 6)
        ),
        import_node_path.default.join(this.absoluteRoot, resourceId.substring(0, 2), resourceId.substring(2, 4)),
        import_node_path.default.join(this.absoluteRoot, resourceId.substring(0, 2))
      ];
      for (const checkPath of checkPaths) {
        let isEmpty = false;
        const dir = await import_promises.default.opendir(checkPath);
        if (null === await dir.read()) {
          isEmpty = true;
          await import_promises.default.rm(checkPath, { recursive: true, force: true });
        }
        await dir.close();
        if (!isEmpty) {
          break;
        }
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async resourceExists(resourceId) {
    const resourceFilePath = this.getResourceFilePath(resourceId);
    return await import_promises.default.access(resourceFilePath).then(() => true).catch(() => false);
  }
  async changeParent(resourceId, newParentId) {
    let ctx = new Context();
    let lockList = [resourceId, HIERARCHY_LOCK_NAME];
    const oldParentId = this.hierarchyIndexMap.get(resourceId)?.parent || null;
    if (oldParentId === newParentId) {
      return ctx;
    }
    if (oldParentId) {
      lockList.push(oldParentId);
    }
    if (newParentId) {
      if (newParentId && !await this.resourceExists(newParentId)) {
        ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { id: newParentId });
        return ctx;
      }
      if (this.inChildren(resourceId, newParentId)) {
        ctx.setError(ErrorCodes.CONFLICT, { reason: "Cyclic hierarchy detected, cannot change parent" }, { id: resourceId, conflict_id: newParentId });
        return ctx;
      }
      lockList.push(newParentId);
    }
    const resLock = await this.lockQueue.lockMany(lockList);
    try {
      let node = this.hierarchyIndexMap.get(resourceId);
      if (node) {
        node.parent = newParentId;
      } else {
        ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Resource node not found" }, { id: resourceId });
        return ctx;
      }
      if (oldParentId) {
        const oldParentNode = this.hierarchyIndexMap.get(oldParentId);
        if (oldParentNode) {
          delete oldParentNode.children[resourceId];
        } else {
          ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "Old parent node not found" }, { id: resourceId });
          return ctx;
        }
        ctx.apply(
          await this.updateResourceMetafile(oldParentId, async (resourceMetafile) => {
            resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter((value) => value.id !== resourceId);
            resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
            return resourceMetafile;
          }, false)
        );
      }
      if (newParentId && ctx.isSuccess()) {
        let parentNode = this.hierarchyIndexMap.get(newParentId);
        if (parentNode) {
          if (node) {
            parentNode.children[resourceId] = node;
          }
        } else {
          ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: "New parent node not found" }, { id: newParentId });
          return ctx;
        }
        ctx.apply(
          await this.updateResourceMetafile(newParentId, async (resourceMetafile) => {
            resourceMetafile.hierarchy.children.push({
              id: resourceId,
              order_index: 0
            });
            resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
            return resourceMetafile;
          }, false)
        );
      }
      if (ctx.isSuccess()) {
        ctx.apply(
          await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
            resourceMetafile.hierarchy.parent_id = newParentId;
            resourceMetafile.hierarchy.order_index = 0;
            return resourceMetafile;
          }, false)
        );
      }
      if (ctx.isSuccess()) {
        ctx.apply(await this.saveHierarchyIndex(false));
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      resLock.releaseAll();
    }
    return ctx;
  }
  async changeOrderIndex(resourceId, newOrderIndex) {
    let ctx = new Context();
    if (!await this.resourceExists(resourceId)) {
      ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { id: resourceId });
      return ctx;
    }
    let lockList = [resourceId];
    const parentId = this.hierarchyIndexMap.get(resourceId)?.parent || null;
    if (parentId) {
      lockList.push(parentId);
    }
    const lock = await this.lockQueue.lockMany(lockList);
    try {
      ctx.apply(
        await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
          resourceMetafile.hierarchy.order_index = newOrderIndex;
          return resourceMetafile;
        }, false)
      );
      if (parentId && ctx.isSuccess()) {
        ctx.apply(
          await this.updateResourceMetafile(parentId, async (resourceMetafile) => {
            for (const child of resourceMetafile.hierarchy.children) {
              if (child.id === resourceId) {
                child.order_index = newOrderIndex;
              }
            }
            resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
            return resourceMetafile;
          }, false)
        );
      }
      if (ctx.isSuccess()) {
        ctx.apply(await this.saveHierarchyIndex(false));
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      lock.releaseAll();
    }
    return ctx;
  }
  async createRepresentation(resourceId, representationEntity) {
    let ctx = new Context();
    const lock = await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME]);
    const isPrimary = representationEntity.data.is_primary;
    try {
      const nowTimeInS = nowInS();
      representationEntity.data.created_at = nowTimeInS;
      representationEntity.data.updated_at = nowTimeInS;
      representationEntity.data.is_primary = false;
      representationEntity.data.uploading = false;
      if (!representationEntity.data.is_external) {
        representationEntity.data.uploading = true;
        representationEntity.info.data = {
          uploaded: [],
          assumedSize: void 0
        };
        const filePath = import_node_path.default.join(
          this.getResourceDirectory(resourceId),
          representationEntity.data.id + "." + (representationEntity.data.extension || "unknown")
        );
        let fh = await import_promises.default.open(filePath, "a");
        await fh.close();
        await import_promises.default.utimes(filePath, nowTimeInS, nowTimeInS);
      }
      let resourceMetafileCtx = await this.getResourceMetafile(resourceId);
      if (!resourceMetafileCtx.result) {
        if (resourceMetafileCtx.isFailed()) {
          ctx.apply(resourceMetafileCtx);
        } else {
          ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource metafile" }, { id: resourceId });
        }
        return ctx;
      }
      const resourceMetafile = resourceMetafileCtx.result;
      resourceMetafile.representations.push(representationEntity);
      if (isPrimary) {
        for (const rep of resourceMetafile.representations) {
          rep.data.is_primary = rep.data.id === representationEntity.data.id;
        }
      }
      ctx.apply(
        await this.updateResourceMetafile(resourceId, resourceMetafile, false)
      );
      if (ctx.isSuccess()) {
        this.representationResourceMap.set(representationEntity.data.id, resourceId);
        const node = this.hierarchyIndexMap.get(resourceId);
        if (node) {
          node.representations[representationEntity.data.id] = isPrimary;
        }
        ctx.apply(await this.saveHierarchyIndex(false));
      }
    } catch (e) {
      ctx.applyException(e);
    } finally {
      lock.releaseAll();
    }
    return ctx;
  }
  async uploadRepresentationPart(representationId, chunk, offset = 0, length = void 0) {
    let report = {
      status: false,
      resourceId: null,
      isComplete: false,
      data: null
    };
    let ctx = new Context(report);
    let fileHandler = void 0;
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      report.resourceId = resourceId;
      const lock = await this.lockQueue.lock(resourceId);
      try {
        let resourceMetafileCtx = await this.getResourceMetafile(resourceId);
        if (!resourceMetafileCtx.result) {
          if (resourceMetafileCtx.isFailed()) {
            ctx.apply(resourceMetafileCtx);
          } else {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource metafile" }, { id: resourceId });
          }
          return ctx;
        }
        const resourceMetafile = resourceMetafileCtx.result;
        let representation = resourceMetafile.representations.find((value) => value.data.id === representationId) || null;
        if (representation) {
          report.isComplete = !representation.data.uploading;
          report.data = representation.info.data;
          if (!representation.data.is_external) {
            const filePath = import_node_path.default.join(
              this.getResourceDirectory(resourceId),
              representation.data.id + "." + (representation.data.extension || "unknown")
            );
            fileHandler = await import_promises.default.open(filePath, "a+");
            await fileHandler.write(chunk, 0, length, offset);
            await fileHandler.close();
            fileHandler = void 0;
            const lowerBound = offset;
            const upperBound = offset + (length || chunk.length);
            const newParts = [];
            const oldParts = representation.info.data?.uploaded || [];
            let mergePart = null;
            for (const oldPart of oldParts) {
              let isIntersected = Math.max(oldPart.lower, lowerBound) < Math.min(oldPart.upper, upperBound);
              if (isIntersected) {
                if (mergePart) {
                  mergePart.lower = Math.min(oldPart.lower, lowerBound);
                  mergePart.upper = Math.max(oldPart.upper, upperBound);
                } else {
                  mergePart = {
                    lower: Math.max(oldPart.lower, lowerBound),
                    upper: Math.min(oldPart.upper, upperBound)
                  };
                }
              } else {
                if (mergePart) {
                  newParts.push(mergePart);
                  mergePart = null;
                }
                newParts.push(oldPart);
              }
            }
            if (mergePart) {
              newParts.push(mergePart);
            }
            if (newParts.length === 0) {
              newParts.push({
                lower: lowerBound,
                upper: upperBound
              });
            }
            if (newParts[0].lower === 0 && newParts[0].upper === representation.info.data?.assumedSize) {
              representation.data.uploading = false;
              const filetype = await (0, import_file_type.fileTypeFromFile)(filePath);
              representation.data.mime = filetype?.mime || null;
              if (filetype?.ext && representation.data.extension !== filetype.ext) {
                representation.data.extension = filetype.ext || null;
                const newFilePath = import_node_path.default.join(
                  this.getResourceDirectory(resourceId),
                  representation.data.id + "." + (representation.data.extension || "unknown")
                );
                await import_promises.default.rename(filePath, newFilePath);
              }
              report.isComplete = true;
            } else {
              representation.info.data = {
                uploaded: newParts,
                assumedSize: representation.info.data?.assumedSize || void 0
              };
            }
            report.data = representation.info.data;
            ctx.apply(
              await this.updateResourceMetafile(resourceId, resourceMetafile, false)
            );
            report.status = ctx.status;
          }
        }
      } catch (e) {
        ctx.applyException(e);
      } finally {
        if (fileHandler) {
          await fileHandler.close();
        }
        lock.release();
      }
    }
    return ctx;
  }
  async finishRepresentationUpload(representationId) {
    let ctx = new Context();
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      const lock = await this.lockQueue.lock(resourceId);
      try {
        let resourceMetafileCtx = await this.getResourceMetafile(resourceId);
        if (!resourceMetafileCtx.result) {
          if (resourceMetafileCtx.isFailed()) {
            ctx.apply(resourceMetafileCtx);
          } else {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource metafile" }, { id: resourceId });
          }
          return ctx;
        }
        const resourceMetafile = resourceMetafileCtx.result;
        let representation = resourceMetafile.representations.find((value) => value.data.id === representationId) || null;
        if (representation) {
          if (!representation.data.is_external) {
            const filePath = import_node_path.default.join(
              this.getResourceDirectory(resourceId),
              representation.data.id + "." + (representation.data.extension || "unknown")
            );
            representation.data.uploading = false;
            const filetype = await (0, import_file_type.fileTypeFromFile)(filePath);
            representation.data.mime = filetype?.mime || null;
            if (filetype?.ext && representation.data.extension !== filetype.ext) {
              representation.data.extension = filetype.ext || null;
              const newFilePath = import_node_path.default.join(
                this.getResourceDirectory(resourceId),
                representation.data.id + "." + (representation.data.extension || "unknown")
              );
              await import_promises.default.rename(filePath, newFilePath);
            }
            representation.info.data = {};
            ctx.apply(
              await this.updateResourceMetafile(resourceId, resourceMetafile, false)
            );
          }
        }
      } catch (e) {
        ctx.applyException(e);
      } finally {
        lock.release();
      }
    }
    return ctx;
  }
  async makeRepresentationPrimary(resourceId, representationId, lock = true) {
    let ctx = new Context();
    const resLock = lock ? await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME]) : null;
    try {
      let node = this.hierarchyIndexMap.get(resourceId);
      if (node && "undefined" !== typeof node.representations[representationId]) {
        for (const repId in node.representations) {
          node.representations[repId] = repId === representationId;
        }
        ctx.apply(await this.saveHierarchyIndex(false));
      } else {
        ctx.setError(ErrorCodes.NOT_FOUND, { entity: "representation" }, { resourceId, representationId });
        return ctx;
      }
      ctx.apply(
        await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
          for (const representation of resourceMetafile.representations) {
            representation.data.is_primary = representation.data.id === representationId;
          }
          return resourceMetafile;
        }, false)
      );
    } catch (e) {
      ctx.applyException(e);
    } finally {
      if (resLock) {
        resLock.releaseAll();
      }
    }
    return ctx;
  }
  async deleteRepresentation(representationId) {
    let ctx = new Context();
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      const lock = await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME]);
      try {
        let resourceMetafileCtx = await this.getResourceMetafile(resourceId);
        if (!resourceMetafileCtx.result) {
          if (resourceMetafileCtx.isFailed()) {
            ctx.apply(resourceMetafileCtx);
          } else {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource metafile" }, { id: resourceId });
          }
          return ctx;
        }
        const resourceMetafile = resourceMetafileCtx.result;
        for (let i = 0; i < resourceMetafile.representations.length; i++) {
          const representation = resourceMetafile.representations[i];
          if (representation.data.id === representationId) {
            resourceMetafile.representations.splice(i, 1);
            ctx.apply(await this.updateResourceMetafile(resourceId, resourceMetafile, false));
            if (ctx.isSuccess()) {
              if (!representation.data.is_external) {
                const filePath = import_node_path.default.join(
                  this.getResourceDirectory(resourceId),
                  representation.data.id + "." + (representation.data.extension || "unknown")
                );
                await import_promises.default.rm(filePath, { force: true });
              }
              this.representationResourceMap.delete(representationId);
              const node = this.hierarchyIndexMap.get(resourceId);
              if (node && "undefined" !== typeof node.representations[representationId]) {
                delete node.representations[representationId];
              }
              ctx.apply(await this.saveHierarchyIndex(false));
            }
            break;
          }
        }
      } catch (e) {
        ctx.applyException(e);
      } finally {
        lock.releaseAll();
      }
    }
    return ctx;
  }
  async deleteMarks(resourceId, marks) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      const toDelete = new Set(marks.map((m) => m.name + "|" + m.type));
      resourceMetafile.marks = resourceMetafile.marks.filter((m) => !toDelete.has(m.name + "|" + m.type));
      return resourceMetafile;
    });
  }
  async deleteResourceKV(resourceId, componentKeys) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (const component in componentKeys) {
        if (!resourceMetafile.kv[component]) continue;
        for (const key in componentKeys[component]) {
          delete resourceMetafile.kv[component][key];
        }
      }
      return resourceMetafile;
    });
  }
  async setMarks(resourceId, marks) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      const marksData = marks.map((mark) => {
        return { value: 0, ...mark };
      });
      for (let i = 0; i < resourceMetafile.marks.length; i++) {
        const mark = resourceMetafile.marks[i];
        if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
          resourceMetafile.marks.splice(i, 1);
        }
      }
      resourceMetafile.marks.push(...marksData);
      return resourceMetafile;
    });
  }
  async setResourceKV(resourceId, componentKeys) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (const component in componentKeys) {
        if ("undefined" === typeof resourceMetafile.kv[component]) {
          resourceMetafile.kv[component] = { ...componentKeys[component] };
        } else {
          resourceMetafile.kv[component] = {
            ...resourceMetafile.kv[component],
            ...componentKeys[component]
          };
        }
      }
      return resourceMetafile;
    });
  }
};

// src/core/DbManager.ts
var DbManager = class {
  constructor(db, config, logger, getPaths) {
    this.db = db;
    this.config = config;
    this.logger = logger;
    this.getPaths = getPaths;
  }
  async createResourceRecord(resourceEntity) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.insert({
          ...resourceEntity.data,
          created_at: nowInS(),
          updated_at: nowInS()
        }).into(RESOURCE_DATA_TABLE);
        await trx.insert({
          ...resourceEntity.info,
          id: resourceEntity.data.id
        }).into(RESOURCE_INFO_TABLE);
        await trx.insert({
          id: resourceEntity.data.id,
          parent_id: resourceEntity.hierarchy.parent_id,
          order_index: resourceEntity.hierarchy.order_index
        }).into(RESOURCE_HIERARCHY_TABLE);
        for (const representation of resourceEntity.representations) {
          await trx.insert({
            ...representation.data,
            resource_id: resourceEntity.data.id
          }).into(REPRESENTATION_DATA_TABLE);
          await trx.insert({
            ...representation.source,
            id: representation.data.id
          }).into(REPRESENTATION_SOURCE_TABLE);
          await trx.insert({
            data: representation.info.data,
            id: representation.data.id
          }).into(REPRESENTATION_INFO_TABLE);
        }
        for (const kvComponent in resourceEntity.kv) {
          for (const kvAttribute in resourceEntity.kv[kvComponent]) {
            await trx.insert({
              component: kvComponent,
              attribute: kvAttribute,
              value: resourceEntity.kv[kvComponent][kvAttribute],
              resource_id: resourceEntity.data.id
            }).into(MARK_KV_TABLE);
          }
        }
        for (const mark of resourceEntity.marks) {
          await trx.insert({
            ...mark,
            resource_id: resourceEntity.data.id
          }).into(MARK_DATA_TABLE);
        }
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async resourceExists(resourceId) {
    return !!await this.db(RESOURCE_DATA_TABLE).where("id", resourceId).first();
  }
  async appendChild(resourceId, childID) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.update({
          parent_id: resourceId
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: childID
        });
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async changeParent(resourceId, newParentId) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.update({
          parent_id: newParentId
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: resourceId
        });
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async changeOrderIndex(resourceId, newOrderIndex) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.update({
          order_index: newOrderIndex
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: resourceId
        });
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async updateRepresentationInfo(representationId, info) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        }).first();
        if (representationRecord) {
          await trx.update({
            data: JSON.stringify(info.data)
          }).from(REPRESENTATION_INFO_TABLE).where({
            id: representationId
          });
          await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async createRepresentation(resourceId, representationEntity) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.insert({
          ...representationEntity.data,
          resource_id: resourceId
        }).into(REPRESENTATION_DATA_TABLE);
        await trx.insert({
          ...representationEntity.source,
          id: representationEntity.data.id
        }).into(REPRESENTATION_SOURCE_TABLE);
        await trx.insert({
          data: representationEntity.info.data,
          id: representationEntity.data.id
        }).into(REPRESENTATION_INFO_TABLE);
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async updateRepresentation(representationId, representationEntity) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        }).first();
        if (representationRecord) {
          let dataUpdate = {
            ...representationEntity.data,
            resource_id: representationRecord.resource_id
          };
          delete dataUpdate["id"];
          await trx.update(
            dataUpdate
          ).from(REPRESENTATION_DATA_TABLE).where({
            id: representationId
          });
          await trx.update({
            ...representationEntity.source
          }).from(REPRESENTATION_SOURCE_TABLE).where({
            id: representationEntity.data.id
          });
          await trx.update({
            data: JSON.stringify(representationEntity.info.data)
          }).from(REPRESENTATION_INFO_TABLE).where({
            id: representationId
          });
          await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async representationExists(representationID) {
    return !!await this.db(REPRESENTATION_DATA_TABLE).where("id", representationID).first();
  }
  async markExists(resourceId, name, type) {
    return !!await this.db(MARK_DATA_TABLE).where({
      resource_id: resourceId,
      name,
      type
    }).first();
  }
  async resourceKVExists(resourceId, component, attribute) {
    return !!await this.db(MARK_KV_TABLE).where({
      resource_id: resourceId,
      component,
      attribute
    }).first();
  }
  async deleteResource(resourceId) {
    let ctx = new Context();
    try {
      await this.db(RESOURCE_DATA_TABLE).where("id", resourceId).delete();
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteRepresentation(representationId) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        }).first();
        if (representationRecord) {
          await trx.delete().from(REPRESENTATION_DATA_TABLE).where({ id: representationId });
          await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteMarks(resourceId, marks) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        for (const mark of marks) {
          await trx.delete().from(MARK_DATA_TABLE).where({
            resource_id: resourceId,
            name: mark.name,
            type: mark.type
          });
        }
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteResourceKV(resourceId, componentKeys) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        for (const component in componentKeys) {
          for (const attribute in componentKeys[component]) {
            await trx.delete().from(MARK_KV_TABLE).where({
              resource_id: resourceId,
              component,
              attribute
            });
          }
        }
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async setMarks(resourceId, marks) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        for (const mark of marks) {
          await trx.upsert({
            ...mark,
            resource_id: resourceId
          }).into(MARK_DATA_TABLE).where({
            resource_id: resourceId,
            name: mark.name,
            type: mark.type
          });
        }
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async setResourceKV(resourceId, componentKeys) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        for (const component in componentKeys) {
          for (const attribute in componentKeys[component]) {
            await trx.upsert({
              component,
              attribute,
              value: componentKeys[component][attribute],
              resource_id: resourceId
            }).into(MARK_KV_TABLE).where({
              resource_id: resourceId,
              component,
              attribute
            });
          }
        }
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async makeRepresentationPrimary(resourceId, representationId) {
    let ctx = new Context();
    try {
      await this.db.transaction(async (trx) => {
        await trx.update({
          is_primary: false
        }).from(REPRESENTATION_DATA_TABLE).where({
          resource_id: resourceId,
          is_primary: true
        });
        await trx.update({
          is_primary: true
        }).from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        });
        await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
      });
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteAllRecords() {
    let ctx = new Context();
    try {
      await this.db(RESOURCE_DATA_TABLE).delete();
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async getMarkStatListByType(type) {
    let ctx = new Context([]);
    try {
      ctx.result = await this.db(MARK_DATA_TABLE).where({ type }).groupBy("name").select(
        "name",
        this.db.raw("count(resource_id) as resources"),
        this.db.raw("min(value) as min_value"),
        this.db.raw("max(value) as max_value")
      );
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async getMarkList() {
    let ctx = new Context({});
    try {
      let queryResult = await this.db(MARK_DATA_TABLE).groupBy(["type", "name"]).select(
        "type",
        "name"
      );
      for (const record of queryResult) {
        if ("undefined" === typeof ctx.result[record.type]) {
          ctx.result[record.type] = [];
        }
        ctx.result[record.type].push(record.name);
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async findResources(criteria) {
    let ctx = new Context([]);
    const db = this.db;
    const columnsConfig = {
      data_id: RESOURCE_DATA_TABLE + ".id",
      data_created_at: RESOURCE_DATA_TABLE + ".created_at",
      data_updated_at: RESOURCE_DATA_TABLE + ".updated_at",
      data_locked: RESOURCE_DATA_TABLE + ".locked",
      data_hidden: RESOURCE_DATA_TABLE + ".hidden",
      data_is_deleted: RESOURCE_DATA_TABLE + ".is_deleted",
      info_title: RESOURCE_INFO_TABLE + ".title",
      info_description: RESOURCE_INFO_TABLE + ".description",
      hierarchy_parent_id: RESOURCE_HIERARCHY_TABLE + ".parent_id",
      hierarchy_order_index: RESOURCE_HIERARCHY_TABLE + ".order_index",
      representation_data_id: REPRESENTATION_DATA_TABLE + ".id",
      representation_data_created_at: REPRESENTATION_DATA_TABLE + ".created_at",
      representation_data_updated_at: REPRESENTATION_DATA_TABLE + ".updated_at",
      representation_data_type: REPRESENTATION_DATA_TABLE + ".type",
      representation_data_role: REPRESENTATION_DATA_TABLE + ".role",
      representation_data_mime: REPRESENTATION_DATA_TABLE + ".mime",
      representation_data_extension: REPRESENTATION_DATA_TABLE + ".extension",
      representation_data_is_external: REPRESENTATION_DATA_TABLE + ".is_external",
      representation_data_is_primary: REPRESENTATION_DATA_TABLE + ".is_primary",
      representation_data_uploading: REPRESENTATION_DATA_TABLE + ".uploading",
      representation_source_url: REPRESENTATION_SOURCE_TABLE + ".url",
      representation_source_derived_from: REPRESENTATION_SOURCE_TABLE + ".derived_from",
      representation_info_data: REPRESENTATION_INFO_TABLE + ".data",
      mark_data_name: MARK_DATA_TABLE + ".name",
      mark_data_type: MARK_DATA_TABLE + ".type",
      mark_data_value: MARK_DATA_TABLE + ".value",
      kv_component: MARK_KV_TABLE + ".component",
      kv_attribute: MARK_KV_TABLE + ".attribute",
      kv_value: MARK_KV_TABLE + ".value"
    };
    let filterQuery = this.db.select().column({
      f_id: RESOURCE_DATA_TABLE + ".id"
    }).from(RESOURCE_DATA_TABLE).as("f_t");
    if (criteria.hierarchy && criteria.hierarchy.parent_id) {
      filterQuery = filterQuery.innerJoin(RESOURCE_HIERARCHY_TABLE, function() {
        this.on(RESOURCE_HIERARCHY_TABLE + ".id", "=", "f_id").andOn(RESOURCE_HIERARCHY_TABLE + ".parent_id", "=", db.raw("?", [criteria.hierarchy.parent_id]));
      });
    }
    if (criteria.representation && Object.keys(criteria.representation).length > 0) {
      filterQuery = filterQuery.innerJoin(REPRESENTATION_DATA_TABLE + " as repCon", function() {
        let onCondition = this.on("repCon.resource_id", "=", "f_id");
        if (criteria.representation?.id) {
          onCondition.andOn("repCon.id", "=", db.raw("?", [criteria.representation.id]));
        }
        if (criteria.representation?.type) {
          onCondition.andOn("repCon.type", "=", db.raw("?", [criteria.representation.type]));
        }
        if (criteria.representation?.role) {
          onCondition.andOn("repCon.role", "=", db.raw("?", [criteria.representation.role]));
        }
        if (criteria.representation?.mime) {
          onCondition.andOn("repCon.mime", "=", db.raw("?", [criteria.representation.mime]));
        }
        if (criteria.representation?.extension) {
          onCondition.andOn("repCon.extension", "=", db.raw("?", [criteria.representation.extension]));
        }
        if (criteria.representation?.is_external) {
          onCondition.andOn("repCon.is_external", "=", db.raw("?", [criteria.representation.is_external]));
        }
        if (criteria.representation?.is_primary) {
          onCondition.andOn("repCon.is_primary", "=", db.raw("?", [criteria.representation.is_primary]));
        }
        if (criteria.representation?.uploading) {
          onCondition.andOn("repCon.uploading", "=", db.raw("?", [criteria.representation.uploading]));
        }
      });
    }
    const getMarkValueRawCondition = (value, tName) => {
      let condition = db.raw(tName + ".value = ?", [value]);
      if (value === null) {
        condition = db.raw(tName + ".value IS NULL");
      } else if (value === "not null") {
        condition = db.raw(tName + ".value IS NOT NULL");
      } else if (Array.isArray(value)) {
        if ("string" === typeof value[0]) {
          condition = db.raw(tName + ".value " + value[0] + " ?", [value[1]]);
        } else {
          condition = db.raw(tName + ".value >= ? AND " + tName + ".value <= ?", [value[0], value[1]]);
        }
      }
      return condition;
    };
    if (criteria.mark && (!Array.isArray(criteria.mark) || Object.keys(criteria.mark).length > 0)) {
      if (!Array.isArray(criteria.mark)) {
        criteria.mark = [criteria.mark];
      }
      let joinCount = 0;
      for (const markAndCondition of criteria.mark) {
        const tName = "mark" + joinCount++;
        filterQuery = filterQuery.innerJoin(MARK_DATA_TABLE + " as " + tName, function() {
          let onCondition = this.on(tName + ".resource_id", "=", "f_id");
          if (!Array.isArray(markAndCondition)) {
            onCondition.andOn(tName + ".type", "=", db.raw("?", [markAndCondition.type]));
            onCondition.andOn(tName + ".name", "=", db.raw("?", [markAndCondition.name]));
            if (markAndCondition.value !== void 0) {
              onCondition.andOn(getMarkValueRawCondition(markAndCondition.value, tName));
            }
          } else {
            onCondition.andOn(function() {
              for (const markOrCondition of markAndCondition) {
                this.orOn(function() {
                  this.andOn(tName + ".type", "=", db.raw("?", [markOrCondition.type]));
                  this.andOn(tName + ".name", "=", db.raw("?", [markOrCondition.name]));
                  if (markOrCondition.value !== void 0) {
                    this.andOn(getMarkValueRawCondition(markOrCondition.value, tName));
                  }
                });
              }
            });
          }
        });
      }
    }
    if (criteria.data) {
      if (criteria.data.id) {
        filterQuery = filterQuery.andWhere({
          "f_id": criteria.data.id
        });
      }
    }
    if (criteria.hierarchy && criteria.hierarchy.parent_id) {
      filterQuery = filterQuery.orderBy(RESOURCE_HIERARCHY_TABLE + ".order_index", criteria.hierarchy.order || "asc");
    }
    let query = this.db(filterQuery).select().column(columnsConfig);
    query = query.leftJoin(RESOURCE_DATA_TABLE, function() {
      this.on(RESOURCE_DATA_TABLE + ".id", "=", "f_t.f_id");
    }).leftJoin(RESOURCE_INFO_TABLE, function() {
      this.on(RESOURCE_INFO_TABLE + ".id", "=", RESOURCE_DATA_TABLE + ".id");
    }).leftJoin(RESOURCE_HIERARCHY_TABLE, function() {
      this.on(RESOURCE_HIERARCHY_TABLE + ".id", "=", RESOURCE_DATA_TABLE + ".id");
    });
    query = query.leftJoin(REPRESENTATION_DATA_TABLE, function() {
      this.on(REPRESENTATION_DATA_TABLE + ".resource_id", "=", RESOURCE_DATA_TABLE + ".id");
    }).leftJoin(REPRESENTATION_INFO_TABLE, function() {
      this.on(REPRESENTATION_INFO_TABLE + ".id", "=", REPRESENTATION_DATA_TABLE + ".id");
    }).leftJoin(REPRESENTATION_SOURCE_TABLE, function() {
      this.on(REPRESENTATION_SOURCE_TABLE + ".id", "=", REPRESENTATION_DATA_TABLE + ".id");
    });
    query = query.leftJoin(MARK_DATA_TABLE, function() {
      this.on(MARK_DATA_TABLE + ".resource_id", "=", RESOURCE_DATA_TABLE + ".id");
    }).leftJoin(MARK_KV_TABLE, function() {
      this.on(MARK_KV_TABLE + ".resource_id", "=", RESOURCE_DATA_TABLE + ".id");
    });
    if ("undefined" !== typeof criteria.limit) {
      query = query.limit(criteria.limit);
    }
    if ("undefined" !== typeof criteria.offset) {
      query = query.offset(criteria.offset);
    }
    const resourcesIndex = /* @__PURE__ */ new Map();
    const representationsIndex = /* @__PURE__ */ new Set();
    const markIndex = /* @__PURE__ */ new Set();
    const kvIndex = /* @__PURE__ */ new Set();
    const result = await query;
    for (const record of result) {
      if (!resourcesIndex.has(record.data_id)) {
        let resourceEntity = {
          data: {
            id: record.data_id,
            created_at: record.data_created_at,
            updated_at: record.data_updated_at,
            hidden: record.data_hidden,
            locked: record.data_locked,
            is_deleted: record.data_is_deleted
          },
          hierarchy: {
            parent_id: record.hierarchy_parent_id,
            order_index: record.hierarchy_order_index,
            path: this.getPaths(record.data_id),
            children: []
          },
          info: {
            title: record.info_title,
            description: record.info_description
          },
          representations: [],
          marks: [],
          kv: {}
        };
        ctx.result.push(resourceEntity);
        resourcesIndex.set(record.data_id, resourceEntity);
      }
      if (!representationsIndex.has(record.representation_data_id)) {
        let representationEntity = {
          data: {
            id: record.representation_data_id,
            type: record.representation_data_type,
            role: record.representation_data_role,
            mime: record.representation_data_mime,
            extension: record.representation_data_extension,
            created_at: record.representation_data_created_at,
            updated_at: record.representation_data_updated_at,
            is_primary: record.representation_data_is_primary,
            is_external: record.representation_data_is_external,
            uploading: record.representation_data_uploading
          },
          source: {
            url: record.representation_source_url,
            derived_from: record.representation_source_derived_from
          },
          info: {
            data: record.representation_info_data
          }
        };
        resourcesIndex.get(record.data_id).representations.push(representationEntity);
        representationsIndex.add(record.representation_data_id);
      }
      const markKey = "" + record.data_id + record.mark_data_type + record.mark_data_name;
      if (!markIndex.has(markKey)) {
        const markEntity = {
          type: record.mark_data_type,
          name: record.mark_data_name,
          value: record.mark_data_value
        };
        resourcesIndex.get(record.data_id).marks.push(markEntity);
        markIndex.add(markKey);
      }
      const kvKey = "" + record.kv_component + record.kv_attribute + record.kv_value;
      if (!kvIndex.has(kvKey)) {
        let resourceEntity = resourcesIndex.get(record.data_id);
        if ("undefined" === typeof resourceEntity.kv[record.kv_component]) {
          resourceEntity.kv[record.kv_component] = {};
        }
        resourceEntity.kv[record.kv_component][record.kv_attribute] = record.kv_value;
        kvIndex.add(kvKey);
      }
    }
    const childrenResult = await this.db(RESOURCE_HIERARCHY_TABLE).select().whereIn("parent_id", Array.from(resourcesIndex.keys())).orderBy([{ column: "parent_id" }, { column: "order_index" }]);
    for (const childRecord of childrenResult) {
      const resourceEntity = resourcesIndex.get(childRecord.parent_id);
      resourceEntity.hierarchy.children.push({
        id: childRecord.id,
        order_index: childRecord.order_index
      });
    }
    return ctx;
  }
};

// src/core/Namer.ts
var import_uuidv7 = require("uuidv7");
var import_uuid25 = require("uuid25");
var Namer = class {
  generateResourceId() {
    return import_uuid25.Uuid25.fromBytes((0, import_uuidv7.uuidv7obj)().bytes).toHex();
  }
  generateRepresentationId() {
    return import_uuid25.Uuid25.fromBytes((0, import_uuidv7.uuidv7obj)().bytes).toHex();
  }
};

// src/core/Core.ts
var Core = class extends import_node_events.EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.namer = new Namer();
    this.logger = config.logger;
    this.fsManager = new FsManager(config.storage, config.logger);
    this.db = (0, import_knex.default)(config.db.connection);
    this.migrationManager = new DBSchemeManager(this.db, config.logger);
    this.dbManager = new DbManager(this.db, config.db, config.logger, (resourceId) => this.fsManager.getPath(resourceId));
  }
  db;
  migrationManager;
  fsManager;
  dbManager;
  namer;
  logger;
  async init() {
    const initiableList = [
      this.migrationManager,
      this.fsManager
    ];
    for (const initiable of initiableList) {
      const initCtx = await initiable.init();
      if (initCtx.error) {
        this.logger.error(initCtx.error, initCtx.errorInfo);
      }
    }
  }
  async dbFullDrop() {
    let ctx = new Context();
    ctx.apply(await this.migrationManager.fullDrop());
    if (ctx.isSuccess()) {
      this.emit(ON_DB_FULL_DROP_EVENT, this);
    }
    return ctx;
  }
  applyDbSchemePatch(id, patch) {
    return this.migrationManager.applySchemePatch(id, patch);
  }
  rollbackDbSchemePatch(id, patch) {
    return this.migrationManager.rollbackSchemePatch(id, patch);
  }
  async createResource({ info, data = {}, hierarchy = {}, marks = [], kv = {} }) {
    let ctx = new Context(null);
    try {
      if (hierarchy.parent_id && !await this.dbManager.resourceExists(hierarchy.parent_id)) {
        ctx.setError(ErrorCodes.PARENT_NOT_FOUND, { entity: "resource" }, { parent_id: hierarchy.parent_id });
        return ctx;
      }
      const resourceId = this.namer.generateResourceId();
      const resourceEntity = {
        data: {
          id: resourceId,
          hidden: data?.hidden || false,
          locked: data?.locked || false,
          is_deleted: false,
          created_at: nowInS(),
          updated_at: nowInS()
        },
        hierarchy: {
          path: [],
          parent_id: null,
          // hierarchy?.parent_id || null,
          order_index: hierarchy?.order_index || 0,
          children: []
        },
        info: {
          title: info.title,
          description: info.description || null
        },
        representations: [],
        marks: marks.map((mark) => {
          return { value: 0, ...mark };
        }),
        kv
      };
      ctx.apply(
        await this.fsManager.createResourceMetafile(
          this.fsManager.resourceDTEToMetafile(resourceEntity)
        )
      );
      if (ctx.isSuccess()) {
        resourceEntity.hierarchy.path = this.fsManager.getPath(resourceEntity.data.id);
        ctx.apply(
          await this.dbManager.createResourceRecord(resourceEntity)
        );
        if (hierarchy?.parent_id && ctx.isSuccess()) {
          ctx.apply(
            await this.fsManager.appendChild(hierarchy.parent_id, resourceId)
          );
          if (ctx.isSuccess()) {
            ctx.apply(
              await this.dbManager.appendChild(hierarchy.parent_id, resourceId)
            );
          }
        }
        if (ctx.isSuccess()) {
          ctx.result = resourceId;
          this.emit(ON_RESOURCE_CREATED_EVENT, this, resourceEntity);
          for (const representation of resourceEntity.representations) {
            this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representation);
          }
          for (const mark of resourceEntity.marks) {
            this.emit(ON_MARK_CREATED_EVENT, this, mark);
          }
          for (const kvComponent in resourceEntity.kv) {
            for (const kvAttribute in resourceEntity.kv[kvComponent]) {
              this.emit(ON_RESOURCE_KV_CREATED_EVENT, this, kvComponent, kvAttribute, resourceEntity.kv[kvComponent][kvAttribute]);
            }
          }
        }
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async appendChild(parentId, childId) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.appendChild(parentId, childId));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.appendChild(parentId, childId));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async createRepresentation(resourceId, { data, infoData = null, source = {} }) {
    let ctx = new Context(null);
    if (await this.resourceExists(resourceId)) {
      const representationId = this.namer.generateRepresentationId();
      const representationEntity = {
        data: {
          id: representationId,
          // resource_id: resourceId,
          type: data.type,
          role: data.role,
          mime: null,
          extension: null,
          is_external: data.is_external,
          is_primary: false,
          created_at: nowInS(),
          updated_at: nowInS(),
          uploading: !data.is_external
        },
        source: {
          url: source.url || null,
          derived_from: source.derived_from || null
        },
        info: {
          data: infoData || {}
        }
      };
      while (true) {
        ctx.apply(await this.fsManager.createRepresentation(resourceId, representationEntity));
        if (ctx.isFailed()) break;
        ctx.apply(await this.dbManager.createRepresentation(resourceId, representationEntity));
        if (ctx.isFailed()) break;
        if (data.is_primary) {
          ctx.apply(await this.makeRepresentationPrimary(resourceId, representationId));
          if (ctx.isFailed()) break;
        }
        ctx.result = representationId;
        this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representationEntity);
        break;
      }
    } else {
      ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { resource_id: resourceId });
    }
    return ctx;
  }
  async makeRepresentationPrimary(resourceId, representationId) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.makeRepresentationPrimary(resourceId, representationId));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.makeRepresentationPrimary(resourceId, representationId));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteResource(id) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.deleteResource(id));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.deleteResource(id));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteRepresentation(id) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.deleteRepresentation(id));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.deleteRepresentation(id));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteMark(id, marks) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.deleteMarks(id, marks));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.deleteMarks(id, marks));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async deleteResourceKV(id, componentKeys) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.deleteResourceKV(id, componentKeys));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.deleteResourceKV(id, componentKeys));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  // update methods
  async setMarks(resourceId, marks) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.setMarks(resourceId, marks));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.setMarks(resourceId, marks));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  async setResourceKV(resourceId, componentKeys) {
    let ctx = new Context();
    try {
      ctx.apply(await this.fsManager.setResourceKV(resourceId, componentKeys));
      if (ctx.isSuccess()) {
        ctx.apply(await this.dbManager.setResourceKV(resourceId, componentKeys));
      }
    } catch (e) {
      ctx.applyException(e);
    }
    return ctx;
  }
  // TODO upload methods
  async uploadRepresentationPart(representationId, chunk, offset = 0, length = void 0) {
    let ctx = await this.fsManager.uploadRepresentationPart(representationId, chunk, offset, length);
    if (ctx.isSuccess()) {
      ctx.apply(await this.dbManager.updateRepresentationInfo(representationId, { data: ctx.result.data }));
    }
    return ctx;
  }
  async finishRepresentationUpload(representationId) {
    let ctx = await this.fsManager.finishRepresentationUpload(representationId);
    if (ctx.isSuccess()) {
      const resourceId = this.fsManager.getResourceIdByRepresentationId(representationId);
      if (resourceId) {
        const resourceMetafileCtx = await this.fsManager.getResourceMetafile(resourceId);
        if (!resourceMetafileCtx.result) {
          if (resourceMetafileCtx.isFailed()) {
            ctx.apply(resourceMetafileCtx);
          } else {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: "resource" }, { resource_id: resourceId });
          }
          return ctx;
        }
        let resourceMetafile = resourceMetafileCtx.result;
        let representation = null;
        for (const repItem of resourceMetafile.representations) {
          if (repItem.data.id === representationId) {
            representation = repItem;
            break;
          }
        }
        if (representation) {
          ctx.apply(await this.dbManager.updateRepresentation(representationId, representation));
        } else {
          ctx.setError(ErrorCodes.NOT_FOUND, { entity: "representation" }, { representation_id: representationId });
        }
      }
    }
    return ctx;
  }
  // TODO query methods
  resourceExists(id) {
    return this.dbManager.resourceExists(id);
  }
  representationExists(id) {
    return this.dbManager.representationExists(id);
  }
  markExists(id, name, type) {
    return this.dbManager.markExists(id, name, type);
  }
  resourceKVExists(id, component, attribute) {
    return this.dbManager.resourceKVExists(id, component, attribute);
  }
  async getMarkStatListByType(type) {
    return await this.dbManager.getMarkStatListByType(type);
  }
  async getMarkList() {
    return await this.dbManager.getMarkList();
  }
  async findResources(criteria) {
    return await this.dbManager.findResources(criteria);
  }
  async fullRescan(reportCallback) {
    let ctx = new Context();
    return ctx;
  }
};

// src/core/Plugin.ts
var Plugin = class {
  // need to overload to a string type in plugin implementation
  constructor(api) {
    this.api = api;
  }
  static name;
};

// src/services/Storage.ts
var Storage = class extends Plugin {
  constructor(api) {
    super(api);
  }
  async init() {
    let ctx = new Context();
    return ctx;
  }
  createResource(factoryData) {
    return this.api.createResource(factoryData);
  }
  appendChild(parentId, childId) {
    return this.api.appendChild(parentId, childId);
  }
  createRepresentation(resourceId, factoryData) {
    return this.api.createRepresentation(resourceId, factoryData);
  }
  makeRepresentationPrimary(resourceId, id) {
    return this.api.makeRepresentationPrimary(resourceId, id);
  }
  uploadRepresentationPart(representationId, chunk, offset = 0, length = void 0) {
    return this.api.uploadRepresentationPart(representationId, chunk, offset, length);
  }
  finishRepresentationUpload(representationId) {
    return this.api.finishRepresentationUpload(representationId);
  }
  deleteResource(id) {
    return this.api.deleteResource(id);
  }
  deleteRepresentation(id) {
    return this.api.deleteRepresentation(id);
  }
  deleteMarks(id, marks) {
    return this.api.deleteMark(id, marks);
  }
  deleteResourceKV(id, componentKeys) {
    return this.api.deleteResourceKV(id, componentKeys);
  }
  setMarks(resourceId, marks) {
    return this.api.setMarks(resourceId, marks);
  }
  setResourceKV(resourceId, componentKeys) {
    return this.api.setResourceKV(resourceId, componentKeys);
  }
};

// src/services/Query.ts
var Query = class extends Plugin {
  constructor(api) {
    super(api);
  }
  async init() {
    let ctx = new Context();
    return ctx;
  }
  resourceExists(id) {
    return this.api.resourceExists(id);
  }
  representationExists(id) {
    return this.api.representationExists(id);
  }
  markExists(id, name, type) {
    return this.api.markExists(id, name, type);
  }
  resourceKVExists(id, component, attribute) {
    return this.api.resourceKVExists(id, component, attribute);
  }
  getMarkStatListByType(type) {
    return this.api.getMarkStatListByType(type);
  }
  getMarkList() {
    return this.api.getMarkList();
  }
  async findResources(criteria) {
    return await this.api.findResources(criteria);
  }
};

// src/core/Extensia.ts
var Extensia = class {
  extensions = {};
  core;
  constructor(config) {
    this.core = new Core(config);
    this.extensions.storage = new Storage(this.core);
    this.extensions.query = new Query(this.core);
    for (const pluginConstructor of config.plugins) {
      const pluginName = pluginConstructor.name;
      if (pluginName in this.extensions) {
        throw new Error(`Plugin ${pluginName} already registered`);
      }
      this.extensions[pluginName] = new pluginConstructor(this.core);
    }
  }
  async start() {
    await this.core.init();
    this.core.emit(ON_CORE_INIT_EVENT, this.core);
    this.core.logger.info("Core initialized");
    for (const extName in this.extensions) {
      const ext = this.extensions[extName];
      await ext.init();
      this.core.emit(ON_PLUGIN_INIT_EVENT, this.core, ext);
      this.core.logger.info(`Plugin ${extName} initialized`);
    }
    this.core.emit(ON_STARTED_EVENT, this.core);
    this.core.logger.info("All plugins initialized");
  }
  getConfig() {
    return this.core.config;
  }
  ext(name) {
    return this.extensions[name];
  }
  hasExt(name) {
    return !!this.extensions[name];
  }
  query() {
    return this.extensions.query;
  }
  storage() {
    return this.extensions.storage;
  }
};

// src/core/Config.ts
var Config = class {
  db;
  storage;
  plugins = [];
  logger;
  constructor(initConfig) {
    this.db = {
      connection: initConfig.db.connection,
      initMigration: initConfig.db.initMigration || true
    };
    this.storage = initConfig.storage;
    this.plugins = initConfig.plugins || [];
    this.logger = initConfig.logger || console;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APPLY_PATCH_TABLE,
  Config,
  Context,
  Extensia,
  MARK_DATA_TABLE,
  MARK_KV_TABLE,
  ON_CORE_INIT_EVENT,
  ON_DB_CLEAN_EVENT,
  ON_DB_FULL_DROP_EVENT,
  ON_FULL_RESCAN,
  ON_MARK_CREATED_EVENT,
  ON_MARK_DELETED_EVENT,
  ON_MARK_UPDATED_EVENT,
  ON_PLUGIN_INIT_EVENT,
  ON_REPRESENTATION_CREATED_EVENT,
  ON_REPRESENTATION_DELETED_EVENT,
  ON_REPRESENTATION_UPDATED_EVENT,
  ON_RESOURCE_CREATED_EVENT,
  ON_RESOURCE_DELETED_EVENT,
  ON_RESOURCE_KV_CREATED_EVENT,
  ON_RESOURCE_KV_DELETED_EVENT,
  ON_RESOURCE_KV_UPDATED_EVENT,
  ON_RESOURCE_UPDATED_EVENT,
  ON_STARTED_EVENT,
  Plugin,
  REPRESENTATION_DATA_TABLE,
  REPRESENTATION_INFO_TABLE,
  REPRESENTATION_SOURCE_TABLE,
  RESOURCE_DATA_TABLE,
  RESOURCE_HIERARCHY_TABLE,
  RESOURCE_INFO_TABLE,
  makeIndexFromResourceEntity
});
//# sourceMappingURL=index.cjs.map