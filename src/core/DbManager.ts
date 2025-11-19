import { type Knex } from 'knex'
import Config from './Config.js'
import {
    IDString,
    ILogger, IMarkCriteria, IMarkData, IMarkDataRecord, IMarkItemCriteria, IMarkKVRecord,
    IRepresentationDataRecord,
    IRepresentationDTE, IRepresentationInfoDTC,
    IRepresentationInfoRecord,
    IRepresentationSourceRecord,
    IResourceDataRecord,
    IResourceDTE,
    IResourceHierarchyRecord,
    IResourceInfoRecord,
    IResourceKV, MARK_DATA_TABLE, MARK_KV_TABLE,
    REPRESENTATION_DATA_TABLE, REPRESENTATION_INFO_TABLE,
    REPRESENTATION_SOURCE_TABLE,
    RESOURCE_DATA_TABLE,
    RESOURCE_HIERARCHY_TABLE,
    RESOURCE_INFO_TABLE
} from './contracts.js'
import { nowInS } from './utils.js'
import { Context, PromisedContext } from './Context.js'


export default class DbManager {
    constructor(
        protected readonly db: Knex,
        protected readonly config: Config['db'], // reserved
        protected readonly logger: ILogger,
        protected readonly getPaths: (resourceId: IDString) => string[]
    ) {}

    public async createResourceRecord(resourceEntity: IResourceDTE): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {

                await trx.insert({
                    ...resourceEntity.data,
                    created_at: nowInS(),
                    updated_at: nowInS()
                } satisfies IResourceDataRecord).into(RESOURCE_DATA_TABLE)
                await trx.insert({
                    ...resourceEntity.info,
                    id: resourceEntity.data.id
                } satisfies IResourceInfoRecord).into(RESOURCE_INFO_TABLE)
                await trx.insert({
                    id: resourceEntity.data.id,
                    parent_id: resourceEntity.hierarchy.parent_id,
                    order_index: resourceEntity.hierarchy.order_index
                } satisfies IResourceHierarchyRecord).into(RESOURCE_HIERARCHY_TABLE)

                for (const representation of resourceEntity.representations!) {
                    await trx.insert({
                        ...representation.data,
                        resource_id: resourceEntity.data.id
                    } satisfies IRepresentationDataRecord).into(REPRESENTATION_DATA_TABLE)
                    await trx.insert({
                        ...representation.source,
                        id: representation.data.id,
                    } satisfies IRepresentationSourceRecord).into(REPRESENTATION_SOURCE_TABLE)
                    await trx.insert({
                        data: representation.info.data,
                        id: representation.data.id
                    } satisfies IRepresentationInfoRecord).into(REPRESENTATION_INFO_TABLE)
                }

                for (const kvComponent in resourceEntity.kv!) {
                    for (const kvAttribute in resourceEntity.kv[kvComponent]) {
                        await trx.insert({
                            component: kvComponent,
                            attribute: kvAttribute,
                            value: resourceEntity.kv[kvComponent][kvAttribute],
                            resource_id: resourceEntity.data.id
                        } satisfies IMarkKVRecord).into(MARK_KV_TABLE)
                    }
                }

                for (const mark of resourceEntity.marks!) {
                    await trx.insert({
                        ...mark,
                        resource_id: resourceEntity.data.id,
                    } satisfies IMarkDataRecord).into(MARK_DATA_TABLE)
                }
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async resourceExists(resourceId: IDString): Promise<boolean> {
        return !! (await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).where('id', resourceId).first())
    }

