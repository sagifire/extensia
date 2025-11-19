import Plugin from '../core/Plugin.js'
import type Core from '../core/Core.js'
import { IDString, IMarkCriteria, IResourceDTE } from '../core/contracts.js'
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

    public getMarkStatListByType(type: string): PromisedContext<{ name: string, resources: number }[]> {
        return this.api.getMarkStatListByType(type)
    }

    public  getMarkList(): PromisedContext<Record<string, string[]>> {
        return this.api.getMarkList()
    }

    public async findResourceById(id: IDString) {
        return this.api.findResourceById(id)
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
        return await this.api.findResources(criteria)
    }
}