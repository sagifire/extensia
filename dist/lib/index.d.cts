import { Knex } from 'knex';
import { EventEmitter } from 'node:events';

interface ExtensiaConfig {
    db: {
        connection: Knex.Config;
        initMigration?: boolean;
    };
    storage: {
        root: string;
    };
    plugins?: PluginConstructor[];
    logger?: ILogger;
}
interface ExtensiaConfigInternal extends ExtensiaConfig {
    db: {
        connection: Knex.Config;
        initMigration: boolean;
    };
}
declare class Config implements ExtensiaConfig {
    readonly db: ExtensiaConfigInternal['db'];
    readonly storage: ExtensiaConfigInternal['storage'];
    readonly plugins: PluginConstructor[];
    readonly logger: ILogger;
    constructor(initConfig: ExtensiaConfig);
}

declare const Codes: {
    THROWN_EXCEPTION: string;
    THROWN_UNKNOWN: string;
    INVALID_ERROR_CODE: string;
    CONFLICT: string;
    CANNOT_ROLLBACK: string;
    CANNOT_APPLY: string;
    BROKEN_INDEX: string;
    PARENT_NOT_FOUND: string;
    INVALID_DATA: string;
    NOT_FOUND: string;
};
type ErrorCode = keyof typeof Codes;

declare class Context<T = undefined> {
    protected resultValue: T;
    protected statusValue: boolean;
    protected errorMessage: string | undefined;
    protected errorCodeValue: ErrorCode | undefined;
    protected errorInfoData: Record<string, unknown>;
    scope: Record<string, unknown>;
    constructor(...args: [T] extends [undefined] ? [] : [init: T]);
    isSuccess(): boolean;
    isFailed(): boolean;
    set status(newStatus: boolean);
    get status(): boolean;
    get result(): T;
    set result(newResult: T);
    $cast<T>(): Context<T>;
    setupResult<X>(result: X): Context<X>;
    get error(): string | undefined;
    get errorCode(): ErrorCode | undefined;
    get errorInfo(): Record<string, unknown>;
    setError(code: ErrorCode, placeholders?: Record<string, string | number>, info?: Record<string, unknown>): void;
    apply<X>(ctx: Context<X>): this;
    applyResult<X>(ctx: Context<X>): Context<X>;
    applyException(err: Error | unknown): this;
}
type PromisedContext<T = void> = Promise<Context<T>>;

declare class DBSchemeManager implements IInitiable {
    protected readonly db: Knex;
    protected readonly logger: ILogger;
    protected appliedPatches: string[];
    protected readonly genericPatches: Record<string, DBSchemePatch>;
    constructor(db: Knex, logger: ILogger);
    init(applyGeneric?: boolean): PromisedContext;
    applySchemePatch(id: string, patch: DBSchemePatch): PromisedContext;
    rollbackSchemePatch(id: string, patch: DBSchemePatch): PromisedContext;
    getOrInitAppliedPatchesList(): PromisedContext<string[]>;
    fullDrop(): PromisedContext;
}

type Releaser = () => void;
interface AcquireOptions {
    timeoutMs?: number;
    signal?: AbortSignal;
}
/**
 * A queue of asynchronous locks by key (e.g., file ID).
 * Guarantees FIFO for each key.
 */
declare class AsyncLockQueue<K = string> {
    private queues;
    private holders;
    /**
     * Grab the lock with the key.
     * Returns the release() function, which MUST be called in finally.
     */
    lock(key: K, opts?: AcquireOptions): Promise<{
        release: Releaser;
    }>;
    /**
     * Perform an asynchronous action under lock.
     */
    withLock<T>(key: K, fn: () => Promise<T>, opts?: AcquireOptions): Promise<T>;
    /**
     * Capture multiple keys at once, without deadlocks:
     * keys are ordered globally (String(key)).
     */
    lockMany(keys: K[], opts?: AcquireOptions): Promise<{
        releaseAll: () => void;
    }>;
    /**
     * A convenient option for multiple keys.
     */
    withLocks<T>(keys: K[], fn: () => Promise<T>, opts?: AcquireOptions): Promise<T>;
    private ensureQueue;
    private waitTurn;
}

