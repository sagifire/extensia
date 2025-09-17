import { EventEmitter } from 'node:events'
import knex, { type Knex } from 'knex'

import {
    type DBSchemePatch,
    ILogger,
    IDString,
    IMarkData,
    IRepresentationDTE,
    IResourceDTE,
    IResourceInfoDTC,
    IResourceKV,

    ON_DB_FULL_DROP_EVENT,
    ON_MARK_CREATED_EVENT,
    ON_REPRESENTATION_CREATED_EVENT,
    ON_RESOURCE_CREATED_EVENT,
    ON_RESOURCE_KV_CREATED_EVENT, IUploadingPartReport
} from './contracts.js'

import type Config from './Config.js'
import DBSchemeManager from './DBSchemeManager.js'
import FsManager from './FsManager.js'
import DbManager from './DbManager.js'
import Namer from './Namer.js'
import { nowInMS } from './utils.js'

export default class Core extends EventEmitter {

    public readonly db: Knex
    protected readonly migrationManager: DBSchemeManager

    public readonly fsManager: FsManager
    public readonly dbManager: DbManager
    public readonly namer: Namer

    public readonly logger: ILogger

    constructor(
        public readonly config: Config,
    ) {
        super()

        this.namer = new Namer()
        this.logger = config.logger
        this.db = knex(config.db.connection)
        this.migrationManager = new DBSchemeManager(this.db, config.logger)
        this.fsManager = new FsManager(config.storage, config.logger)
        this.dbManager = new DbManager(this.db, config.db, config.logger, (resourceId) => this.fsManager.getPath(resourceId))
    }

    public async init() {
        await this.migrationManager.init(this.config.db.initMigration)
        await this.fsManager.init()
    }

    public async dbFullDrop() {
        await this.migrationManager.fullDrop()
        this.emit(ON_DB_FULL_DROP_EVENT, this)
    }

    public async applyDbSchemePatch(id: string, patch: DBSchemePatch): Promise<boolean> {
        return await this.migrationManager.applySchemePatch(id, patch)
    }

    public async rollbackDbSchemePatch(id: string, patch: DBSchemePatch): Promise<boolean> {
        return await this.migrationManager.rollbackSchemePatch(id, patch)
    }

