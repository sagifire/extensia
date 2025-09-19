import Plugin from '../core/Plugin.js'
import type Core from '../core/Core.js'
import {
    IDString,
    IMarkData,
    IMarkParam,
    IRepresentationDTE,
    IResourceInfoDTC,
    IResourceKV, IUploadingPartReport
} from '../core/contracts.js'
import { Context, PromisedContext } from '../core/Context.js'

export default class Storage extends Plugin {
    public constructor(api: Core) {
        super(api)
    }

    public async init(): PromisedContext {
        let ctx = new Context()
        // TODO IF NEED
        return ctx
    }

    public createResource(factoryData:{
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
        return this.api.createResource(factoryData)
    }

    public createRepresentation(resourceId: IDString, factoryData: {
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
        return this.api.createRepresentation(resourceId, factoryData)
    }

    public makeRepresentationPrimary(resourceId: IDString, id: IDString): PromisedContext {
        return this.api.makeRepresentationPrimary(resourceId, id)
    }

    public uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset: number = 0, length: number | undefined = undefined): PromisedContext<IUploadingPartReport> {
        return this.api.uploadRepresentationPart(representationId, chunk, offset, length)
    }

    public finishRepresentationUpload(representationId: IDString): PromisedContext {
        return this.api.finishRepresentationUpload(representationId)
    }

    public deleteResource(id: IDString): PromisedContext {
        return this.api.deleteResource(id)
    }

    public deleteRepresentation(id: IDString): PromisedContext {
        return this.api.deleteRepresentation(id)
    }

    public deleteMarks(id: IDString, marks: { name: string, type: string}[]): PromisedContext {
        return this.api.deleteMark(id, marks)
    }

    public deleteResourceKV(id: IDString, componentKeys: IResourceKV): PromisedContext {
        return this.api.deleteResourceKV(id, componentKeys)
    }

    public setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): PromisedContext {
        return this.api.setMarks(resourceId, marks)
    }

    public setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        return this.api.setResourceKV(resourceId, componentKeys)
    }
}