type HierarchyNode = {
    parent: IDString | null;
    children: Record<IDString, HierarchyNode>;
    representations: Record<IDString, boolean>;
};
declare class FsManager implements IInitiable {
    protected readonly config: Config['storage'];
    protected readonly logger: ILogger;
    protected absoluteRoot: string;
    protected lockQueue: AsyncLockQueue<IDString>;
    protected hierarchyIndexTree: HierarchyNode;
    protected hierarchyIndexMap: Map<IDString, HierarchyNode>;
    protected representationResourceMap: Map<IDString, IDString>;
    constructor(config: Config['storage'], logger: ILogger);
    init(): PromisedContext;
    protected getHierarchyIndexFilePath(): string;
    protected indexHierarchyNodeRecursive(node: HierarchyNode): void;
    protected initHierarchyIndex(): PromisedContext;
    protected saveHierarchyIndex(lock?: boolean): PromisedContext;
    getPath(id: IDString): string[];
    getResourceIdByRepresentationId(representationId: IDString): IDString | null;
    resourceMetafileToDTE(resourceMetafile: IResourceMetafile): IResourceDTE;
    resourceDTEToMetafile(resourceEntity: IResourceDTE): IResourceMetafile;
    protected inChildren(id: IDString, needle: IDString): boolean;
    protected getAllChildIds(id: IDString): IDString[];
    protected deleteFromIndex(id: IDString): void;
    getResourceDirectory(id: IDString): string;
    getResourceFilePath(id: IDString): string;
    createResourceMetafile(resourceMetafile: IResourceMetafile): PromisedContext;
    protected updateResourceMetafile(resourceId: IDString, patch: IResourceMetafile | ((resourceMetafile: IResourceMetafile) => Promise<IResourceMetafile>), lock?: boolean): PromisedContext;
    updateResource(resourceMetafile: IResourceMetafile): PromisedContext;
    getResourceMetafile(resourceId: IDString): PromisedContext<IResourceMetafile | null>;
    appendChild(resourceID: IDString, childID: IDString): PromisedContext;
    deleteResource(resourceId: IDString, recursive?: boolean): PromisedContext;
    protected deleteResourceFiles(resourceId: IDString): PromisedContext;
    resourceExists(resourceId: IDString): Promise<boolean>;
    changeParent(resourceId: IDString, newParentId: IDString | null): PromisedContext;
    changeOrderIndex(resourceId: IDString, newOrderIndex: number): PromisedContext;
    createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): PromisedContext;
    uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset?: number, length?: number | undefined): PromisedContext<IUploadingPartReport>;
    finishRepresentationUpload(representationId: IDString): PromisedContext;
    makeRepresentationPrimary(resourceId: IDString, representationId: IDString, lock?: boolean): PromisedContext;
    deleteRepresentation(representationId: IDString): PromisedContext;
    deleteMarks(resourceId: IDString, marks: IMarkParam[]): PromisedContext;
    deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
    setMarks(resourceId: IDString, marks: IMarkParam[]): PromisedContext;
    setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
}

