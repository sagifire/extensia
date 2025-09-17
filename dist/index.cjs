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

// src/core/utils.ts
function nowInMS() {
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
        table.string("id", 16).primary();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.boolean("locked").defaultTo(false);
        table.boolean("hidden").defaultTo(false);
        table.boolean("is_deleted").defaultTo(false);
        table.foreign("parent_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_resource_info: async (db) => {
      await db.schema.createTable(RESOURCE_INFO_TABLE, (table) => {
        table.string("id", 16).primary();
        table.string("title");
        table.text("description").nullable();
        table.foreign("id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_resource_hierarchy: async (db) => {
      await db.schema.createTable("resource_hierarchy", (table) => {
        table.string("id", 16).primary();
        table.string("parent_id", 16);
        table.integer("order_index").defaultTo(0);
        table.foreign("id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_representation_data: async (db) => {
      await db.schema.createTable(REPRESENTATION_DATA_TABLE, (table) => {
        table.string("id", 16).primary();
        table.string("resource_id", 16);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.string("type");
        table.string("role");
        table.string("mime").nullable();
        table.string("extension").nullable();
        table.boolean("is_external").defaultTo(false);
        table.foreign("resource_id").references(RESOURCE_DATA_TABLE + ".id").onDelete("CASCADE");
        table.index(["resource_id"]);
      });
      return true;
    },
    gen_representation_source: async (db) => {
      await db.schema.createTable(REPRESENTATION_SOURCE_TABLE, (table) => {
        table.string("id", 16).primary();
        table.string("url").nullable();
        table.string("derived_from", 16).nullable();
        table.foreign("id").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
        table.foreign("derived_from").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_representation_info: async (db) => {
      await db.schema.createTable(REPRESENTATION_INFO_TABLE, (table) => {
        table.string("id", 16).primary();
        table.json("data").defaultTo("{}");
        table.foreign("id").references(REPRESENTATION_DATA_TABLE + ".id").onDelete("CASCADE");
      });
      return true;
    },
    gen_mark_data: async (db) => {
      await db.schema.createTable(MARK_DATA_TABLE, (table) => {
        table.string("resource_id", 16);
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
        table.string("resource_id", 16);
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
    this.appliedPatches = await this.getOrInitAppliedPatches();
    if (applyGeneric) {
      for (const genericPatchId in this.genericPatches) {
        if (!this.appliedPatches.includes(genericPatchId)) {
          const result = await this.applySchemePatch(genericPatchId, this.genericPatches[genericPatchId]);
          if (!result) {
            throw new Error("Cannot apply generic patch");
          }
        }
      }
    }
  }
  async applySchemePatch(id, patch) {
    if (id in this.appliedPatches) {
      throw new Error("Cannot apply already applied patch");
    }
    const result = await patch(this.db);
    if (result) {
      this.appliedPatches.push(id);
      await this.db(APPLY_PATCH_TABLE).insert({ id });
      this.logger.info(`Applied DB scheme patch ${id}`);
    }
    return result;
  }
  async rollbackSchemePatch(id, patch) {
    let result = false;
    if (id in this.genericPatches) {
      throw new Error("Cannot rollback generic patch");
    }
    if (id in this.appliedPatches) {
      result = await patch(this.db);
      if (result) {
        this.appliedPatches = this.appliedPatches.filter((patchId) => patchId !== id);
        await this.db(APPLY_PATCH_TABLE).where("id", id).delete();
        this.logger.info(`Rolled back DB scheme patch ${id}`);
      }
    } else {
      throw new Error("Cannot rollback unknown patch");
    }
    return result;
  }
  async getOrInitAppliedPatches() {
    let result = [];
    const hasTable = await this.db.schema.hasTable(APPLY_PATCH_TABLE);
    if (hasTable) {
      result = await this.db(APPLY_PATCH_TABLE).select("id").pluck("id");
    } else {
      await this.db.schema.createTable(APPLY_PATCH_TABLE, (table) => {
        table.string("id").primary();
        table.timestamp("on_create").defaultTo(this.db.fn.now());
      });
    }
    return result;
  }
  async fullDrop() {
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
    await this.initHierarchyIndex();
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
    this.hierarchyIndexMap.clear();
    this.representationResourceMap.clear();
    try {
      this.hierarchyIndexTree = JSON.parse(await import_promises.default.readFile(this.getHierarchyIndexFilePath(), { encoding: "utf-8" }));
      this.indexHierarchyNodeRecursive(this.hierarchyIndexTree);
    } catch (e) {
      this.logger.error(e);
      this.hierarchyIndexTree = { parent: null, children: {}, representations: {} };
    }
  }
  async saveHierarchyIndex(lock = true) {
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
      this.logger.error(e);
    } finally {
      if (hiLock) {
        hiLock.release();
      }
    }
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
    let result = true;
    const resourceFilePath = this.getResourceFilePath(resourceMetafile.data.id);
    const resourceDirectory = this.getResourceDirectory(resourceMetafile.data.id);
    if (resourceMetafile.hierarchy.parent_id) {
      if (!await this.resourceExists(resourceMetafile.hierarchy.parent_id)) {
        this.logger.error("Parent resource not found, cannot create resource");
        return false;
      }
      if (this.inChildren(resourceMetafile.data.id, resourceMetafile.hierarchy.parent_id)) {
        this.logger.error("Cyclic hierarchy detected, cannot create resource");
        return false;
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
          this.logger.error("Parent node not found, need full store reindex");
        }
      } else {
        this.hierarchyIndexTree.children[resourceMetafile.data.id] = node;
      }
      await this.saveHierarchyIndex(false);
    } catch (e) {
      this.logger.error(e);
      result = false;
    } finally {
      resLock.releaseAll();
    }
    return result;
  }
  async updateResourceMetafile(resourceId, patch, lock = true) {
    let result = true;
    let resourceMetafile = null;
    const resLock = lock ? await this.lockQueue.lock(resourceId) : void 0;
    try {
      if ("function" === typeof patch) {
        resourceMetafile = await this.getResourceMetafile(resourceId);
        if (resourceMetafile) {
          resourceMetafile = await patch(resourceMetafile);
        }
      } else {
        resourceMetafile = patch;
      }
      if (resourceMetafile) {
        resourceMetafile.data.updated_at = nowInMS();
        const resourceFilePath = this.getResourceFilePath(resourceId);
        await import_promises.default.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + "\n", {
          encoding: "utf-8",
          flag: "w"
        });
      } else {
        result = false;
      }
    } catch (e) {
      this.logger.error(e);
      result = false;
    } finally {
      if (resLock) {
        resLock.release();
      }
    }
    return result;
  }
  async updateResource(resourceMetafile) {
    let result = false;
    if (await this.resourceExists(resourceMetafile.data.id)) {
      const oldMetafile = await this.getResourceMetafile(resourceMetafile.data.id);
      if (!oldMetafile) {
        this.logger.error("Old metafile not found, cannot update resource");
        return false;
      }
      const resLock = await this.lockQueue.lock(resourceMetafile.data.id);
      try {
        resourceMetafile.representations = oldMetafile.representations;
        resourceMetafile.hierarchy.children = oldMetafile.hierarchy.children;
        resourceMetafile.hierarchy.parent_id = oldMetafile.hierarchy.parent_id;
        resourceMetafile.data.updated_at = nowInMS();
        resourceMetafile.data.is_deleted = false;
        await this.updateResourceMetafile(resourceMetafile.data.id, resourceMetafile, false);
      } catch (e) {
        this.logger.error(e);
        result = false;
      } finally {
        resLock.release();
      }
    }
    return result;
  }
  async getResourceMetafile(resourceId) {
    let result = null;
    let resourceFilePath = this.getResourceFilePath(resourceId);
    try {
      let content = await import_promises.default.readFile(resourceFilePath, { encoding: "utf-8" });
      result = JSON.parse(content);
    } catch (e) {
      this.logger.error(e);
    }
    return result;
  }
  async appendChild(resourceID, childID) {
    if (this.inChildren(childID, resourceID)) {
      this.logger.error("Cyclic hierarchy detected, cannot append child");
      return false;
    }
    let resourceNode = this.hierarchyIndexMap.get(resourceID);
    if (resourceNode) {
      if (resourceNode.children[childID]) {
        if (this.logger.warn) {
          this.logger.warn("Child already exists, cannot append child");
        }
        return true;
      }
    }
    let result = false;
    const resLock = await this.lockQueue.lockMany([resourceID, childID, HIERARCHY_LOCK_NAME]);
    try {
      const resourceEntity = await this.getResourceMetafile(resourceID);
      const childEntity = await this.getResourceMetafile(childID);
      if (resourceEntity && childEntity) {
        childEntity.hierarchy.parent_id = resourceID;
        resourceEntity.hierarchy.children = resourceEntity.hierarchy.children.concat({
          id: childID,
          order_index: childEntity.hierarchy.order_index
        }).sort((a, b) => a.order_index - b.order_index);
        result = await this.updateResourceMetafile(resourceID, resourceEntity, false) && await this.updateResourceMetafile(childID, childEntity, false);
        let childNode = this.hierarchyIndexMap.get(childID);
        if (resourceNode && childNode) {
          resourceNode.children[childID] = childNode;
          childNode.parent = resourceID;
          await this.saveHierarchyIndex(false);
        } else {
          this.logger.error("Resource or child node not found, need full store reindex");
        }
      }
    } catch (e) {
      this.logger.error(e);
      result = false;
    } finally {
      resLock.releaseAll();
    }
    return result;
  }
  async deleteResource(resourceId, recursive = false) {
    if (!await this.resourceExists(resourceId)) {
      return false;
    }
    let result = false;
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
      await this.deleteResourceFiles(resourceId);
      if (recursive) {
        for (const childId of childIds) {
          await this.deleteResourceFiles(childId);
          this.deleteFromIndex(childId);
        }
      } else {
        for (const childId of childIds) {
          await this.updateResourceMetafile(childId, async (resourceMetafile) => {
            resourceMetafile.hierarchy.parent_id = null;
            return resourceMetafile;
          }, false);
          let childNode = this.hierarchyIndexMap.get(childId);
          if (childNode) {
            childNode.parent = null;
            this.hierarchyIndexTree.children[childId] = childNode;
          } else {
            this.logger.error("Child node not found, need full store reindex");
          }
        }
      }
      if (parentId) {
        await this.updateResourceMetafile(parentId, async (resourceMetafile) => {
          resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter((value) => value.id !== resourceId);
          resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
          return resourceMetafile;
        }, false);
      }
      this.deleteFromIndex(resourceId);
      await this.saveHierarchyIndex(false);
      result = true;
    } catch (e) {
      this.logger.error(e);
    } finally {
      resLock.releaseAll();
    }
    return result;
  }
  async deleteResourceFiles(resourceId) {
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
    } catch (_e) {
    }
  }
  async resourceExists(resourceId) {
    const resourceFilePath = this.getResourceFilePath(resourceId);
    let result = false;
    result = await import_promises.default.access(resourceFilePath).then(() => true).catch(() => false);
    return result;
  }
  async changeParent(resourceId, newParentId) {
    let result = false;
    let lockList = [resourceId, HIERARCHY_LOCK_NAME];
    const oldParentId = this.hierarchyIndexMap.get(resourceId)?.parent || null;
    if (oldParentId === newParentId) {
      return true;
    }
    if (oldParentId) {
      lockList.push(oldParentId);
    }
    if (newParentId) {
      if (this.inChildren(resourceId, newParentId)) {
        this.logger.error("Cyclic hierarchy detected, cannot change parent");
        return false;
      }
      lockList.push(newParentId);
    }
    const resLock = await this.lockQueue.lockMany(lockList);
    try {
      let node = this.hierarchyIndexMap.get(resourceId);
      if (node) {
        node.parent = newParentId;
      } else {
        this.logger.error("Old parent node not found, need full store reindex");
      }
      if (oldParentId) {
        const oldParentNode = this.hierarchyIndexMap.get(oldParentId);
        if (oldParentNode) {
          delete oldParentNode.children[resourceId];
        } else {
          this.logger.error("Old parent node not found, need full store reindex");
        }
        await this.updateResourceMetafile(oldParentId, async (resourceMetafile) => {
          resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter((value) => value.id !== resourceId);
          resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
          return resourceMetafile;
        }, false);
      }
      if (newParentId) {
        let parentNode = this.hierarchyIndexMap.get(newParentId);
        if (parentNode) {
          if (node) {
            parentNode.children[resourceId] = node;
          }
        } else {
          this.logger.error("New parent node not found, need full store reindex");
        }
        await this.updateResourceMetafile(newParentId, async (resourceMetafile) => {
          resourceMetafile.hierarchy.children.push({
            id: resourceId,
            order_index: 0
          });
          resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
          return resourceMetafile;
        }, false);
      }
      await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
        resourceMetafile.hierarchy.parent_id = newParentId;
        resourceMetafile.hierarchy.order_index = 0;
        return resourceMetafile;
      }, false);
      await this.saveHierarchyIndex(false);
      result = true;
    } catch (e) {
      this.logger.error(e);
    } finally {
      resLock.releaseAll();
    }
    return result;
  }
  async changeOrderIndex(resourceId, newOrderIndex) {
    if (!await this.resourceExists(resourceId)) {
      return false;
    }
    let lockList = [resourceId];
    const parentId = this.hierarchyIndexMap.get(resourceId)?.parent || null;
    if (parentId) {
      lockList.push(parentId);
    }
    let result = false;
    const lock = await this.lockQueue.lockMany(lockList);
    try {
      result = await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
        resourceMetafile.hierarchy.order_index = newOrderIndex;
        return resourceMetafile;
      }, false);
      if (parentId) {
        result = await this.updateResourceMetafile(parentId, async (resourceMetafile) => {
          for (const child of resourceMetafile.hierarchy.children) {
            if (child.id === resourceId) {
              child.order_index = newOrderIndex;
            }
          }
          resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index);
          return resourceMetafile;
        }, false);
      }
      await this.saveHierarchyIndex(false);
    } catch (e) {
      this.logger.error(e);
    } finally {
      lock.releaseAll();
    }
    return result;
  }
  async createRepresentation(resourceId, representationEntity) {
    const lock = await this.lockQueue.lock(resourceId);
    const isPrimary = representationEntity.data.is_primary;
    try {
      const notTimeInMs = nowInMS();
      representationEntity.data.created_at = notTimeInMs;
      representationEntity.data.updated_at = notTimeInMs;
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
          representationEntity.data.id + "." + representationEntity.data.extension
        );
        await import_promises.default.utimes(filePath, notTimeInMs, notTimeInMs);
      }
      let resourceMetafile = await this.getResourceMetafile(resourceId);
      if (resourceMetafile) {
        resourceMetafile.representations.push(representationEntity);
        if (isPrimary) {
          for (const rep of resourceMetafile.representations) {
            rep.data.is_primary = rep.data.id === representationEntity.data.id;
          }
        }
        await this.updateResourceMetafile(resourceId, resourceMetafile);
      } else {
        this.logger.error("Resource not found, cannot create representation");
      }
    } catch (e) {
      this.logger.error(e);
    } finally {
      lock.release();
    }
    return false;
  }
  async uploadRepresentationPart(representationId, chunk, offset = 0, length = void 0) {
    let report = {
      status: false,
      resourceId: null,
      isComplete: false,
      data: null
    };
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      report.resourceId = resourceId;
      const lock = await this.lockQueue.lock(resourceId);
      try {
        let resourceMetafile = await this.getResourceMetafile(resourceId);
        if (resourceMetafile) {
          let representation = resourceMetafile.representations.find((value) => value.data.id === representationId) || null;
          if (representation) {
            report.isComplete = !representation.data.uploading;
            report.data = representation.info.data;
            if (!representation.data.is_external) {
              const filePath = import_node_path.default.join(
                this.getResourceDirectory(resourceId),
                representation.data.id + "." + representation.data.extension
              );
              const fileHandler = await import_promises.default.open(filePath, "w");
              await fileHandler.write(chunk, offset, length);
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
              if (newParts[0].lower === 0 && newParts[0].upper === representation.info.data?.assumedSize) {
                representation.data.uploading = false;
                const filetype = await (0, import_file_type.fileTypeFromFile)(filePath);
                representation.data.mime = filetype?.mime || null;
                if (filetype?.ext && representation.data.extension !== filetype.ext) {
                  representation.data.extension = filetype.ext || null;
                  const newFilePath = import_node_path.default.join(
                    this.getResourceDirectory(resourceId),
                    representation.data.id + "." + representation.data.extension
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
              report.status = await this.updateResourceMetafile(resourceId, resourceMetafile);
            }
          }
        }
      } catch (e) {
        this.logger.error(e);
      } finally {
        lock.release();
      }
    }
    return report;
  }
  async finishRepresentationUpload(representationId) {
    let result = false;
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      const lock = await this.lockQueue.lock(resourceId);
      try {
        let resourceMetafile = await this.getResourceMetafile(resourceId);
        if (resourceMetafile) {
          let representation = resourceMetafile.representations.find((value) => value.data.id === representationId) || null;
          if (representation) {
            if (!representation.data.is_external) {
              const filePath = import_node_path.default.join(
                this.getResourceDirectory(resourceId),
                representation.data.id + "." + representation.data.extension
              );
              representation.data.uploading = false;
              const filetype = await (0, import_file_type.fileTypeFromFile)(filePath);
              representation.data.mime = filetype?.mime || null;
              if (filetype?.ext && representation.data.extension !== filetype.ext) {
                representation.data.extension = filetype.ext || null;
                const newFilePath = import_node_path.default.join(
                  this.getResourceDirectory(resourceId),
                  representation.data.id + "." + representation.data.extension
                );
                await import_promises.default.rename(filePath, newFilePath);
              }
              representation.info.data = {};
              await this.updateResourceMetafile(resourceId, resourceMetafile);
            }
          }
        }
      } catch (e) {
        this.logger.error(e);
      } finally {
        lock.release();
      }
    }
    return result;
  }
  async makeRepresentationPrimary(resourceId, representationId) {
    let node = this.hierarchyIndexMap.get(resourceId);
    if (node && node.representations[representationId]) {
      for (const repId in node.representations) {
        node.representations[repId] = repId === representationId;
      }
      await this.saveHierarchyIndex(false);
    } else {
      return false;
    }
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (const representation of resourceMetafile.representations) {
        representation.data.is_primary = representation.data.id === representationId;
      }
      return resourceMetafile;
    });
  }
  async deleteRepresentation(representationId) {
    let result = false;
    const resourceId = this.representationResourceMap.get(representationId);
    if (resourceId) {
      const lock = await this.lockQueue.lock(resourceId);
      try {
        let resourceMetafile = await this.getResourceMetafile(resourceId);
        if (resourceMetafile) {
          for (let i = 0; i < resourceMetafile.representations.length; i++) {
            const representation = resourceMetafile.representations[i];
            if (representation.data.id === representationId) {
              resourceMetafile.representations.splice(i, 1);
              if (!representation.data.is_external) {
                const filePath = import_node_path.default.join(
                  this.getResourceDirectory(resourceId),
                  representation.data.id + "." + representation.data.extension
                );
                await import_promises.default.rm(filePath, { force: true });
              }
              break;
            }
          }
          result = true;
        }
      } catch (e) {
        this.logger.error(e);
      } finally {
        lock.release();
      }
    }
    return result;
  }
  async deleteMarks(resourceId, marks) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (let i = 0; i < resourceMetafile.marks.length; i++) {
        const mark = resourceMetafile.marks[i];
        if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
          resourceMetafile.marks.splice(i, 1);
        }
      }
      return resourceMetafile;
    });
  }
  async deleteResourceKV(resourceId, componentKeys) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (const component in componentKeys) {
        if (componentKeys.hasOwnProperty(component)) {
          for (const key in componentKeys[component]) {
            if (componentKeys[component].hasOwnProperty(key)) {
              delete resourceMetafile.kv[component][key];
            }
          }
        }
      }
      return resourceMetafile;
    });
  }
  async setMarks(resourceId, marks) {
    return await this.updateResourceMetafile(resourceId, async (resourceMetafile) => {
      for (let i = 0; i < resourceMetafile.marks.length; i++) {
        const mark = resourceMetafile.marks[i];
        if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
          resourceMetafile.marks.splice(i, 1);
        }
      }
      resourceMetafile.marks.push(...marks);
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
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        await trx.insert({
          ...resourceEntity.data,
          created_at: nowInMS(),
          updated_at: nowInMS()
        }).into(RESOURCE_DATA_TABLE);
        await trx.insert({
          ...resourceEntity.info,
          id: resourceEntity.data.id
        }).into(RESOURCE_INFO_TABLE);
        await trx.insert({
          ...resourceEntity.hierarchy,
          id: resourceEntity.data.id
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
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async resourceExists(resourceId) {
    return !!await this.db(RESOURCE_DATA_TABLE).where("id", resourceId).first();
  }
  async appendChild(resourceId, childID) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        await trx.update({
          parent_id: resourceId
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: childID
        });
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async changeParent(resourceId, newParentId) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        await trx.update({
          parent_id: newParentId
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: resourceId
        });
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async changeOrderIndex(resourceId, newOrderIndex) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        await trx.update({
          order_index: newOrderIndex
        }).from(RESOURCE_HIERARCHY_TABLE).where({
          id: resourceId
        });
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        trx.rollback();
        this.logger.error(e);
      }
    });
    return result;
  }
  async updateRepresentationInfo(representationId, info) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        });
        if (representationRecord) {
          await trx.update({
            data: info.data
          }).from(REPRESENTATION_INFO_TABLE).where({
            id: representationId
          });
          await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
        trx.commit();
        result = true;
      } catch (e) {
        trx.rollback();
        this.logger.error(e);
      }
    });
    return result;
  }
  async createRepresentation(resourceId, representationEntity) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
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
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async updateRepresentation(representationId, representationEntity) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        });
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
            data: representationEntity.info.data
          }).from(REPRESENTATION_INFO_TABLE).where({
            id: representationId
          });
          await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
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
    await this.db(RESOURCE_DATA_TABLE).where("id", resourceId).delete();
    return true;
  }
  async deleteRepresentation(representationId) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        const representationRecord = await trx.select().from(REPRESENTATION_DATA_TABLE).where({
          id: representationId
        });
        if (representationRecord) {
          await trx.delete().from(REPRESENTATION_DATA_TABLE).where({ id: representationId });
          await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id });
        }
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async deleteMarks(resourceId, marks) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        for (const mark of marks) {
          await trx.delete().from(MARK_DATA_TABLE).where({
            resource_id: resourceId,
            name: mark.name,
            type: mark.type
          });
        }
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async deleteResourceKV(resourceId, componentKeys) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
        for (const component in componentKeys) {
          for (const attribute in componentKeys[component]) {
            await trx.delete().from(MARK_KV_TABLE).where({
              resource_id: resourceId,
              component,
              attribute
            });
          }
        }
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async setMarks(resourceId, marks) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
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
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async setResourceKV(resourceId, componentKeys) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
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
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async makeRepresentationPrimary(resourceId, representationId) {
    let result = false;
    await this.db.transaction(async (trx) => {
      try {
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
        await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId });
        trx.commit();
        result = true;
      } catch (e) {
        this.logger.error(e);
        trx.rollback();
      }
    });
    return result;
  }
  async deleteAllRecords() {
    await this.db(RESOURCE_DATA_TABLE).delete();
    return true;
  }
  getMarkListByType(type) {
    return this.db(MARK_DATA_TABLE).where({ type }).groupBy("name").select("name", this.db.raw("count(resource_id) as resources"));
  }
};

