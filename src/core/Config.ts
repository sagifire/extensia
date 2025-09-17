import { type Knex } from 'knex'

import { ILogger, type PluginConstructor } from './contracts.js'

export interface ExtensiaConfig {
    db: {
        connection: Knex.Config
        initMigration?: boolean
    },
    storage: {
        root: string
    },
    plugins?: PluginConstructor[],
    logger?: ILogger
}

interface ExtensiaConfigInternal extends ExtensiaConfig {
    db: {
        connection: Knex.Config
        initMigration: boolean
    }
}

export default class Config implements ExtensiaConfig {

    public readonly db: ExtensiaConfigInternal['db']
    public readonly storage: ExtensiaConfigInternal['storage']
    public readonly plugins: PluginConstructor[] = []
    public readonly logger: ILogger

    constructor(initConfig: ExtensiaConfig) {
        this.db = {
            connection: initConfig.db.connection,
            initMigration: initConfig.db.initMigration || true
        }
        this.storage = initConfig.storage
        this.plugins = initConfig.plugins || []
        this.logger = initConfig.logger || console
    }
}