declare class DbManager {
    protected readonly db: Knex;
    protected readonly config: Config['db'];
    protected readonly logger: ILogger;
    protected readonly getPaths: (resourceId: IDString) => string[];
    constructor(db: Knex, config: Config['db'], // reserved
    logger: ILogger, getPaths: (resourceId: IDString) => string[]);
    createResourceRecord(resourceEntity: IResourceDTE): PromisedContext;
    resourceExists(resourceId: IDString): Promise<boolean>;
    appendChild(resourceId: IDString, childID: IDString): PromisedContext;
    changeParent(resourceId: IDString, newParentId: IDString | null): PromisedContext;
    changeOrderIndex(resourceId: IDString, newOrderIndex: number): PromisedContext;
    updateRepresentationInfo(representationId: IDString, info: IRepresentationInfoDTC): PromisedContext;
    createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): PromisedContext;
    updateRepresentation(representationId: IDString, representationEntity: IRepresentationDTE): PromisedContext;
    representationExists(representationID: IDString): Promise<boolean>;
    markExists(resourceId: IDString, name: string, type: string): Promise<boolean>;
    resourceKVExists(resourceId: IDString, component: string, attribute: string): Promise<boolean>;
    deleteResource(resourceId: IDString): PromisedContext;
    deleteRepresentation(representationId: IDString): PromisedContext;
    deleteMarks(resourceId: IDString, marks: {
        name: string;
        type: string;
    }[]): PromisedContext;
    deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
    setMarks(resourceId: IDString, marks: {
        name: string;
        type: string;
        value: number | null;
    }[]): PromisedContext;
    setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
    makeRepresentationPrimary(resourceId: IDString, representationId: IDString): PromisedContext;
    deleteAllRecords(): PromisedContext;
    getMarkStatListByType(type: string): PromisedContext<{
        name: string;
        resources: number;
        min_value: number;
        max_value: number;
    }[]>;
    getMarkList(): PromisedContext<Record<string, string[]>>;
    findResourceById(resourceId: IDString): PromisedContext<IResourceDTE | undefined>;
    findResources(criteria: {
        data?: {
            id?: IDString;
        };
        hierarchy?: {
            parent_id?: IDString;
            order?: 'asc' | 'desc';
        };
        representation?: {
            id?: IDString;
            type?: string;
            role?: string;
            mime?: string;
            extension?: string;
            is_external?: boolean;
            is_primary?: boolean;
            uploading?: boolean;
        };
        mark?: IMarkCriteria;
        limit?: number;
        offset?: number;
    }): PromisedContext<IResourceDTE[]>;
}

declare class Namer {
    generateResourceId(): IDString;
    generateRepresentationId(): IDString;
}

declare class Core extends EventEmitter {
    readonly config: Config;
    readonly db: Knex;
    protected readonly migrationManager: DBSchemeManager;
    readonly fsManager: FsManager;
    readonly dbManager: DbManager;
    readonly namer: Namer;
    readonly logger: ILogger;
    constructor(config: Config);
    init(): Promise<void>;
    dbFullDrop(): PromisedContext;
    applyDbSchemePatch(id: string, patch: DBSchemePatch): PromisedContext;
    rollbackDbSchemePatch(id: string, patch: DBSchemePatch): PromisedContext;
    createResource({ info, data, hierarchy, marks, kv }: {
        info: {
            title: string;
            description?: string | null;
        };
        data?: {
            locked?: boolean;
            hidden?: boolean;
        };
        hierarchy?: {
            parent_id?: IDString | null;
            order_index?: number;
        };
        marks?: IMarkParam[];
        kv?: IResourceKV;
    }): PromisedContext<IDString | null>;
    appendChild(parentId: IDString, childId: IDString): PromisedContext;
    createRepresentation(resourceId: IDString, { data, infoData, source }: {
        data: {
            type: string;
            role: string;
            is_external: boolean;
            is_primary: boolean;
        };
        source?: {
            url?: string | null;
            derived_from?: IDString | null;
        };
        infoData?: Record<string, unknown> | null;
    }): PromisedContext<IDString | null>;
    makeRepresentationPrimary(resourceId: IDString, representationId: IDString): PromisedContext;
    deleteResource(id: IDString): PromisedContext;
    deleteRepresentation(id: IDString): PromisedContext;
    deleteMark(id: IDString, marks: {
        name: string;
        type: string;
    }[]): PromisedContext;
    deleteResourceKV(id: IDString, componentKeys: IResourceKV): PromisedContext;
    setMarks(resourceId: IDString, marks: {
        name: string;
        type: string;
        value: number | null;
    }[]): PromisedContext;
    setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
    uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset?: number, length?: number | undefined): PromisedContext<IUploadingPartReport>;
    finishRepresentationUpload(representationId: IDString): PromisedContext;
    resourceExists(id: IDString): Promise<boolean>;
    representationExists(id: IDString): Promise<boolean>;
    markExists(id: IDString, name: string, type: string): Promise<boolean>;
    resourceKVExists(id: IDString, component: string, attribute: string): Promise<boolean>;
    getMarkStatListByType(type: string): PromisedContext<{
        name: string;
        resources: number;
    }[]>;
    getMarkList(): PromisedContext<Record<string, string[]>>;
    findResourceById(id: IDString): PromisedContext<IResourceDTE | undefined>;
    findResources(criteria: {
        data?: {
            id?: IDString;
        };
        hierarchy?: {
            parent_id?: IDString;
            order?: 'asc' | 'desc';
        };
        representation?: {
            id?: IDString;
            type?: string;
            role?: string;
            mime?: string;
            extension?: string;
            is_external?: boolean;
            is_primary?: boolean;
            uploading?: boolean;
        };
        mark?: IMarkCriteria;
        limit?: number;
        offset?: number;
    }): PromisedContext<IResourceDTE[]>;
    fullRescan(reportCallback: (report: {
        resources: number;
        representations: number;
    }) => Promise<void>): PromisedContext;
}

