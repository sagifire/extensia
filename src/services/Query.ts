import Plugin from '../core/Plugin.js'
import type Core from '../core/Core.js'
import { IDString } from '../core/contracts.js'
import { Context, PromisedContext } from '../core/Context.js'

export default class Query extends Plugin {
    constructor(api: Core) {
        super(api)
    }

    public async init(): PromisedContext {
        let ctx = new Context()
        // TODO IF NEED
        return ctx
    }

    public resourceExists(id: string): Promise<boolean> {
        return this.api.resourceExists(id)
    }

    public representationExists(id: IDString): Promise<boolean> {
        return this.api.representationExists(id)
    }

    public markExists(id: IDString, name: string, type: string): Promise<boolean> {
        return this.api.markExists(id, name, type)
    }

    public resourceKVExists(id: IDString, component: string, attribute: string): Promise<boolean> {
        return this.api.resourceKVExists(id, component, attribute)
    }

    public async getMarkListByType(type: string): PromisedContext<{ name: string, resources: number }[]> {
        return await this.api.getMarkListByType(type)
    }
}