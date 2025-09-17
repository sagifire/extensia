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
import { nowInMS } from './utils.js'


export default class DbManager {
    constructor(
        protected readonly db: Knex,
        protected readonly config: Config['db'], // reserved
        protected readonly logger: ILogger,
        protected readonly getPaths: (resourceId: IDString) => string[]
    ) {}

    public async createResourceRecord(resourceEntity: IResourceDTE): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                await trx.insert({
                    ...resourceEntity.data,
                    created_at: nowInMS(),
                    updated_at: nowInMS()
                } satisfies IResourceDataRecord).into(RESOURCE_DATA_TABLE)
                await trx.insert({
                    ...resourceEntity.info,
                    id: resourceEntity.data.id
                } satisfies IResourceInfoRecord).into(RESOURCE_INFO_TABLE)
                await trx.insert({
                    ...resourceEntity.hierarchy,
                    id: resourceEntity.data.id,
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
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async resourceExists(resourceId: IDString): Promise<boolean> {
        return !! (await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).where('id', resourceId).first())
    }

    public async appendChild(resourceId: IDString, childID: IDString): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                await trx.update({
                    parent_id: resourceId,
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: childID
                })
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async changeParent(resourceId: IDString, newParentId: IDString | null): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                await trx.update({
                    parent_id: newParentId
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: resourceId
                })
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async changeOrderIndex(resourceId: IDString, newOrderIndex: number): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                await trx.update({
                    order_index: newOrderIndex
                } satisfies Partial<IResourceHierarchyRecord>).from(RESOURCE_HIERARCHY_TABLE).where({
                    id: resourceId
                })
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                trx.rollback()
                this.logger.error(e)
            }
        })

        return result
    }

    public async updateRepresentationInfo(representationId: IDString, info: IRepresentationInfoDTC): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                })

                if (representationRecord) {
                    await trx.update({
                        data: info.data
                    } satisfies Partial<IRepresentationInfoRecord>).from(REPRESENTATION_INFO_TABLE).where({
                        id: representationId
                    })
                    await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }

                trx.commit()
                result = true
            } catch (e) {
                trx.rollback()
                this.logger.error(e)
            }
        })

        return result
    }

    public async createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
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

                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })

                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async updateRepresentation(representationId: IDString, representationEntity: IRepresentationDTE): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                })

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
                        data: representationEntity.info.data
                    } satisfies Partial<IRepresentationInfoRecord>).from(REPRESENTATION_INFO_TABLE).where({
                        id: representationId
                    })
                    await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }

                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
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

    public async deleteResource(resourceId: IDString): Promise<boolean> {
        await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).where('id', resourceId).delete()
        return true
    }

    public async deleteRepresentation(representationId: IDString): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                const representationRecord = await trx.select<IRepresentationDataRecord>().from(REPRESENTATION_DATA_TABLE).where({
                    id: representationId
                })
                if (representationRecord) {
                    await trx.delete().from(REPRESENTATION_DATA_TABLE).where({ id: representationId })
                    await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: representationRecord.resource_id })
                }
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async deleteMarks(resourceId: IDString, marks: { name: string, type: string }[]): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                for (const mark of marks) {
                    await trx.delete().from(MARK_DATA_TABLE).where({
                        resource_id: resourceId,
                        name: mark.name,
                        type: mark.type
                    })
                }
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
                for (const component in componentKeys) {
                    for (const attribute in componentKeys[component]) {
                        await trx.delete().from(MARK_KV_TABLE).where({
                            resource_id: resourceId,
                            component: component,
                            attribute: attribute,
                        })
                    }
                }
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
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
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
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
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString): Promise<boolean> {
        let result = false
        await this.db.transaction(async (trx) => {
            try {
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
                await trx.update({ updated_at: nowInMS() }).from(RESOURCE_DATA_TABLE).where({ id: resourceId })
                trx.commit()
                result = true
            } catch (e) {
                this.logger.error(e)
                trx.rollback()
            }
        })
        return result
    }

    public async deleteAllRecords(): Promise<boolean> {
        await this.db<IResourceDataRecord>(RESOURCE_DATA_TABLE).delete()
        return true
    }

    public getMarkListByType(type: string): Promise<{ name: string, resources: number }[]> {
        return this.db<IMarkDataRecord>(MARK_DATA_TABLE)
            .where({ type: type })
            .groupBy('name')
            .select('name', this.db.raw('count(resource_id) as resources'))
    }
}