type IDString = string;
type Timestamp = number;
interface IRepresentationDataDTC {
    id: IDString;
    type: string;
    role: string;
    mime: string | null;
    extension: string | null;
    is_external: boolean;
    is_primary: boolean;
    uploading: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
}
interface IRepresentationSourceDTC {
    url: string | null;
    derived_from: IDString | null;
}
interface IRepresentationInfoDTC {
    data: Record<string, unknown> | null;
}
interface IRepresentationDTE {
    data: IRepresentationDataDTC;
    source: IRepresentationSourceDTC;
    info: IRepresentationInfoDTC;
}
interface IMarkData {
    name: string;
    type: string;
    value: number | null;
}
interface IResourceKV {
    [key: string]: {
        [key: string]: string;
    };
}
interface IResourceDataDTC {
    id: IDString;
    created_at: Timestamp;
    updated_at: Timestamp;
    locked: boolean;
    hidden: boolean;
    is_deleted: boolean;
}
interface IResourceInfoDTC {
    title: string;
    description: string | null;
}
interface IResourceHierarchyDTC {
    parent_id: IDString | null;
    path: string[];
    order_index: number;
    children: {
        id: IDString;
        order_index: number;
    }[];
}
interface IResourceDTE {
    data: IResourceDataDTC;
    info: IResourceInfoDTC;
    hierarchy: IResourceHierarchyDTC;
    representations: IRepresentationDTE[];
    marks: IMarkData[];
    kv: IResourceKV;
}
interface IResourceHierarchyMetaComponent {
    parent_id: IDString | null;
    order_index: number;
    children: {
        id: IDString;
        order_index: number;
    }[];
}
interface IResourceMetafile {
    data: IResourceDataDTC;
    info: IResourceInfoDTC;
    hierarchy: IResourceHierarchyMetaComponent;
    representations: IRepresentationDTE[];
    marks: IMarkData[];
    kv: IResourceKV;
}
interface IResourceComponentsIndex {
    id: IDString;
    hierarchy: IResourceHierarchyDTC;
    representations: {
        [key: IDString]: true;
    };
    marks: {
        [key: string]: true;
    };
    kv: {
        [key: string]: true;
    };
}
interface IMarkParam {
    name: string;
    type: string;
    value?: number | null;
}
declare const APPLY_PATCH_TABLE = "applied_patches";
declare const RESOURCE_DATA_TABLE = "resource_data";
declare const RESOURCE_INFO_TABLE = "resource_info";
declare const RESOURCE_HIERARCHY_TABLE = "resource_hierarchy";
declare const REPRESENTATION_DATA_TABLE = "representation_data";
declare const REPRESENTATION_SOURCE_TABLE = "representation_source";
declare const REPRESENTATION_INFO_TABLE = "representation_info";
declare const MARK_DATA_TABLE = "mark_data";
declare const MARK_KV_TABLE = "mark_kv";
interface AppliedPatchRecord {
    id: string;
    on_create: Timestamp;
}
interface IResourceDataRecord extends IResourceDataDTC {
}
interface IResourceInfoRecord extends IResourceInfoDTC {
    id: IDString;
}
interface IResourceHierarchyRecord {
    id: IDString;
    parent_id: IDString | null;
    order_index: number;
}
interface IRepresentationDataRecord extends IRepresentationDataDTC {
    resource_id: IDString;
    created_at: number;
    updated_at: number;
    role: string;
    mime: string | null;
    extension: string | null;
    is_external: boolean;
    is_primary: boolean;
    uploading: boolean;
}
interface IRepresentationSourceRecord extends IRepresentationSourceDTC {
    id: IDString;
    url: string | null;
    derived_from: IDString | null;
}
interface IRepresentationInfoRecord {
    id: IDString;
    data: null | Record<string, unknown>;
}
interface IMarkDataRecord extends IMarkData {
    resource_id: IDString;
}
interface IMarkKVRecord {
    resource_id: IDString;
    component: string;
    attribute: string;
    value: string;
}
type CriteriaConditionOperator = '<' | '<=' | '>=' | '>' | '=' | '!=' | '<>';
interface IMarkItemCriteria {
    name: string;
    type: string;
    value?: number | null | [CriteriaConditionOperator, number] | [number, number] | 'not null';
}
type IMarkCriteria = IMarkItemCriteria | IMarkItemCriteria[] | Array<IMarkItemCriteria | IMarkItemCriteria[]>;
type DBSchemePatch = (db: Knex) => Promise<boolean>;
interface IPlugin {
    init(): PromisedContext;
}
type PluginConstructor = (new (api: Core) => IPlugin) & {
    name: string;
};
declare const ON_CORE_INIT_EVENT = "on_core_init";
declare const ON_PLUGIN_INIT_EVENT = "on_plugin_init";
declare const ON_STARTED_EVENT = "on_started";
declare const ON_RESOURCE_CREATED_EVENT = "on_resource_created";
declare const ON_RESOURCE_UPDATED_EVENT = "on_resource_updated";
declare const ON_RESOURCE_DELETED_EVENT = "on_resource_deleted";
declare const ON_REPRESENTATION_CREATED_EVENT = "on_representation_created";
declare const ON_REPRESENTATION_UPDATED_EVENT = "on_representation_updated";
declare const ON_REPRESENTATION_DELETED_EVENT = "on_representation_deleted";
declare const ON_MARK_CREATED_EVENT = "on_mark_created";
declare const ON_MARK_UPDATED_EVENT = "on_mark_updated";
declare const ON_MARK_DELETED_EVENT = "on_mark_deleted";
declare const ON_RESOURCE_KV_CREATED_EVENT = "on_resource_kv_created";
declare const ON_RESOURCE_KV_UPDATED_EVENT = "on_resource_kv_updated";
declare const ON_RESOURCE_KV_DELETED_EVENT = "on_resource_kv_deleted";
declare const ON_DB_FULL_DROP_EVENT = "on_db_full_drop";
declare const ON_DB_CLEAN_EVENT = "on_db_clean";
declare const ON_FULL_RESCAN = "on_full_rescan";
interface ILogger {
    log: (...messages: any[]) => void;
    error: (...messages: any[]) => void;
    info: (...messages: any[]) => void;
    warn?: (...messages: any[]) => void;
    debug?: (...messages: any[]) => void;
    trace?: (...messages: any[]) => void;
}
interface IUploadingPartReport {
    status: boolean;
    resourceId: IDString | null;
    isComplete: boolean;
    data: Record<string, unknown> | null;
}
interface IInitiable {
    init(): PromisedContext;
}

