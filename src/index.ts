import {
    IDString,
    Timestamp,
    IResourceDTE,
    IRepresentationDTE,
    IRepresentationSourceDTC,
    IRepresentationDataDTC,
    IRepresentationInfoDTC,
    IResourceDataDTC,
    IResourceInfoDTC,
    IMarkData,
    IResourceKV,
    IResourceComponentsIndex,

    APPLY_PATCH_TABLE,
    RESOURCE_DATA_TABLE,
    RESOURCE_INFO_TABLE,
    RESOURCE_HIERARCHY_TABLE,
    REPRESENTATION_DATA_TABLE,
    REPRESENTATION_INFO_TABLE,
    REPRESENTATION_SOURCE_TABLE,
    MARK_DATA_TABLE,
    MARK_KV_TABLE,

    AppliedPatchRecord,
    IResourceDataRecord,
    IResourceInfoRecord,
    IResourceHierarchyRecord,
    IRepresentationDataRecord,
    IRepresentationSourceRecord,
    IRepresentationInfoRecord,
    IMarkDataRecord,
    IMarkKVRecord,

    IPlugin,
    PluginConstructor,

    ON_CORE_INIT_EVENT,
    ON_PLUGIN_INIT_EVENT,
    ON_STARTED_EVENT,


    ON_RESOURCE_CREATED_EVENT,
    ON_RESOURCE_UPDATED_EVENT,
    ON_RESOURCE_DELETED_EVENT,

    ON_REPRESENTATION_CREATED_EVENT,
    ON_REPRESENTATION_UPDATED_EVENT,
    ON_REPRESENTATION_DELETED_EVENT,

    ON_MARK_CREATED_EVENT,
    ON_MARK_UPDATED_EVENT,
    ON_MARK_DELETED_EVENT,

    ON_RESOURCE_KV_CREATED_EVENT,
    ON_RESOURCE_KV_UPDATED_EVENT,
    ON_RESOURCE_KV_DELETED_EVENT,

    ON_DB_FULL_DROP_EVENT,
    ON_DB_CLEAN_EVENT,
    ON_FULL_RESCAN,

    IResourceMetafile,
    IResourceHierarchyDTC,
    IResourceHierarchyMetaComponent,
    DBSchemePatch,

    ILogger,
    IUploadingPartReport

} from './core/contracts.js'

import {
    makeIndexFromResourceEntity
} from './core/utils.js'

import Extensia from './core/Extensia.js'
import Config from './core/Config.js'
import Plugin from './core/Plugin.js'


export {
    Extensia,
    Config,
    Plugin,

    IDString,
    Timestamp,
    IResourceDTE,
    IRepresentationDTE,
    IRepresentationSourceDTC,
    IRepresentationDataDTC,
    IRepresentationInfoDTC,
    IResourceDataDTC,
    IResourceInfoDTC,
    IMarkData,
    IResourceKV,
    IResourceComponentsIndex,

    APPLY_PATCH_TABLE,
    RESOURCE_DATA_TABLE,
    RESOURCE_INFO_TABLE,
    RESOURCE_HIERARCHY_TABLE,
    REPRESENTATION_DATA_TABLE,
    REPRESENTATION_INFO_TABLE,
    REPRESENTATION_SOURCE_TABLE,
    MARK_DATA_TABLE,
    MARK_KV_TABLE,

    AppliedPatchRecord,
    IResourceDataRecord,
    IResourceInfoRecord,
    IResourceHierarchyRecord,
    IRepresentationDataRecord,
    IRepresentationSourceRecord,
    IRepresentationInfoRecord,
    IMarkDataRecord,
    IMarkKVRecord,

    IPlugin,
    PluginConstructor,

    ON_CORE_INIT_EVENT,
    ON_PLUGIN_INIT_EVENT,
    ON_STARTED_EVENT,


    ON_RESOURCE_CREATED_EVENT,
    ON_RESOURCE_UPDATED_EVENT,
    ON_RESOURCE_DELETED_EVENT,

    ON_REPRESENTATION_CREATED_EVENT,
    ON_REPRESENTATION_UPDATED_EVENT,
    ON_REPRESENTATION_DELETED_EVENT,

    ON_MARK_CREATED_EVENT,
    ON_MARK_UPDATED_EVENT,
    ON_MARK_DELETED_EVENT,

    ON_RESOURCE_KV_CREATED_EVENT,
    ON_RESOURCE_KV_UPDATED_EVENT,
    ON_RESOURCE_KV_DELETED_EVENT,

    ON_DB_FULL_DROP_EVENT,
    ON_DB_CLEAN_EVENT,
    ON_FULL_RESCAN,

    IResourceMetafile,
    IResourceHierarchyDTC,
    IResourceHierarchyMetaComponent,
    DBSchemePatch,

    ILogger,
    IUploadingPartReport,

    makeIndexFromResourceEntity,
}