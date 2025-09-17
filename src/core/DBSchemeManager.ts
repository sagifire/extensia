import { type Knex } from 'knex'
import {
    type DBSchemePatch,
    type AppliedPatchRecord,

    APPLY_PATCH_TABLE,
    RESOURCE_DATA_TABLE,
    RESOURCE_INFO_TABLE,
    REPRESENTATION_DATA_TABLE,
    REPRESENTATION_INFO_TABLE,
    REPRESENTATION_SOURCE_TABLE,
    MARK_DATA_TABLE,
    MARK_KV_TABLE, ILogger, IDString
} from './contracts.js'

export default class DBSchemeManager {

    protected appliedPatches: string[] = []
    protected readonly genericPatches: Record<string, DBSchemePatch> = {
        gen_resource_data: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(RESOURCE_DATA_TABLE, (table) => {
                table.string('id', 16).primary()
                table.timestamp('created_at').defaultTo(db.fn.now())
                table.timestamp('updated_at').defaultTo(db.fn.now())
                table.boolean('locked').defaultTo(false)
                table.boolean('hidden').defaultTo(false)
                table.boolean('is_deleted').defaultTo(false)
            })
            return true
        },
        gen_resource_info: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(RESOURCE_INFO_TABLE, (table) => {
                table.string('id', 16).primary()
                table.string('title')
                table.text('description').nullable()

                table.foreign('id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        },
        gen_resource_hierarchy: async(db: Knex): Promise<boolean> => {
            await db.schema.createTable('resource_hierarchy', (table) => {
                table.string('id', 16).primary()
                table.string('parent_id', 16)
                table.integer('order_index').defaultTo(0)

                table.foreign('id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
                table.foreign('parent_id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        },
        gen_representation_data: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(REPRESENTATION_DATA_TABLE, (table) => {
                table.string('id', 16).primary()
                table.string('resource_id', 16)
                table.timestamp('created_at').defaultTo(db.fn.now())
                table.timestamp('updated_at').defaultTo(db.fn.now())
                table.string('type')
                table.string('role')
                table.string('mime').nullable()
                table.string('extension').nullable()
                table.boolean('is_external').defaultTo(false)

                table.foreign('resource_id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
                table.index(['resource_id'])
            })
            return true
        },
        gen_representation_source: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(REPRESENTATION_SOURCE_TABLE, (table) => {
                table.string('id', 16).primary()
                table.string('url').nullable()
                table.string('derived_from', 16).nullable()

                table.foreign('id').references(REPRESENTATION_DATA_TABLE + '.id').onDelete('CASCADE')
                table.foreign('derived_from').references(REPRESENTATION_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        },
        gen_representation_info: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(REPRESENTATION_INFO_TABLE, (table) => {
                table.string('id', 16).primary()
                table.json('data').defaultTo('{}')

                table.foreign('id').references(REPRESENTATION_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        },
        gen_mark_data: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(MARK_DATA_TABLE, (table) => {
                table.string('resource_id', 16)
                table.string('name', 120)
                table.string('type', 120)
                table.integer('value').nullable()

                table.primary(['resource_id', 'name', 'type'])
                table.index(['resource_id'])
                table.index(['name'])
                table.index(['type'])
                table.foreign('resource_id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        },
        gen_mark_kv: async (db: Knex): Promise<boolean> => {
            await db.schema.createTable(MARK_KV_TABLE, (table) => {
                table.string('resource_id', 16)
                table.string('component', 120)
                table.string('attribute', 120)
                table.string('value').nullable()

                table.primary(['resource_id', 'component', 'attribute'])
                table.index(['resource_id'])
                table.foreign('resource_id').references(RESOURCE_DATA_TABLE + '.id').onDelete('CASCADE')
            })
            return true
        }
    }

    constructor(
        protected readonly db: Knex,
        protected readonly logger: ILogger
    ) {}

    async init(applyGeneric: boolean = true) {
        this.appliedPatches = await this.getOrInitAppliedPatches()
        if (applyGeneric) {
            for (const genericPatchId in this.genericPatches) {
                if (!this.appliedPatches.includes(genericPatchId)) {
                    const result = await this.applySchemePatch(genericPatchId, this.genericPatches[genericPatchId])
                    if (!result) {
                        throw new Error('Cannot apply generic patch')
                    }
                }
            }
        }
    }

    async applySchemePatch(id: string, patch: DBSchemePatch): Promise<boolean> {
        if (id in this.appliedPatches) {
            throw new Error('Cannot apply already applied patch')
        }
        const result = await patch(this.db)

        if (result) {
            this.appliedPatches.push(id)
            await this.db(APPLY_PATCH_TABLE).insert({id})
            this.logger.info(`Applied DB scheme patch ${id}`)
        }

        return result
    }

    async rollbackSchemePatch(id: string, patch: DBSchemePatch): Promise<boolean> {
        let result = false;
        if (id in this.genericPatches) {
            throw new Error('Cannot rollback generic patch')
        }
        if (id in this.appliedPatches) {
            result = await patch(this.db)
            if (result) {
                this.appliedPatches = this.appliedPatches.filter(patchId => patchId !== id)
                await this.db(APPLY_PATCH_TABLE).where('id', id).delete()
                this.logger.info(`Rolled back DB scheme patch ${id}`)
            }
        } else {
            throw new Error('Cannot rollback unknown patch')
        }

        return result
    }

    async getOrInitAppliedPatches(): Promise<string[]> {
        let result: string[] = []

        const hasTable = await this.db.schema.hasTable(APPLY_PATCH_TABLE)
        if (hasTable) {
            result = await this.db<AppliedPatchRecord>(APPLY_PATCH_TABLE).select('id').pluck('id')
        } else {
            await this.db.schema.createTable(APPLY_PATCH_TABLE, (table) => {
                table.string('id').primary()
                table.timestamp('on_create').defaultTo(this.db.fn.now())
            })
        }

        return result
    }

    async fullDrop() {

        // rollback custom patches
        for (const patchId in this.appliedPatches.toReversed()) {
            if (patchId in this.genericPatches) {
                continue
            }
            await this.rollbackSchemePatch(patchId, this.genericPatches[patchId])
        }

        // drop generic tables
        await this.db.schema.dropTableIfExists(MARK_DATA_TABLE)
        await this.db.schema.dropTableIfExists(MARK_KV_TABLE)
        await this.db.schema.dropTableIfExists(REPRESENTATION_SOURCE_TABLE)
        await this.db.schema.dropTableIfExists(REPRESENTATION_INFO_TABLE)
        await this.db.schema.dropTableIfExists(REPRESENTATION_DATA_TABLE)
        await this.db.schema.dropTableIfExists(RESOURCE_INFO_TABLE)
        await this.db.schema.dropTableIfExists(RESOURCE_DATA_TABLE)

        // remove patch info from the migration table
        await this.db(APPLY_PATCH_TABLE).delete()
        this.logger.info('DB scheme dropped')
    }
}