declare function makeIndexFromResourceEntity(resourceEntity: IResourceDTE): Readonly<IResourceComponentsIndex>;

declare abstract class Plugin implements IPlugin {
    protected readonly api: Core;
    static readonly name: never;
    protected constructor(api: Core);
    abstract init(): PromisedContext;
}

declare class Storage extends Plugin {
    constructor(api: Core);
    init(): PromisedContext;
    createResource(factoryData: {
        info: {
            title: string;
            description?: string | null;
        };
        data?: {
            locked?: boolean;
            hidden?: boolean;
        };
        hierarchy?: {
            parent_id?: IDString | null;
            order_index?: number;
        };
        marks?: IMarkParam[];
        kv?: IResourceKV;
    }): PromisedContext<IDString | null>;
    appendChild(parentId: IDString, childId: IDString): PromisedContext;
    createRepresentation(resourceId: IDString, factoryData: {
        data: {
            type: string;
            role: string;
            is_external: boolean;
            is_primary: boolean;
        };
        source?: {
            url?: string | null;
            derived_from?: IDString | null;
        };
        infoData?: Record<string, unknown> | null;
    }): PromisedContext<IDString | null>;
    makeRepresentationPrimary(resourceId: IDString, id: IDString): PromisedContext;
    uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset?: number, length?: number | undefined): PromisedContext<IUploadingPartReport>;
    finishRepresentationUpload(representationId: IDString): PromisedContext;
    deleteResource(id: IDString): PromisedContext;
    deleteRepresentation(id: IDString): PromisedContext;
    deleteMarks(id: IDString, marks: {
        name: string;
        type: string;
    }[]): PromisedContext;
    deleteResourceKV(id: IDString, componentKeys: IResourceKV): PromisedContext;
    setMarks(resourceId: IDString, marks: {
        name: string;
        type: string;
        value: number | null;
    }[]): PromisedContext;
    setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext;
}

