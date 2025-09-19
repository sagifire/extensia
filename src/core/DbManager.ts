import { type Knex } from 'knex'
import Config from './Config.js'
import {
    IDString,
    ILogger, IMarkDataRecord, IMarkKVRecord,
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

    public async getMarkListByType(type: string): PromisedContext<{ name: string, resources: number }[]> {
        let ctx = new Context<{ name: string, resources: number }[]>([])
        try {
            ctx.result = await this.db<IMarkDataRecord>(MARK_DATA_TABLE)
                .where({ type: type })
                .groupBy('name')
                .select('name', this.db.raw('count(resource_id) as resources'))
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }
}