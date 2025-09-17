import Plugin from '../core/Plugin.js'
import type Core from '../core/Core.js'
import { IDString, IMarkData, IRepresentationDTE, IResourceInfoDTC, IResourceKV } from '../core/contracts.js'

export default class Storage extends Plugin {
    public constructor(api: Core) {
        super(api)
    }

    public async init(): Promise<void> {
        // TODO IF NEED
    }

    public createResource(factoryData:{
        info: IResourceInfoDTC
        data?: {
            set_ref_id?: string | null
            set_order_index?: number
            locked?: boolean
            hidden?: boolean
        },
        marks?: IMarkData[],
        kv?: IResourceKV,
    }): Promise<boolean> {
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
    }): Promise<IRepresentationDTE | null> {
        return this.api.createRepresentation(resourceId, factoryData)
    }

    public makeRepresentationPrimary(resourceId: IDString, id: IDString): Promise<boolean> {
        return this.api.makeRepresentationPrimary(resourceId, id)
    }

    public deleteResource(id: IDString): Promise<boolean> {
        return this.api.deleteResource(id)
    }

    public deleteRepresentation(id: IDString): Promise<boolean> {
        return this.api.deleteRepresentation(id)
    }

    public deleteMarks(id: IDString, marks: { name: string, type: string}[]): Promise<boolean> {
        return this.api.deleteMark(id, marks)
    }

    public deleteResourceKV(id: IDString, componentKeys: IResourceKV): Promise<boolean> {
        return this.api.deleteResourceKV(id, componentKeys)
    }

    public setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): Promise<boolean> {
        return this.api.setMarks(resourceId, marks)
    }

    public setResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
        return this.api.setResourceKV(resourceId, componentKeys)
    }
}