declare class Query extends Plugin {
    constructor(api: Core);
    init(): PromisedContext;
    resourceExists(id: string): Promise<boolean>;
    representationExists(id: IDString): Promise<boolean>;
    markExists(id: IDString, name: string, type: string): Promise<boolean>;
    resourceKVExists(id: IDString, component: string, attribute: string): Promise<boolean>;
    getMarkStatListByType(type: string): PromisedContext<{
        name: string;
        resources: number;
    }[]>;
    getMarkList(): PromisedContext<Record<string, string[]>>;
    findResourceById(id: IDString): Promise<Context<IResourceDTE | undefined>>;
    findResources(criteria: {
        data?: {
            id?: IDString;
        };
        hierarchy?: {
            parent_id?: IDString;
            order?: 'asc' | 'desc';
        };
        representation?: {
            id?: IDString;
            type?: string;
            role?: string;
            mime?: string;
            extension?: string;
            is_external?: boolean;
            is_primary?: boolean;
            uploading?: boolean;
        };
        mark?: IMarkCriteria;
        limit?: number;
        offset?: number;
    }): PromisedContext<IResourceDTE[]>;
}

declare class Extensia {
    protected extensions: Record<string, IPlugin>;
    protected core: Core;
    constructor(config: Config);
    start(): Promise<void>;
    getConfig(): Config;
    ext(name: string): object;
    hasExt(name: string): boolean;
    query(): Query;
    storage(): Storage;
}

export { APPLY_PATCH_TABLE, type AppliedPatchRecord, Config, Context, type CriteriaConditionOperator, type DBSchemePatch, Extensia, type IDString, type IInitiable, type ILogger, type IMarkCriteria, type IMarkData, type IMarkDataRecord, type IMarkItemCriteria, type IMarkKVRecord, type IMarkParam, type IPlugin, type IRepresentationDTE, type IRepresentationDataDTC, type IRepresentationDataRecord, type IRepresentationInfoDTC, type IRepresentationInfoRecord, type IRepresentationSourceDTC, type IRepresentationSourceRecord, type IResourceComponentsIndex, type IResourceDTE, type IResourceDataDTC, type IResourceDataRecord, type IResourceHierarchyDTC, type IResourceHierarchyMetaComponent, type IResourceHierarchyRecord, type IResourceInfoDTC, type IResourceInfoRecord, type IResourceKV, type IResourceMetafile, type IUploadingPartReport, MARK_DATA_TABLE, MARK_KV_TABLE, ON_CORE_INIT_EVENT, ON_DB_CLEAN_EVENT, ON_DB_FULL_DROP_EVENT, ON_FULL_RESCAN, ON_MARK_CREATED_EVENT, ON_MARK_DELETED_EVENT, ON_MARK_UPDATED_EVENT, ON_PLUGIN_INIT_EVENT, ON_REPRESENTATION_CREATED_EVENT, ON_REPRESENTATION_DELETED_EVENT, ON_REPRESENTATION_UPDATED_EVENT, ON_RESOURCE_CREATED_EVENT, ON_RESOURCE_DELETED_EVENT, ON_RESOURCE_KV_CREATED_EVENT, ON_RESOURCE_KV_DELETED_EVENT, ON_RESOURCE_KV_UPDATED_EVENT, ON_RESOURCE_UPDATED_EVENT, ON_STARTED_EVENT, Plugin, type PluginConstructor, type PromisedContext, REPRESENTATION_DATA_TABLE, REPRESENTATION_INFO_TABLE, REPRESENTATION_SOURCE_TABLE, RESOURCE_DATA_TABLE, RESOURCE_HIERARCHY_TABLE, RESOURCE_INFO_TABLE, type Timestamp, makeIndexFromResourceEntity };
