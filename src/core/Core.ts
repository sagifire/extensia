import { EventEmitter } from 'node:events'
import knex, { type Knex } from 'knex'

import {
    type DBSchemePatch,
    ILogger,
    IDString,
    IRepresentationDTE,
    IResourceDTE,
    IResourceKV,

    ON_DB_FULL_DROP_EVENT,
    ON_MARK_CREATED_EVENT,
    ON_REPRESENTATION_CREATED_EVENT,
    ON_RESOURCE_CREATED_EVENT,
    ON_RESOURCE_KV_CREATED_EVENT, IUploadingPartReport, IInitiable, IMarkParam, IMarkCriteria
} from './contracts.js'

import type Config from './Config.js'
import DBSchemeManager from './DBSchemeManager.js'
import FsManager from './FsManager.js'
import DbManager from './DbManager.js'
import Namer from './Namer.js'
import { nowInS } from './utils.js'
import { PromisedContext, Context } from './Context.js'
import { ErrorCodes } from './ErrorCodes.js'

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

        this.fsManager = new FsManager(config.storage, config.logger)

        this.db = knex(config.db.connection)
        this.migrationManager = new DBSchemeManager(this.db, config.logger)
        this.dbManager = new DbManager(this.db, config.db, config.logger, (resourceId) => this.fsManager.getPath(resourceId))
    }

    public async init() {
        const initiableList: IInitiable[] = [
            this.migrationManager,
            this.fsManager,
        ]

        for (const initiable of initiableList) {
            const initCtx = await initiable.init()
            if (initCtx.error) {
                this.logger.error(initCtx.error, initCtx.errorInfo)
            }
        }
    }

    public async dbFullDrop(): PromisedContext {
        let ctx = new Context()
        ctx.apply(await this.migrationManager.fullDrop())
        if (ctx.isSuccess()) {
            this.emit(ON_DB_FULL_DROP_EVENT, this)
        }
        return ctx
    }

    public applyDbSchemePatch(id: string, patch: DBSchemePatch): PromisedContext {
        return this.migrationManager.applySchemePatch(id, patch)
    }

    public rollbackDbSchemePatch(id: string, patch: DBSchemePatch): PromisedContext {
        return this.migrationManager.rollbackSchemePatch(id, patch)
    }

    public async createResource({info, data = {}, hierarchy = {}, marks = [], kv = {}}:{
        info: {
            title: string
            description?: string | null
        }
        data?: {
            locked?: boolean
            hidden?: boolean
        }
        hierarchy?: {
            parent_id?: IDString | null
            order_index?: number
        }
        marks?: IMarkParam[]
        kv?: IResourceKV
    }): PromisedContext<IDString|null> {
        let ctx = new Context<IDString|null>(null)

        try {
            if (hierarchy.parent_id && !await this.dbManager.resourceExists(hierarchy.parent_id)) {
                ctx.setError(ErrorCodes.PARENT_NOT_FOUND, { entity: 'resource' }, { parent_id: hierarchy.parent_id })
                return ctx
            }

            const resourceId = this.namer.generateResourceId()
            const resourceEntity: IResourceDTE = {
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
                    parent_id: null, // hierarchy?.parent_id || null,
                    order_index: hierarchy?.order_index || 0,
                    children: []
                },
                info: {
                    title: info.title,
                    description: info.description || null,

                },
                representations: [],
                marks: marks.map(mark => { return { value: 0, ...mark}}),
                kv,
            }

            ctx.apply(
                await this.fsManager.createResourceMetafile(
                    this.fsManager.resourceDTEToMetafile(resourceEntity)
                )
            )

            if (ctx.isSuccess()) {
                resourceEntity.hierarchy.path = this.fsManager.getPath(resourceEntity.data.id)

                ctx.apply(
                    await this.dbManager.createResourceRecord(resourceEntity)
                )

                if (hierarchy?.parent_id && ctx.isSuccess()) {
                    ctx.apply(
                        await this.fsManager.appendChild(hierarchy.parent_id, resourceId)
                    )
                    if (ctx.isSuccess()) {
                        ctx.apply(
                            await this.dbManager.appendChild(hierarchy.parent_id, resourceId)
                        )
                    }
                }
                // emit events
                if (ctx.isSuccess()) {

                    ctx.result = resourceId

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
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async appendChild(parentId: IDString, childId: IDString): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.appendChild(parentId, childId))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.appendChild(parentId, childId))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
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
    }): PromisedContext<IDString | null> {
        let ctx = new Context<IDString | null>(null)

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
            }

            while(true) {
                ctx.apply(await this.fsManager.createRepresentation(resourceId, representationEntity))
                if (ctx.isFailed()) break

                ctx.apply(await this.dbManager.createRepresentation(resourceId, representationEntity))
                if (ctx.isFailed()) break

                if (data.is_primary) {
                    ctx.apply(await this.makeRepresentationPrimary(resourceId, representationId))
                    if (ctx.isFailed()) break
                }
                ctx.result = representationId
                this.emit(ON_REPRESENTATION_CREATED_EVENT, this, representationEntity)

                break
            }
        } else {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { resource_id: resourceId })
        }

        return ctx
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.makeRepresentationPrimary(resourceId, representationId))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.makeRepresentationPrimary(resourceId, representationId))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteResource(id: IDString): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.deleteResource(id))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.deleteResource(id))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteRepresentation(id: IDString): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.deleteRepresentation(id))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.deleteRepresentation(id))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteMark(id: IDString, marks: { name: string, type: string }[]): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.deleteMarks(id, marks))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.deleteMarks(id, marks))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteResourceKV(id: IDString, componentKeys: IResourceKV): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.deleteResourceKV(id, componentKeys))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.deleteResourceKV(id, componentKeys))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    // update methods

    public async setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.setMarks(resourceId, marks))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.setMarks(resourceId, marks))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        let ctx = new Context()
        try {
            ctx.apply(await this.fsManager.setResourceKV(resourceId, componentKeys))
            if (ctx.isSuccess()) {
                ctx.apply(await this.dbManager.setResourceKV(resourceId, componentKeys))
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    // TODO upload methods

    public async uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset: number = 0, length: number | undefined = undefined): PromisedContext<IUploadingPartReport> {
        let ctx = await this.fsManager.uploadRepresentationPart(representationId, chunk, offset, length)
        if (ctx.isSuccess()) {
            ctx.apply(await this.dbManager.updateRepresentationInfo(representationId, { data: ctx.result.data }))
        }
        return ctx
    }

    public async finishRepresentationUpload(representationId: IDString): PromisedContext
    {
        let ctx = await this.fsManager.finishRepresentationUpload(representationId)
        if (ctx.isSuccess()) {
            const resourceId = this.fsManager.getResourceIdByRepresentationId(representationId)
            if (resourceId) {
                const resourceMetafileCtx = await this.fsManager.getResourceMetafile(resourceId)
                if (!resourceMetafileCtx.result) {
                    if (resourceMetafileCtx.isFailed()) {
                        ctx.apply(resourceMetafileCtx)
                    } else {
                        ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { resource_id: resourceId })
                    }
                    return ctx
                }
                let resourceMetafile = resourceMetafileCtx.result
                let representation: IRepresentationDTE | null = null
                for (const repItem of resourceMetafile.representations) {
                    if (repItem.data.id === representationId) {
                        representation = repItem
                        break
                    }
                }
                if (representation) {
                    ctx.apply(await this.dbManager.updateRepresentation(representationId, representation))
                } else {
                    ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'representation' }, { representation_id: representationId })
                }
            }
        }
        return ctx
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

    public async getMarkStatListByType(type: string): PromisedContext<{ name: string, resources: number }[]> {
        return await this.dbManager.getMarkStatListByType(type)
    }

    public async getMarkList(): PromisedContext<Record<string, string[]>> {
        return await this.dbManager.getMarkList()
    }

    public async findResources(criteria: {
        data?: {
            id?: IDString
        }
        hierarchy?: {
            parent_id?: IDString
            order?: 'asc' | 'desc'
        }
        representation?: {
            id?: IDString
            type?: string
            role?: string
            mime?: string
            extension?: string
            is_external?: boolean
            is_primary?: boolean
            uploading?: boolean
        }
        mark?: IMarkCriteria
        limit?: number
        offset?: number
    }): PromisedContext<IResourceDTE[]> {
        return await this.dbManager.findResources(criteria)
    }

    public async fullRescan(reportCallback: (report: { resources: number, representations: number }) => Promise<void>): PromisedContext {
        let ctx = new Context()
        // TODO
        return ctx
    }
}