    public async createResource({info, data = {}, hierarchy = {}, marks = [], kv = {}}:{
        info: IResourceInfoDTC
        data?: {
            locked?: boolean
            hidden?: boolean
        }
        hierarchy?: {
            parent_id?: IDString | null
            order_index?: number
        }
        marks?: IMarkData[]
        kv?: IResourceKV
    }): Promise<boolean> {
        let result = false

        if (!hierarchy?.parent_id || await this.dbManager.resourceExists(hierarchy.parent_id)) {
            const resourceId = this.namer.generateResourceId()
            const resourceEntity: IResourceDTE = {
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
                    description: info.description || null,

                },
                representations: [],
                marks,
                kv,
            }

            let resultMetafile = await this.fsManager.createResourceMetafile(
                this.fsManager.resourceDTEToMetafile(resourceEntity)
            )
            if (resultMetafile) {
                resourceEntity.hierarchy.path = this.fsManager.getPath(resourceEntity.data.id)
                await this.dbManager.createResourceRecord(resourceEntity)
                if (hierarchy?.parent_id) {
                    await this.fsManager.appendChild(hierarchy.parent_id, resourceId)
                    await this.dbManager.appendChild(hierarchy.parent_id, resourceId)
                }
                // emit events
                this.emit(ON_RESOURCE_CREATED_EVENT, this, resourceEntity)
                for (const representation of resourceEntity.representations!) {
                    this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representation)
                }
                for (const mark of resourceEntity.marks!) {
                    this.emit(ON_MARK_CREATED_EVENT, this, mark)
                }
                for (const kvComponent in resourceEntity.kv!) {
                    for (const kvAttribute in resourceEntity.kv[kvComponent]) {
                        this.emit(ON_RESOURCE_KV_CREATED_EVENT, this, kvComponent, kvAttribute, resourceEntity.kv[kvComponent][kvAttribute])
                    }
                }
            }
        }
        return result
    }

    public async createRepresentation(resourceId: IDString, {data, infoData = null, source = {}}: {
        data: {
            type: string
            role: string
            is_external: boolean
            is_primary: boolean
        },
        source?: {
            url?: string | null
            derived_from?: IDString | null
        }
        infoData?: Record<string, unknown> | null
    }): Promise<IRepresentationDTE | null> {
        let result = null;

        if (await this.resourceExists(resourceId)) {
            const representationId = this.namer.generateRepresentationId()

            const representationEntity: IRepresentationDTE = {
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
            }

            if (await this.fsManager.createRepresentation(resourceId, representationEntity)) {
                await this.dbManager.createRepresentation(resourceId, representationEntity)

                if (data.is_primary) {
                    await this.makeRepresentationPrimary(resourceId, representationId)
                }
                result = representationEntity
                this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representationEntity)
            }
        }

        return result;
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString): Promise<boolean> {
        let result = await this.fsManager.makeRepresentationPrimary(resourceId, representationId)
        if (result) {
            await this.dbManager.makeRepresentationPrimary(resourceId, representationId)
        }
        return false
    }

    public async deleteResource(id: IDString): Promise<boolean> {
        let result = await this.fsManager.deleteResource(id)
        if (result) {
            await this.dbManager.deleteResource(id)
        }
        return result
    }

    public async deleteRepresentation(id: IDString): Promise<boolean> {
        let result = await this.fsManager.deleteRepresentation(id)
        if (result) {
            await this.dbManager.deleteRepresentation(id)
        }
        return result
    }

    public async deleteMark(id: IDString, marks: { name: string, type: string }[]): Promise<boolean> {
        let result = await this.fsManager.deleteMarks(id, marks)
        if (result) {
            await this.dbManager.deleteMarks(id, marks)
        }
        return result
    }

    public async deleteResourceKV(id: IDString, componentKeys: IResourceKV): Promise<boolean> {
        let result = await this.fsManager.deleteResourceKV(id, componentKeys)
        if (result) {
            await this.dbManager.deleteResourceKV(id, componentKeys)
        }
        return result
    }

    // update methods

    public async setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): Promise<boolean> {
        let result = await this.fsManager.setMarks(resourceId, marks)
        if (result) {
            await this.dbManager.setMarks(resourceId, marks)
        }
        return result
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
        let result = await this.fsManager.setResourceKV(resourceId, componentKeys)
        if (result) {
            await this.dbManager.setResourceKV(resourceId, componentKeys)
        }
        return result
    }

    // TODO upload methods

    public async uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset: number = 0, length: number | undefined = undefined): Promise<IUploadingPartReport> {
        let report = await this.fsManager.uploadRepresentationPart(representationId, chunk, offset, length)
        if (report.status) {
            await this.dbManager.updateRepresentationInfo(representationId, { data: report.data })
        }
        return report
    }

    public async finishRepresentationUpload(representationId: IDString): Promise<boolean> {
        let result = await this.fsManager.finishRepresentationUpload(representationId)
        if (result) {
            const resourceId = this.fsManager.getResourceIdByRepresentationId(representationId)
            if (resourceId) {
                const resourceMetafile = await this.fsManager.getResourceMetafile(resourceId)
                if (resourceMetafile) {
                    let representation: IRepresentationDTE | null = null
                    for (const repItem of resourceMetafile.representations) {
                        if (repItem.data.id === representationId) {
                            representation = repItem
                            break
                        }
                    }
                    if (representation) {
                        await this.dbManager.updateRepresentation(representationId, representation)
                    }
                }
            }
        }
        return result
    }

    // TODO query methods

    public resourceExists(id: IDString): Promise<boolean> {
        return this.dbManager.resourceExists(id)
    }

    public representationExists(id: IDString): Promise<boolean> {
        return this.dbManager.representationExists(id);
    }

    public markExists(id: IDString, name: string, type: string): Promise<boolean> {
        return this.dbManager.markExists(id, name, type)
    }

    public resourceKVExists(id: IDString, component: string, attribute: string): Promise<boolean> {
        return this.dbManager.resourceKVExists(id, component, attribute)
    }

    public async getMarkListByType(type: string): Promise<{ name: string, resources: number }[]> {
        return await this.dbManager.getMarkListByType(type)
    }

    // TODO full rescan

    public async fullRescan(reportCallback: (report: { resources: number, representations: number }) => Promise<void>): Promise<void> {

    }
}