// src/core/Namer.ts
var Namer = class {
  generateResourceId() {
    return "";
  }
  generateRepresentationId() {
    return "";
  }
};

// src/core/Core.ts
var Core = class extends import_node_events.EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.namer = new Namer();
    this.logger = config.logger;
    this.db = (0, import_knex.default)(config.db.connection);
    this.migrationManager = new DBSchemeManager(this.db, config.logger);
    this.fsManager = new FsManager(config.storage, config.logger);
    this.dbManager = new DbManager(this.db, config.db, config.logger, (resourceId) => this.fsManager.getPath(resourceId));
  }
  db;
  migrationManager;
  fsManager;
  dbManager;
  namer;
  logger;
  async init() {
    await this.migrationManager.init(this.config.db.initMigration);
    await this.fsManager.init();
  }
  async dbFullDrop() {
    await this.migrationManager.fullDrop();
    this.emit(ON_DB_FULL_DROP_EVENT, this);
  }
  async applyDbSchemePatch(id, patch) {
    return await this.migrationManager.applySchemePatch(id, patch);
  }
  async rollbackDbSchemePatch(id, patch) {
    return await this.migrationManager.rollbackSchemePatch(id, patch);
  }
  async createResource({ info, data = {}, hierarchy = {}, marks = [], kv = {} }) {
    let result = false;
    if (!hierarchy?.parent_id || await this.dbManager.resourceExists(hierarchy.parent_id)) {
      const resourceId = this.namer.generateResourceId();
      const resourceEntity = {
        data: {
          id: resourceId,
          hidden: data?.hidden || false,
          locked: data?.locked || false,
          is_deleted: false,
          created_at: nowInMS(),
          updated_at: nowInMS()
        },
        hierarchy: {
          path: [],
          parent_id: hierarchy?.parent_id || null,
          order_index: hierarchy?.order_index || 0,
          children: []
        },
        info: {
          title: info.title,
          description: info.description || null
        },
        representations: [],
        marks,
        kv
      };
      let resultMetafile = await this.fsManager.createResourceMetafile(
        this.fsManager.resourceDTEToMetafile(resourceEntity)
      );
      if (resultMetafile) {
        resourceEntity.hierarchy.path = this.fsManager.getPath(resourceEntity.data.id);
        await this.dbManager.createResourceRecord(resourceEntity);
        if (hierarchy?.parent_id) {
          await this.fsManager.appendChild(hierarchy.parent_id, resourceId);
          await this.dbManager.appendChild(hierarchy.parent_id, resourceId);
        }
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
    return result;
  }
  async createRepresentation(resourceId, { data, infoData = null, source = {} }) {
    let result = null;
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
          created_at: nowInMS(),
          updated_at: nowInMS(),
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
      if (await this.fsManager.createRepresentation(resourceId, representationEntity)) {
        await this.dbManager.createRepresentation(resourceId, representationEntity);
        if (data.is_primary) {
          await this.makeRepresentationPrimary(resourceId, representationId);
        }
        result = representationEntity;
        this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representationEntity);
      }
    }
    return result;
  }
  async makeRepresentationPrimary(resourceId, representationId) {
    let result = await this.fsManager.makeRepresentationPrimary(resourceId, representationId);
    if (result) {
      await this.dbManager.makeRepresentationPrimary(resourceId, representationId);
    }
    return false;
  }
  async deleteResource(id) {
    let result = await this.fsManager.deleteResource(id);
    if (result) {
      await this.dbManager.deleteResource(id);
    }
    return result;
  }
  async deleteRepresentation(id) {
    let result = await this.fsManager.deleteRepresentation(id);
    if (result) {
      await this.dbManager.deleteRepresentation(id);
    }
    return result;
  }
  async deleteMark(id, marks) {
    let result = await this.fsManager.deleteMarks(id, marks);
    if (result) {
      await this.dbManager.deleteMarks(id, marks);
    }
    return result;
  }
  async deleteResourceKV(id, componentKeys) {
    let result = await this.fsManager.deleteResourceKV(id, componentKeys);
    if (result) {
      await this.dbManager.deleteResourceKV(id, componentKeys);
    }
    return result;
  }
  // update methods
  async setMarks(resourceId, marks) {
    let result = await this.fsManager.setMarks(resourceId, marks);
    if (result) {
      await this.dbManager.setMarks(resourceId, marks);
    }
    return result;
  }
  async setResourceKV(resourceId, componentKeys) {
    let result = await this.fsManager.setResourceKV(resourceId, componentKeys);
    if (result) {
      await this.dbManager.setResourceKV(resourceId, componentKeys);
    }
    return result;
  }
  // TODO upload methods
  async uploadRepresentationPart(representationId, chunk, offset = 0, length = void 0) {
    let report = await this.fsManager.uploadRepresentationPart(representationId, chunk, offset, length);
    if (report.status) {
      await this.dbManager.updateRepresentationInfo(representationId, { data: report.data });
    }
    return report;
  }
  async finishRepresentationUpload(representationId) {
    let result = await this.fsManager.finishRepresentationUpload(representationId);
    if (result) {
      const resourceId = this.fsManager.getResourceIdByRepresentationId(representationId);
      if (resourceId) {
        const resourceMetafile = await this.fsManager.getResourceMetafile(resourceId);
        if (resourceMetafile) {
          let representation = null;
          for (const repItem of resourceMetafile.representations) {
            if (repItem.data.id === representationId) {
              representation = repItem;
              break;
            }
          }
          if (representation) {
            await this.dbManager.updateRepresentation(representationId, representation);
          }
        }
      }
    }
    return result;
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
  async getMarkListByType(type) {
    return await this.dbManager.getMarkListByType(type);
  }
  // TODO full rescan
  async fullRescan(reportCallback) {
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
  }
  createResource(factoryData) {
    return this.api.createResource(factoryData);
  }
  createRepresentation(resourceId, factoryData) {
    return this.api.createRepresentation(resourceId, factoryData);
  }
  makeRepresentationPrimary(resourceId, id) {
    return this.api.makeRepresentationPrimary(resourceId, id);
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
  async getMarkListByType(type) {
    return await this.api.getMarkListByType(type);
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