    public async appendChild(resourceId: IDString, childID: IDString): PromisedContext {
        let ctx = new Context()

        try {
            await this.db.transaction(async (trx) => {

                await trx.update({
                    parent_id: resourceId,
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: childID
                })
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async changeParent(resourceId: IDString, newParentId: IDString | null): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                await trx.update({
                    parent_id: newParentId
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: resourceId
                })
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async changeOrderIndex(resourceId: IDString, newOrderIndex: number): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                await trx.update({
                    order_index: newOrderIndex
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: resourceId
                })
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async updateRepresentationInfo(representationId: IDString, info: IRepresentationInfoDTC): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                }).first()

                if (representationRecord) {
                    await trx.update({
                        data: JSON.stringify(info.data) as unknown as Record<string, unknown>
                    } satisfies Partial<IRepresentationInfoRecord>).from(REPRESENTATION_INFO_TABLE).where({
                        id: representationId
                    })
                    await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                await trx.insert({
                    ...representationEntity.data,
                    resource_id: resourceId,
                } satisfies IRepresentationDataRecord).into(REPRESENTATION_DATA_TABLE)
                await trx.insert({
                    ...representationEntity.source,
                    id: representationEntity.data.id,
                } satisfies IRepresentationSourceRecord).into(REPRESENTATION_SOURCE_TABLE)
                await trx.insert({
                    data: representationEntity.info.data,
                    id: representationEntity.data.id
                } satisfies IRepresentationInfoRecord).into(REPRESENTATION_INFO_TABLE)

                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async updateRepresentation(representationId: IDString, representationEntity: IRepresentationDTE): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {

                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                }).first()

                if (representationRecord) {
                    let dataUpdate: Partial<IRepresentationDataRecord> = {
                        ...representationEntity.data,
                        resource_id: representationRecord.resource_id
                    }
                    delete dataUpdate['id']
                    await trx.update(
                        dataUpdate satisfies Partial<IRepresentationDataRecord>
                    ).from(REPRESENTATION_DATA_TABLE).where({
                        id: representationId
                    })
                    await trx.update({
                        ...representationEntity.source,
                    } satisfies Partial<IRepresentationSourceRecord>).from(REPRESENTATION_SOURCE_TABLE).where({
                        id: representationEntity.data.id,
                    })
                    await trx.update({
                        data: JSON.stringify(representationEntity.info.data) as unknown as Record<string, unknown>
                    } satisfies Partial<IRepresentationInfoRecord>).from(REPRESENTATION_INFO_TABLE).where({
                        id: representationId
                    })
                    await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async representationExists(representationID: IDString): Promise<boolean> {
        return !! (
            await this.db<IRepresentationDataRecord>(REPRESENTATION_DATA_TABLE)
                .where('id', representationID)
                .first()
        )
    }

    public async markExists(resourceId: IDString, name: string, type: string): Promise<boolean> {
        return !! (await this.db<IMarkDataRecord>(MARK_DATA_TABLE).where({
            resource_id: resourceId,
            name: name,
            type: type
        }).first())
    }

    public async resourceKVExists(resourceId: IDString, component: string, attribute: string): Promise<boolean> {
        return !! (await this.db<IMarkKVRecord>(MARK_KV_TABLE).where({
            resource_id: resourceId,
            component: component,
            attribute: attribute
        }).first())
    }

    public async deleteResource(resourceId: IDString): PromisedContext {
        let ctx = new Context()
        try {
            await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).where('id', resourceId).delete()
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteRepresentation(representationId: IDString): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {

                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                }).first()
                if (representationRecord) {
                    await trx.delete().from(REPRESENTATION_DATA_TABLE).where({ id: representationId })
                    await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteMarks(resourceId: IDString, marks: { name: string, type: string }[]): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {

                for (const mark of marks) {
                    await trx.delete().from(MARK_DATA_TABLE).where({
                        resource_id: resourceId,
                        name: mark.name,
                        type: mark.type
                    })
                }
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                for (const component in componentKeys) {
                    for (const attribute in componentKeys[component]) {
                        await trx.delete().from(MARK_KV_TABLE).where({
                            resource_id: resourceId,
                            component: component,
                            attribute: attribute,
                        })
                    }
                }
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                for (const mark of marks) {
                    await trx.upsert({
                        ...mark,
                        resource_id: resourceId
                    } satisfies IMarkDataRecord).into(MARK_DATA_TABLE).where({
                        resource_id: resourceId,
                        name: mark.name,
                        type: mark.type,
                    })
                }
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                for (const component in componentKeys) {
                    for (const attribute in componentKeys[component]) {
                        await trx.upsert({
                            component: component,
                            attribute: attribute,
                            value: componentKeys[component][attribute],
                            resource_id: resourceId
                        } satisfies IMarkKVRecord).into(MARK_KV_TABLE).where({
                            resource_id: resourceId,
                            component: component,
                            attribute: attribute,
                        })
                    }
                }
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString): PromisedContext {
        let ctx = new Context()
        try {
            await this.db.transaction(async (trx) => {
                await trx.update({
                    is_primary: false
                } satisfies Partial<IRepresentationDataRecord>).from(REPRESENTATION_DATA_TABLE).where({
                    resource_id: resourceId,
                    is_primary: true
                })
                await trx.update({
                    is_primary: true
                } satisfies Partial<IRepresentationDataRecord>).from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                })
                await trx.update({ updated_at: nowInS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
            })
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async deleteAllRecords(): PromisedContext {
        let ctx = new Context()
        try {
            await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).delete()
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async getMarkStatListByType(type: string): PromisedContext<{ name: string, resources: number, min_value: number, max_value: number }[]> {
        let ctx = new Context<{ name: string, resources: number, min_value: number, max_value: number }[]>([])
        try {
            ctx.result = await this.db<IMarkDataRecord>(MARK_DATA_TABLE)
                .where({ type: type })
                .groupBy('name')
                .select(
                    'name',
                    this.db.raw('count(resource_id) as resources'),
                    this.db.raw('min(value) as min_value'),
                    this.db.raw('max(value) as max_value')
                )
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async getMarkList(): PromisedContext<Record<string, string[]>> {
        let ctx = new Context<Record<string, string[]>>({})
        try {
            let queryResult = await this.db<IMarkDataRecord>(MARK_DATA_TABLE)
                .groupBy(['type', 'name'])
                .select(
                    'type',
                    'name',
                )
            for (const record of queryResult) {
                if ('undefined' === typeof ctx.result[record.type]) {
                    ctx.result[record.type] = []
                }
                ctx.result[record.type].push(record.name)
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async findResourceById(resourceId: IDString): PromisedContext<IResourceDTE | undefined> {
        let ctx = new Context<IResourceDTE | undefined>(undefined)
        try {
            const resourceDataRecord: IResourceDataRecord | undefined = await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE)
                .where({ id: resourceId })
                .first()
            if (resourceDataRecord) {
                const resourceHierarchyRecord: IResourceHierarchyRecord | undefined = await this.db<IResourceHierarchyRecord>(RESOURCE_HIERARCHY_TABLE)
                    .where({ id: resourceId })
                    .first()
                const resourceInfoRecord: IResourceInfoRecord | undefined = await this.db<IResourceInfoRecord>(RESOURCE_INFO_TABLE)
                    .where({ id: resourceId })
                    .first()
                const resourceRepresentationDataRecord: Array<{
                    source_url: string | null,
                    source_derived_from: IDString | null,
                    info_data: string | null
                } & IRepresentationDataRecord> | undefined = await this.db<IRepresentationDataRecord>(REPRESENTATION_DATA_TABLE)
                    .select({
                        id: RESOURCE_DATA_TABLE + '.id',
                        type: REPRESENTATION_DATA_TABLE + '.type',
                        role: REPRESENTATION_DATA_TABLE + '.role',
                        mime: REPRESENTATION_DATA_TABLE + '.mime',
                        extension: REPRESENTATION_DATA_TABLE + '.extension',
                        created_at: RESOURCE_DATA_TABLE + '.created_at',
                        updated_at: RESOURCE_DATA_TABLE + '.updated_at',
                        is_primary: REPRESENTATION_DATA_TABLE + '.is_primary',
                        is_external: REPRESENTATION_DATA_TABLE + '.is_external',
                        uploading: REPRESENTATION_DATA_TABLE + '.uploading',
                        source_url: REPRESENTATION_SOURCE_TABLE + '.url',
                        source_derived_from: REPRESENTATION_SOURCE_TABLE + '.derived_from',
                        info_data: REPRESENTATION_INFO_TABLE + '.data'
                    })
                    .leftJoin(REPRESENTATION_INFO_TABLE, function () {
                        this.on(REPRESENTATION_INFO_TABLE + '.id', '=', REPRESENTATION_DATA_TABLE + '.id')
                    })
                    .leftJoin(REPRESENTATION_SOURCE_TABLE, function () {
                        this.on(REPRESENTATION_SOURCE_TABLE + '.id', '=', REPRESENTATION_DATA_TABLE + '.id')
                    })
                    .where({ resource_id: resourceId })
                const resourceMarkRecord: IMarkDataRecord[] | undefined = await this.db<IMarkDataRecord>(MARK_DATA_TABLE)
                    .where({ resource_id: resourceId })
                const resourceKVRecord: IMarkKVRecord[] | undefined = await this.db<IMarkKVRecord>(MARK_KV_TABLE)
                    .where({ resource_id: resourceId })

                if (resourceHierarchyRecord && resourceInfoRecord) {
                    let resource: IResourceDTE = {
                        data: {
                            id: resourceDataRecord.id,
                            created_at: resourceDataRecord.created_at,
                            updated_at: resourceDataRecord.updated_at,
                            hidden: resourceDataRecord.hidden,
                            locked: resourceDataRecord.locked,
                            is_deleted: resourceDataRecord.is_deleted
                        },
                        hierarchy: {
                            parent_id: resourceHierarchyRecord.parent_id,
                            order_index: resourceHierarchyRecord.order_index,
                            path: this.getPaths(resourceDataRecord.id),
                            children: []
                        },
                        info: {
                            title: resourceInfoRecord.title,
                            description: resourceInfoRecord.description
                        },
                        representations: [],
                        marks: [],
                        kv: {}
                    }
                    // representations
                    if (resourceRepresentationDataRecord?.length) {
                        for(const representation of resourceRepresentationDataRecord) {
                            resource.representations.push({data: {
                                    id: resourceDataRecord.id,
                                    type: representation.type,
                                    role: representation.role,
                                    mime: representation.mime,
                                    extension: representation.extension,
                                    created_at: representation.created_at,
                                    updated_at: representation.updated_at,
                                    is_primary: representation.is_primary,
                                    is_external: representation.is_external,
                                    uploading: representation.uploading
                                },
                                source: {
                                    url: representation.source_url,
                                    derived_from: representation.source_derived_from
                                },
                                info: {
                                    data: representation.info_data as (Record<string, unknown> | null)
                                }})
                        }
                    }
                    // marks
                    if (resourceMarkRecord?.length) {
                        for(const mark of resourceMarkRecord) {
                            resource.marks.push({name: mark.name, type: mark.type, value: mark.value})
                        }
                    }
                    // kv
                    if (resourceKVRecord?.length) {
                        for(const kv of resourceKVRecord) {
                            if ('undefined' === typeof resource.kv[kv.component]) {
                                resource.kv[kv.component] = {}
                            }
                            resource.kv[kv.component][kv.attribute] = kv.value
                        }
                    }

                    ctx.result = resource
                }
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
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
        let ctx = new Context<IResourceDTE[]>([])

        const db = this.db

        const columnsConfig = {
            data_id: RESOURCE_DATA_TABLE + '.id',
            data_created_at: RESOURCE_DATA_TABLE + '.created_at',
            data_updated_at: RESOURCE_DATA_TABLE + '.updated_at',
            data_locked: RESOURCE_DATA_TABLE + '.locked',
            data_hidden: RESOURCE_DATA_TABLE + '.hidden',
            data_is_deleted: RESOURCE_DATA_TABLE + '.is_deleted',

            info_title: RESOURCE_INFO_TABLE + '.title',
            info_description: RESOURCE_INFO_TABLE + '.description',

            hierarchy_parent_id: RESOURCE_HIERARCHY_TABLE + '.parent_id',
            hierarchy_order_index: RESOURCE_HIERARCHY_TABLE + '.order_index',

            representation_data_id: REPRESENTATION_DATA_TABLE + '.id',
            representation_data_created_at: REPRESENTATION_DATA_TABLE + '.created_at',
            representation_data_updated_at: REPRESENTATION_DATA_TABLE + '.updated_at',
            representation_data_type: REPRESENTATION_DATA_TABLE + '.type',
            representation_data_role: REPRESENTATION_DATA_TABLE + '.role',
            representation_data_mime: REPRESENTATION_DATA_TABLE + '.mime',
            representation_data_extension: REPRESENTATION_DATA_TABLE + '.extension',
            representation_data_is_external: REPRESENTATION_DATA_TABLE + '.is_external',
            representation_data_is_primary: REPRESENTATION_DATA_TABLE + '.is_primary',
            representation_data_uploading: REPRESENTATION_DATA_TABLE + '.uploading',

            representation_source_url: REPRESENTATION_SOURCE_TABLE + '.url',
            representation_source_derived_from: REPRESENTATION_SOURCE_TABLE + '.derived_from',

            representation_info_data: REPRESENTATION_INFO_TABLE + '.data',

            mark_data_name: MARK_DATA_TABLE + '.name',
            mark_data_type: MARK_DATA_TABLE + '.type',
            mark_data_value: MARK_DATA_TABLE + '.value',

            kv_component: MARK_KV_TABLE + '.component',
            kv_attribute: MARK_KV_TABLE + '.attribute',
            kv_value: MARK_KV_TABLE + '.value',
        }

        let filterQuery = this.db
            .select()
            .column({
                f_id: RESOURCE_DATA_TABLE + '.id'
            })
            .from(RESOURCE_DATA_TABLE)
            .as('f_t')

        if (criteria.hierarchy && criteria.hierarchy.parent_id) {
            filterQuery = filterQuery.
                innerJoin(RESOURCE_HIERARCHY_TABLE, function(){
                    this.on(RESOURCE_HIERARCHY_TABLE + '.id', '=', 'f_id')
                        .andOn(RESOURCE_HIERARCHY_TABLE + '.parent_id', '=', db.raw('?', [criteria.hierarchy!.parent_id]))
            })
        }

        // CONDITION JOINS

        if (criteria.representation && Object.keys(criteria.representation).length > 0) {
            filterQuery = filterQuery
                .innerJoin(REPRESENTATION_DATA_TABLE + ' as repCon', function () {
                    let onCondition = this.on('repCon.resource_id', '=', 'f_id')
                    if (criteria.representation?.id) {
                        onCondition.andOn('repCon.id', '=', db.raw('?', [criteria.representation.id]))
                    }
                    if (criteria.representation?.type) {
                        onCondition.andOn('repCon.type', '=', db.raw('?', [criteria.representation.type]))
                    }
                    if (criteria.representation?.role) {
                        onCondition.andOn('repCon.role', '=', db.raw('?', [criteria.representation.role]))
                    }
                    if (criteria.representation?.mime) {
                        onCondition.andOn('repCon.mime', '=', db.raw('?', [criteria.representation.mime]))
                    }
                    if (criteria.representation?.extension) {
                        onCondition.andOn('repCon.extension', '=', db.raw('?', [criteria.representation.extension]))
                    }
                    if (criteria.representation?.is_external) {
                        onCondition.andOn('repCon.is_external', '=', db.raw('?', [criteria.representation.is_external]))
                    }
                    if (criteria.representation?.is_primary) {
                        onCondition.andOn('repCon.is_primary', '=', db.raw('?', [criteria.representation.is_primary]))
                    }
                    if (criteria.representation?.uploading) {
                        onCondition.andOn('repCon.uploading', '=', db.raw('?', [criteria.representation.uploading]))
                    }
                })
        }

        const getMarkValueRawCondition = (value: IMarkItemCriteria['value'], tName: string): Knex.Raw => {
            let condition: Knex.Raw = db.raw(tName + '.value = ?', [value])
            if (value === null) {
                condition = db.raw(tName + '.value IS NULL')
            } else if (value === 'not null') {
                condition = db.raw(tName + '.value IS NOT NULL')
            } else if (Array.isArray(value)) {
                if ('string' === typeof value[0]) {
                    condition = db.raw(tName + '.value ' + value[0] + ' ?', [value[1]])
                } else {
                    condition = db.raw(tName + '.value >= ? AND ' + tName + '.value <= ?', [value[0], value[1]])
                }
            }
            return condition
        }

        if (criteria.mark && (!Array.isArray(criteria.mark) || Object.keys(criteria.mark).length > 0)) {
            if (!Array.isArray(criteria.mark)) {
                criteria.mark = [criteria.mark]
            }
            let joinCount = 0
            for (const markAndCondition of criteria.mark) {
                const tName = 'mark' + joinCount++
                filterQuery = filterQuery
                    .innerJoin(MARK_DATA_TABLE + ' as ' + tName, function () {
                        let onCondition = this.on(tName + '.resource_id', '=', 'f_id')
                        if (!Array.isArray(markAndCondition)) {
                            onCondition.andOn(tName + '.type', '=', db.raw('?', [markAndCondition.type]))
                            onCondition.andOn(tName + '.name', '=', db.raw('?', [markAndCondition.name]))
                            if (markAndCondition.value !== undefined) {
                                onCondition.andOn(getMarkValueRawCondition(markAndCondition.value, tName))
                            }
                        } else {
                            onCondition.andOn(function () {
                                for (const markOrCondition of markAndCondition) {
                                    this.orOn(function () {
                                        this.andOn(tName + '.type', '=', db.raw('?', [markOrCondition.type]))
                                        this.andOn(tName + '.name', '=', db.raw('?', [markOrCondition.name]))
                                        if (markOrCondition.value !== undefined) {
                                            this.andOn(getMarkValueRawCondition(markOrCondition.value, tName))
                                        }
                                    })
                                }
                            })

                        }
                    })
            }
        }

        // resource conditions
        if (criteria.data) {
            if (criteria.data.id) {
                filterQuery = filterQuery.andWhere({
                    'f_id': criteria.data.id
                })
            }
        }
        if (criteria.hierarchy && criteria.hierarchy.parent_id) {
            filterQuery = filterQuery.orderBy(RESOURCE_HIERARCHY_TABLE + '.order_index', criteria.hierarchy.order || 'asc')
        }


        let query = this.db<typeof columnsConfig>(filterQuery)
            .select()
            .column(columnsConfig)

        // resource tables:
        query = query
            .leftJoin(RESOURCE_DATA_TABLE, function() {
                this.on(RESOURCE_DATA_TABLE + '.id', '=', 'f_t.f_id')
            })
            .leftJoin(RESOURCE_INFO_TABLE, function () {
                this.on(RESOURCE_INFO_TABLE + '.id', '=', RESOURCE_DATA_TABLE + '.id')
            })
            .leftJoin(RESOURCE_HIERARCHY_TABLE, function () {
                this.on(RESOURCE_HIERARCHY_TABLE + '.id', '=', RESOURCE_DATA_TABLE + '.id')
            })

        // representation tables
        query = query
            .leftJoin(REPRESENTATION_DATA_TABLE, function () {
                this.on(REPRESENTATION_DATA_TABLE + '.resource_id', '=', RESOURCE_DATA_TABLE + '.id')
            })
            .leftJoin(REPRESENTATION_INFO_TABLE, function () {
                this.on(REPRESENTATION_INFO_TABLE + '.id', '=', REPRESENTATION_DATA_TABLE + '.id')
            })
            .leftJoin(REPRESENTATION_SOURCE_TABLE, function () {
                this.on(REPRESENTATION_SOURCE_TABLE + '.id', '=', REPRESENTATION_DATA_TABLE + '.id')
            })

        // mark tables
        query = query
            .leftJoin(MARK_DATA_TABLE, function () {
                this.on(MARK_DATA_TABLE + '.resource_id', '=', RESOURCE_DATA_TABLE + '.id')
            })
            .leftJoin(MARK_KV_TABLE, function () {
                this.on(MARK_KV_TABLE + '.resource_id', '=', RESOURCE_DATA_TABLE + '.id')
            })

        if ('undefined' !== typeof criteria.limit) {
            query = query.limit(criteria.limit)
        }

        if ('undefined' !== typeof criteria.offset) {
            query = query.offset(criteria.offset)
        }

        // console.log(query.toSQL())

        // populate data
        const resourcesIndex = new Map<IDString, IResourceDTE>()
        const representationsIndex = new Set<IDString>()
        const markIndex = new Set<string>()
        const kvIndex = new Set<string>()

        const result = await query

        for (const record of result) {
            if (!resourcesIndex.has(record.data_id)) {
                let resourceEntity: IResourceDTE = {
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
                }
                ctx.result.push(resourceEntity)
                resourcesIndex.set(record.data_id, resourceEntity)
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
                        data: record.representation_info_data as (Record<string, unknown> | null)
                    }
                }

                resourcesIndex.get(record.data_id)!.representations.push(representationEntity)
                representationsIndex.add(record.representation_data_id)
            }
            const markKey = '' + record.data_id + record.mark_data_type + record.mark_data_name
            if (!markIndex.has(markKey)) {
                const markEntity = {
                    type: record.mark_data_type,
                    name: record.mark_data_name,
                    value: record.mark_data_value
                }

                resourcesIndex.get(record.data_id)!.marks.push(markEntity)
                markIndex.add(markKey)
            }
            const kvKey = '' + record.kv_component + record.kv_attribute + record.kv_value
            if (!kvIndex.has(kvKey)) {
                let resourceEntity = resourcesIndex.get(record.data_id)!
                if ('undefined' === typeof resourceEntity.kv[record.kv_component]) {
                    resourceEntity.kv[record.kv_component] = {}
                }
                resourceEntity.kv[record.kv_component][record.kv_attribute] = record.kv_value
                kvIndex.add(kvKey)
            }
        }

        const childrenResult = await this.db<IResourceHierarchyRecord>(RESOURCE_HIERARCHY_TABLE)
            .select()
            .whereIn('parent_id', Array.from(resourcesIndex.keys()))
            .orderBy([{column: 'parent_id'} , {column: 'order_index'}])

        for (const childRecord of childrenResult) {
            const resourceEntity = resourcesIndex.get(childRecord.parent_id as string)!
            resourceEntity.hierarchy.children.push({
                id: childRecord.id,
                order_index: childRecord.order_index
            })
        }

        return ctx
    }
}