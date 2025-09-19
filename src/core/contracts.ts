// ### GENERIC TYPES

import type { Knex } from 'knex'

import type Core from './Core.js'
import { PromisedContext } from './Context.js'

export type IDString = string // 16 char id
export type Timestamp = number

// ### DATA TRANSFER CONTRACTS

export interface IRepresentationDataDTC {
    id: IDString
    // resource_id: IDString
    type: string // image | audio | video | link ...
    role: string // original | preview | thumbnail | audio | link ...
    mime: string | null
    extension: string | null
    is_external: boolean
    is_primary: boolean
    uploading: boolean
    created_at: Timestamp
    updated_at: Timestamp
}

export interface IRepresentationSourceDTC {
    url: string | null
    derived_from: IDString | null
}

export interface IRepresentationInfoDTC {
    data: Record<string, unknown> | null
}

export interface IRepresentationDTE {
    data: IRepresentationDataDTC
    source: IRepresentationSourceDTC
    info: IRepresentationInfoDTC
}

export interface IMarkData {
    // resource_id: IDString
    name: string
    type: string
    value: number | null
}

export interface IResourceKV {
    [key: string]: {
        [key: string]: string
    }
}

export interface IResourceDataDTC {
    id: IDString
    created_at: Timestamp
    updated_at: Timestamp
    locked: boolean
    hidden: boolean
    is_deleted: boolean
}

export interface IResourceInfoDTC {
    title: string
    description: string | null
}

export interface IResourceHierarchyDTC {
    parent_id: IDString | null
    path: string[]
    order_index: number
    children: { id: IDString, order_index: number }[]
}

export interface IResourceDTE {
    data: IResourceDataDTC
    info: IResourceInfoDTC
    hierarchy: IResourceHierarchyDTC
    representations: IRepresentationDTE[]
    marks: IMarkData[]
    kv: IResourceKV
}

export interface IResourceHierarchyMetaComponent {
    parent_id: IDString | null
    order_index: number
    children: { id: IDString, order_index: number }[]
}

export interface IResourceMetafile {
    data: IResourceDataDTC
    info: IResourceInfoDTC
    hierarchy: IResourceHierarchyMetaComponent
    representations: IRepresentationDTE[]
    marks: IMarkData[]
    kv: IResourceKV
}

export interface IResourceComponentsIndex {
    id: IDString
    hierarchy: IResourceHierarchyDTC
    representations: {[key:IDString]: true}
    marks: {[key:string]: true}
    kv: {[key:string]: true}
}

export interface IMarkParam {
    name: string
    type: string
    value?: number | null
}

// ### DB CONTRACTS

export const APPLY_PATCH_TABLE = 'applied_patches'

export const RESOURCE_DATA_TABLE = 'resource_data'
export const RESOURCE_INFO_TABLE = 'resource_info'
export const RESOURCE_HIERARCHY_TABLE = 'resource_hierarchy'
export const REPRESENTATION_DATA_TABLE = 'representation_data'
export const REPRESENTATION_SOURCE_TABLE = 'representation_source'
export const REPRESENTATION_INFO_TABLE = 'representation_info'
export const MARK_DATA_TABLE = 'mark_data'
export const MARK_KV_TABLE = 'mark_kv'

export interface AppliedPatchRecord {
    id: string
    on_create: Timestamp
}

export interface IResourceDataRecord extends IResourceDataDTC {}
export interface IResourceInfoRecord extends IResourceInfoDTC {
    id: IDString
}

export interface IResourceHierarchyRecord {
    id: IDString
    parent_id: IDString | null
    order_index: number
}

export interface IRepresentationDataRecord extends IRepresentationDataDTC {
    resource_id: IDString
}
export interface IRepresentationSourceRecord extends IRepresentationSourceDTC {
    id: IDString
}
export interface IRepresentationInfoRecord extends IRepresentationInfoDTC {
    id: IDString
}
export interface IMarkDataRecord extends IMarkData {
    resource_id: IDString
}
export interface IMarkKVRecord {
    resource_id: IDString
    component: string
    attribute: string
    value: string
}

export type CriteriaConditionOperator = '<'|'<='|'>='|'>'|'='|'!='|'<>'

export interface IMarkItemCriteria {
    name: string,
    type: string,
    value?: number | null | [CriteriaConditionOperator, number] | [number, number] | 'not null',
}

export type IMarkCriteria = IMarkItemCriteria | IMarkItemCriteria[] | Array<IMarkItemCriteria | IMarkItemCriteria[]>

// CORE CONTRACTS

export type DBSchemePatch = (db: Knex) => Promise<boolean>

export interface IPlugin {
    init(): PromisedContext
}

export type PluginConstructor = (new (api: Core) => IPlugin) & { name: string }

export const ON_CORE_INIT_EVENT = 'on_core_init'
export const ON_PLUGIN_INIT_EVENT = 'on_plugin_init'
export const ON_STARTED_EVENT = 'on_started'


export const ON_RESOURCE_CREATED_EVENT = 'on_resource_created'
export const ON_RESOURCE_UPDATED_EVENT = 'on_resource_updated'
export const ON_RESOURCE_DELETED_EVENT = 'on_resource_deleted'

export const ON_REPRESENTATION_CREATED_EVENT = 'on_representation_created'
export const ON_REPRESENTATION_UPDATED_EVENT = 'on_representation_updated'
export const ON_REPRESENTATION_DELETED_EVENT = 'on_representation_deleted'

export const ON_MARK_CREATED_EVENT = 'on_mark_created'
export const ON_MARK_UPDATED_EVENT = 'on_mark_updated'
export const ON_MARK_DELETED_EVENT = 'on_mark_deleted'

export const ON_RESOURCE_KV_CREATED_EVENT = 'on_resource_kv_created'
export const ON_RESOURCE_KV_UPDATED_EVENT = 'on_resource_kv_updated'
export const ON_RESOURCE_KV_DELETED_EVENT = 'on_resource_kv_deleted'

export const ON_DB_FULL_DROP_EVENT = 'on_db_full_drop'
export const ON_DB_CLEAN_EVENT = 'on_db_clean'
export const ON_FULL_RESCAN = 'on_full_rescan'

export interface ILogger {
    log: (...messages: any[]) => void
    error: (...messages: any[]) => void
    info: (...messages: any[]) => void
    warn?: (...messages: any[]) => void
    debug?: (...messages: any[]) => void
    trace?: (...messages: any[]) => void
}

export interface IUploadingPartReport {
    status: boolean
    resourceId: IDString | null
    isComplete: boolean
    data: Record<string, unknown> | null
}

export interface IInitiable {
    init(): PromisedContext
}