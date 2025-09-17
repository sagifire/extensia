import Config from './Config.js'
import Core from './Core.js'
import {
    IPlugin,
    ON_CORE_INIT_EVENT,
    ON_PLUGIN_INIT_EVENT,
    ON_STARTED_EVENT
} from './contracts.js'

import Storage from '../services/Storage.js'
import Query from '../services/Query.js'

export default class Extensia {
    protected extensions: Record<string, IPlugin> = {}
    protected core: Core

    constructor(
        config: Config
    ) {
        this.core = new Core(config)
        this.extensions.storage = new Storage(this.core)
        this.extensions.query = new Query(this.core)

        for (const pluginConstructor of config.plugins) {
            const pluginName: string = pluginConstructor.name;
            if (pluginName in this.extensions) {
                throw new Error(`Plugin ${pluginName} already registered`)
            }
            this.extensions[pluginName] = new pluginConstructor(this.core)
        }
    }

    async start() {
        await this.core.init()
        this.core.emit(ON_CORE_INIT_EVENT, this.core)
        this.core.logger.info('Core initialized')

        for (const extName in this.extensions) {
            const ext = this.extensions[extName]
            await ext.init()
            this.core.emit(ON_PLUGIN_INIT_EVENT, this.core, ext)
            this.core.logger.info(`Plugin ${extName} initialized`)
        }
        this.core.emit(ON_STARTED_EVENT, this.core)
        this.core.logger.info('All plugins initialized')
    }

    getConfig() {
        return this.core.config
    }

    ext(name: string): object {
        return this.extensions[name]
    }

    hasExt(name: string): boolean {
        return !!this.extensions[name]
    }

    query(): Query {
        return this.extensions.query as Query
    }

    storage(): Storage {
        return this.extensions.storage as Storage
    }
}