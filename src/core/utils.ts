import { IResourceComponentsIndex, IResourceDTE } from './contracts.js'

export function nowInS(): number {
    return Math.trunc(Date.now() / 1000)
}

export function makeIndexFromResourceEntity(resourceEntity: IResourceDTE): Readonly<IResourceComponentsIndex>  {
    let representationsIndex: IResourceComponentsIndex['representations'] = {}
    let marksIndex: Record<string, true> = {}
    let kvIndex: Record<string, true> = {}

    for (const representation of resourceEntity.representations || []) {
        representationsIndex[representation.data.id] = true
    }
    for (const mark of resourceEntity.marks || []) {
        marksIndex[mark.name + '|' + mark.type] = true
    }
    const kvComponents = resourceEntity.kv || {}
    for (const kvComponent in kvComponents) {
        for (const kvAttribute in kvComponents[kvComponent]) {
            kvIndex[kvComponent + '|' + kvAttribute] = true
        }
    }

    return {
        id: resourceEntity.data.id,
        hierarchy: resourceEntity.hierarchy,
        representations: representationsIndex,
        marks: marksIndex,
        kv: kvIndex
    } as Readonly<IResourceComponentsIndex>
}