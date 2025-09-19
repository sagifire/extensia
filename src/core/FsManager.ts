import path from 'node:path'
import fs from 'node:fs/promises'
import type Config from './Config.js'
import { AsyncLockQueue } from './AsyncLockQueue.js'
import { fileTypeFromFile } from 'file-type'
import {
    IDString, IInitiable,
    ILogger, IMarkData, IMarkParam,
    IRepresentationDTE, IResourceDTE, IResourceKV,
    IResourceMetafile, IUploadingPartReport
} from './contracts.js'
import { nowInS } from './utils.js'
import { Context, PromisedContext } from './Context.js'
import { ErrorCodes } from './ErrorCodes.js'

export type HierarchyNode = {
    parent: IDString | null,
    children: Record<IDString, HierarchyNode>
    representations: Record<IDString, boolean>
}

const HIERARCHY_LOCK_NAME = 'hierarchy'

export default class FsManager implements IInitiable {

    protected absoluteRoot: string
    protected lockQueue: AsyncLockQueue<IDString>
    protected hierarchyIndexTree: HierarchyNode = { parent: null, children: {}, representations: {} }
    protected hierarchyIndexMap: Map<IDString, HierarchyNode> = new Map()
    protected representationResourceMap: Map<IDString, IDString> = new Map()

    constructor(
        protected readonly config: Config['storage'],
        protected readonly logger: ILogger
    ) {
        this.absoluteRoot = path.resolve(config.root)
        this.lockQueue = new AsyncLockQueue<IDString>()
    }

    async init(): PromisedContext {
        if (!await fs.access(this.absoluteRoot).then(() => true).catch(() => false)) {
            await fs.mkdir(this.absoluteRoot, { recursive: true })
        }
        return await this.initHierarchyIndex()
    }

    protected getHierarchyIndexFilePath() {
        return path.join(this.absoluteRoot, 'hierarchy.json')
    }

    protected indexHierarchyNodeRecursive(node: HierarchyNode) {
        for (const childId of Object.keys(node.children)) {
            const childNode = node.children[childId]
            this.hierarchyIndexMap.set(childId, childNode)
            for (const representationId of Object.keys(childNode.representations)) {
                this.representationResourceMap.set(representationId, childId)
            }
            this.indexHierarchyNodeRecursive(childNode)
        }
    }

    protected async initHierarchyIndex(): PromisedContext {
        let ctx = new Context()
        try {
            this.hierarchyIndexMap.clear()
            this.representationResourceMap.clear()
            const hierarchyIndexFilePath = this.getHierarchyIndexFilePath()
            if (await fs.access(hierarchyIndexFilePath).then(() => true).catch(() => false)) {
                this.hierarchyIndexTree = JSON.parse(await fs.readFile(hierarchyIndexFilePath, { encoding: 'utf-8' }))
                this.indexHierarchyNodeRecursive(this.hierarchyIndexTree)
            }
        } catch (e) {
            this.hierarchyIndexTree = { parent: null, children: {}, representations: {} }
            ctx.applyException(e)
        }
        return ctx
    }

    protected async saveHierarchyIndex(lock: boolean = true): PromisedContext {
        let ctx = new Context()
        const hiLock = lock ? await this.lockQueue.lock(HIERARCHY_LOCK_NAME) : undefined
        try {
            await fs.writeFile(
                this.getHierarchyIndexFilePath(),
                JSON.stringify(this.hierarchyIndexTree, null, 4) + '\n',
                {
                    encoding: 'utf-8',
                    flag: 'w'
                }
            )
        } catch (e) {
            ctx.applyException(e)
        } finally {
            if (hiLock) {
                hiLock.release()
            }
        }
        return ctx
    }

    public getPath(id: IDString): string[] {
        const ancestors: string[] = []
        let node: HierarchyNode | null | undefined = this.hierarchyIndexMap.get(id);
        while (node?.parent) {
            ancestors.unshift(node.parent)
            node = this.hierarchyIndexMap.get(node.parent)
        }
        return ancestors
    }

    public getResourceIdByRepresentationId(representationId: IDString): IDString | null {
        return this.representationResourceMap.get(representationId) || null
    }

    public resourceMetafileToDTE(resourceMetafile: IResourceMetafile): IResourceDTE {
        return {
            data: {...resourceMetafile.data},
            info: {...resourceMetafile.info},
            marks: structuredClone(resourceMetafile.marks),
            kv: structuredClone(resourceMetafile.kv),
            representations: structuredClone(resourceMetafile.representations),
            hierarchy: {
                children: resourceMetafile.hierarchy.children.map(value => structuredClone(value)),
                order_index: resourceMetafile.hierarchy.order_index,
                parent_id: resourceMetafile.hierarchy.parent_id,
                path: this.getPath(resourceMetafile.data.id)
            }
        }
    }

    public resourceDTEToMetafile(resourceEntity: IResourceDTE): IResourceMetafile {
        return {
            data: {...resourceEntity.data},
            info: {...resourceEntity.info},
            marks: structuredClone(resourceEntity.marks),
            kv: structuredClone(resourceEntity.kv),
            representations: structuredClone(resourceEntity.representations),
            hierarchy: {
                children: resourceEntity.hierarchy.children.map(value => structuredClone(value)),
                order_index: resourceEntity.hierarchy.order_index,
                parent_id: resourceEntity.hierarchy.parent_id
            }
        }
    }

    protected inChildren(id: IDString, needle: IDString): boolean {
        let result = false
        const node = this.hierarchyIndexMap.get(id)
        for (const childId of Object.keys(node?.children ?? {})) {
            if (childId === needle) {
                result = true
                break
            } else if (this.inChildren(childId, needle)) {
                result = true
                break
            }
        }
        return result
    }

    protected getAllChildIds(id: IDString): IDString[] {
        const result: IDString[] = []
        const node = this.hierarchyIndexMap.get(id)
        for (const childId of Object.keys(node?.children ?? {})) {
            result.push(childId)
            result.push(...this.getAllChildIds(childId))
        }
        return result
    }

    protected deleteFromIndex(id: IDString): void {
        const node = this.hierarchyIndexMap.get(id)
        if (node) {
            for (const representationId of Object.keys(node.representations)) {
                this.representationResourceMap.delete(representationId)
            }
            if (node.parent) {
                const parentNode = this.hierarchyIndexMap.get(node.parent)
                if (parentNode) {
                    delete parentNode.children[id]
                }
            } else {
                delete this.hierarchyIndexTree.children[id]
            }
            this.hierarchyIndexMap.delete(id)
        }
    }

    public getResourceDirectory(id: IDString): string {
        return path.join(
            this.absoluteRoot,
            id.substring(0, 2),
            id.substring(2, 4),
            id.substring(4, 6),
            id.substring(6, 8),
            id
        );
    }

    public getResourceFilePath(id: IDString): string {
        return path.join(this.getResourceDirectory(id), id + '.json')
    }

    public async createResourceMetafile(resourceMetafile: IResourceMetafile): PromisedContext {
        let ctx = new Context()

        const resourceFilePath = this.getResourceFilePath(resourceMetafile.data.id)
        const resourceDirectory = this.getResourceDirectory(resourceMetafile.data.id)

        if (resourceMetafile.hierarchy.parent_id) {
            if (!await this.resourceExists(resourceMetafile.hierarchy.parent_id)) {
                ctx.setError(ErrorCodes.PARENT_NOT_FOUND, { entity: 'resource'}, { id: resourceMetafile.hierarchy.parent_id })
                return ctx
            }
            if (this.inChildren(resourceMetafile.data.id, resourceMetafile.hierarchy.parent_id)) {
                ctx.setError(
                    ErrorCodes.CONFLICT,
                    { reason: 'Cyclic hierarchy detected, cannot create resource' },
                    { id: resourceMetafile.data.id, conflict_id: resourceMetafile.hierarchy.parent_id }
                )
                return ctx
            }
        }
        resourceMetafile.representations = []
        resourceMetafile.hierarchy.children = []

        const resLock = await this.lockQueue.lockMany([resourceMetafile.data.id, HIERARCHY_LOCK_NAME])
        try {
            await fs.mkdir(resourceDirectory, { recursive: true })
            await fs.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + '\n', {
                encoding: 'utf-8',
                flag: 'wx'
            })
            const node: HierarchyNode = {
                parent: resourceMetafile.hierarchy.parent_id,
                children: {},
                representations: {}
            }
            this.hierarchyIndexMap.set(resourceMetafile.data.id, node)
            if (resourceMetafile.hierarchy.parent_id) {
                const parentNode = this.hierarchyIndexMap.get(resourceMetafile.hierarchy.parent_id)
                if (parentNode) {
                    parentNode.children[resourceMetafile.data.id] = node
                } else {
                    ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Parent node not found' }, { id: resourceMetafile.hierarchy.parent_id })
                }
            } else {
                this.hierarchyIndexTree.children[resourceMetafile.data.id] = node
            }
            ctx.apply(await this.saveHierarchyIndex(false))
        } catch (e) {
            ctx.applyException(e)
        } finally {
            resLock.releaseAll()
        }
        return ctx
    }

    protected async updateResourceMetafile(
        resourceId: IDString,
        patch: IResourceMetafile | ((resourceMetafile: IResourceMetafile) => Promise<IResourceMetafile>),
        lock: boolean = true
    ): PromisedContext {
        let ctx = new Context()
        let resourceMetafile: IResourceMetafile | null = null
        const resLock = lock ? await this.lockQueue.lock(resourceId) : undefined
        try {
            if ('function' === typeof patch) {
                let resourceMetafileCtx = await this.getResourceMetafile(resourceId)
                if (resourceMetafileCtx.isSuccess() && resourceMetafileCtx.result) {
                    resourceMetafile = await patch(resourceMetafileCtx.result)
                } else {
                    if (resourceMetafileCtx.isFailed()) {
                        ctx.apply(resourceMetafileCtx)
                    } else {
                        ctx.setError(ErrorCodes.INVALID_DATA, { entity: 'resource metafile' }, { id: resourceId })
                    }
                }
            } else {
                resourceMetafile = patch
            }
            if (ctx.isSuccess() && resourceMetafile) {
                resourceMetafile.data.updated_at = nowInS()
                const resourceFilePath = this.getResourceFilePath(resourceId)
                    await fs.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + '\n', {
                        encoding: 'utf-8',
                        flag: 'w'
                    })
            }
        } catch (e) {
            ctx.applyException(e)
        } finally {
            if (resLock) {
                resLock.release()
            }
        }
        return ctx
    }

    public async updateResource(resourceMetafile: IResourceMetafile): PromisedContext {
        let ctx = new Context()

        if (await this.resourceExists(resourceMetafile.data.id)) {
            const oldMetafileCtx = await this.getResourceMetafile(resourceMetafile.data.id)
            if (oldMetafileCtx.isFailed()) {
                ctx.apply(oldMetafileCtx)
                return ctx
            }

            const oldMetafile = oldMetafileCtx.result
            if (!oldMetafile) {
                ctx.setError(ErrorCodes.INVALID_DATA, { entity: 'resource metafile' }, { id: resourceMetafile.data.id })
                return ctx
            }

            const resLock = await this.lockQueue.lock(resourceMetafile.data.id)
            try {
                resourceMetafile.representations = oldMetafile.representations
                resourceMetafile.hierarchy.children = oldMetafile.hierarchy.children
                resourceMetafile.hierarchy.parent_id = oldMetafile.hierarchy.parent_id
                resourceMetafile.data.updated_at = nowInS()
                resourceMetafile.data.is_deleted = false

                ctx.apply(
                    await this.updateResourceMetafile(resourceMetafile.data.id, resourceMetafile, false)
                )
            } catch (e) {
                ctx.applyException(e)
            } finally {
                resLock.release()
            }
        }
        return ctx
    }

    public async getResourceMetafile(resourceId: IDString): PromisedContext<IResourceMetafile|null> {
        let ctx = new Context<IResourceMetafile|null>(null)
        try {
            let resourceFilePath = this.getResourceFilePath(resourceId)
            if (!await fs.access(resourceFilePath).then(() => true).catch(() => false)) {
                ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource metafile' }, { id: resourceId })
                return ctx
            }
            let content = await fs.readFile(resourceFilePath, { encoding: 'utf-8' })
            ctx.result = JSON.parse(content) as IResourceMetafile
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async appendChild(resourceID: IDString, childID: IDString): PromisedContext {
        let ctx = new Context()

        const childNode = this.hierarchyIndexMap.get(childID)
        if (!childNode) {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { id: childID })
            return ctx
        }

        const oldParentId: IDString | null = childNode.parent
        let lockList: IDString[] = [resourceID, childID, HIERARCHY_LOCK_NAME]
        if (oldParentId) {
            lockList.push(oldParentId)
        }
        const resLock = await this.lockQueue.lockMany(lockList)
        try {
            if (this.inChildren(childID, resourceID)) {
                ctx.setError(ErrorCodes.CONFLICT, { reason: 'Cyclic hierarchy detected, cannot append child' }, { id: childID, conflict_id: resourceID })
                return ctx
            }
            let resourceNode = this.hierarchyIndexMap.get(resourceID)
            if (resourceNode) {
                if (resourceNode.children[childID]) {
                    if (this.logger.warn) {
                        this.logger.warn('Child already exists, cannot append child')
                    }
                    return ctx
                }
            }

            const resourceEntityCtx = await this.getResourceMetafile(resourceID)
            const childEntityCtx = await this.getResourceMetafile(childID)
            const oldParentCtx = oldParentId ? await this.getResourceMetafile(oldParentId) : undefined

            if (!resourceEntityCtx.result) {
                if (resourceEntityCtx.isFailed()) {
                    ctx.apply(resourceEntityCtx)
                } else {
                    ctx.setError(ErrorCodes.INVALID_DATA, { entity: 'resource metafile' }, { id: resourceID })
                }
                return ctx
            }

            if (!childEntityCtx.result) {
                if (childEntityCtx.isFailed()) {
                    ctx.apply(childEntityCtx)
                } else {
                    ctx.setError(ErrorCodes.INVALID_DATA, { entity: 'resource metafile' }, { id: childID })
                }
                return ctx
            }

            if (oldParentCtx && !oldParentCtx.result) {
                if (oldParentCtx.isFailed()) {
                    ctx.apply(oldParentCtx)
                } else {
                    ctx.setError(ErrorCodes.INVALID_DATA, { entity: 'resource metafile' }, { id: oldParentId })
                }
            }

            let resourceEntity = resourceEntityCtx.result
            let childEntity = childEntityCtx.result

            childEntity.hierarchy.parent_id = resourceID

            resourceEntity.hierarchy.children = resourceEntity.hierarchy.children.concat({
                id: childID,
                order_index: childEntity.hierarchy.order_index
            }).sort((a, b) => a.order_index - b.order_index)

            ctx.apply(await this.updateResourceMetafile(resourceID, resourceEntity, false))

            if (ctx.isSuccess()) {
                ctx.apply(await this.updateResourceMetafile(childID, childEntity, false))

                if (oldParentId && ctx.isSuccess()) {
                    ctx.apply(
                        await this.updateResourceMetafile(oldParentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                            resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter(value => value.id !== childID)
                            resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                            return resourceMetafile
                        }, false)
                    )

                    let oldParentNode = this.hierarchyIndexMap.get(oldParentId)
                    if (oldParentNode) {
                        delete oldParentNode.children[childID]
                    } else {
                        ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Old parent node not found' }, { id: oldParentId })
                    }
                }

                if (ctx.isSuccess()) {
                    let childNode = this.hierarchyIndexMap.get(childID)
                    if (oldParentId === null) {
                        delete this.hierarchyIndexTree.children[childID]
                    }
                    if (resourceNode && childNode) {
                        resourceNode.children[childID] = childNode
                        childNode.parent = resourceID
                        ctx.apply(await this.saveHierarchyIndex(false))
                    } else {
                        ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Resource or child node not found' }, { id: resourceID, child_id: childID })
                    }
                }
            }
        } catch(e) {
            ctx.applyException(e)
        } finally {
            resLock.releaseAll()
        }
        return ctx
    }

    public async deleteResource(resourceId: IDString, recursive: boolean = false): PromisedContext {
        let ctx = new Context()

        if (!await this.resourceExists(resourceId)) {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { id: resourceId })
            return ctx
        }

        //let result = false
        let lockList: IDString[] = [resourceId, HIERARCHY_LOCK_NAME]
        let childIds: IDString[]

        let parentId: IDString | null = this.hierarchyIndexMap.get(resourceId)?.parent || null
        if (parentId) {
            lockList.push(parentId)
        }

        if (recursive) {
            childIds = this.getAllChildIds(resourceId)
        } else {
            childIds = Object.keys(this.hierarchyIndexMap.get(resourceId)?.children || {})
        }
        lockList = lockList.concat(childIds)

        const resLock = await this.lockQueue.lockMany(lockList)
        try {
            ctx.apply(await this.deleteResourceFiles(resourceId))
            if (ctx.isFailed()) {
                return ctx
            }
            if (recursive) {
                for (const childId of childIds) {
                    ctx.apply(await this.deleteResourceFiles(childId))
                    this.deleteFromIndex(childId)
                }
            } else {
                for (const childId of childIds) {
                    ctx.apply(
                        await this.updateResourceMetafile(childId, async (resourceMetafile): Promise<IResourceMetafile> => {
                            resourceMetafile.hierarchy.parent_id = null
                            return resourceMetafile
                        }, false)
                    )
                    if (ctx.isSuccess()) {
                        let childNode = this.hierarchyIndexMap.get(childId)
                        if (childNode) {
                            childNode.parent = null
                            this.hierarchyIndexTree.children[childId] = childNode
                        } else {
                            ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Child node not found' }, { id: childId })
                        }
                    }
                }
            }
            if (parentId && ctx.isSuccess()) {
                ctx.apply(
                    await this.updateResourceMetafile(parentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter(value => value.id !== resourceId)
                        resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                        return resourceMetafile
                    }, false)
                )
            }

            this.deleteFromIndex(resourceId)
            if (ctx.isSuccess()) {
                await this.saveHierarchyIndex(false)
            }
        } catch (e) {
            ctx.applyException(e)
        } finally {
            resLock.releaseAll()
        }
        return ctx
    }

    protected async deleteResourceFiles(resourceId: IDString): PromisedContext {
        let ctx = new Context()
        const resourceDirectory = this.getResourceDirectory(resourceId)
        try {
            await fs.rm(resourceDirectory, { recursive: true, force: true })

            const checkPaths = [
                path.join(
                    this.absoluteRoot,
                    resourceId.substring(0, 2),
                    resourceId.substring(2, 4),
                    resourceId.substring(4, 6),
                    resourceId.substring(6, 8)
                ),
                path.join(this.absoluteRoot,
                    resourceId.substring(0, 2),
                    resourceId.substring(2, 4),
                    resourceId.substring(4, 6)
                ),
                path.join(this.absoluteRoot, resourceId.substring(0, 2), resourceId.substring(2, 4)),
                path.join(this.absoluteRoot, resourceId.substring(0, 2))
            ]
            for (const checkPath of checkPaths) {
                let isEmpty = false
                const dir = await fs.opendir(checkPath)
                if (null === await dir.read()) {
                    isEmpty = true
                    await fs.rm(checkPath, { recursive: true, force: true })
                }
                await dir.close()
                if (!isEmpty) {
                    break
                }
            }
        } catch (e) {
            ctx.applyException(e)
        }
        return ctx
    }

    public async resourceExists(resourceId: IDString): Promise<boolean> {
        const resourceFilePath = this.getResourceFilePath(resourceId)
        return await fs.access(resourceFilePath).then(() => true).catch(() => false)
    }

    public async changeParent(resourceId: IDString, newParentId: IDString | null): PromisedContext {
        let ctx = new Context()
        let lockList: IDString[] = [resourceId, HIERARCHY_LOCK_NAME]
        const oldParentId: IDString | null = this.hierarchyIndexMap.get(resourceId)?.parent || null
        if (oldParentId === newParentId) {
            return ctx
        }
        if (oldParentId) {
            lockList.push(oldParentId)
        }
        if (newParentId) {
            if (newParentId && !await this.resourceExists(newParentId)) {
                ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { id: newParentId })
                return ctx
            }
            if (this.inChildren(resourceId, newParentId)) {
                ctx.setError(ErrorCodes.CONFLICT, { reason: 'Cyclic hierarchy detected, cannot change parent' }, { id: resourceId, conflict_id: newParentId })
                return ctx
            }
            lockList.push(newParentId)
        }
        const resLock = await this.lockQueue.lockMany(lockList)
        try {
            let node = this.hierarchyIndexMap.get(resourceId)
            if (node) {
                node.parent = newParentId
            } else {
                ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Resource node not found' }, { id: resourceId })
                return ctx
            }
            if (oldParentId) {
                const oldParentNode = this.hierarchyIndexMap.get(oldParentId)
                if (oldParentNode) {
                    delete oldParentNode.children[resourceId]
                } else {
                    ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'Old parent node not found' }, { id: resourceId })
                    return ctx
                }
                ctx.apply(
                    await this.updateResourceMetafile(oldParentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter(value => value.id !== resourceId)
                        resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                        return resourceMetafile
                    }, false)
                )
            }
            if (newParentId && ctx.isSuccess()) {
                let parentNode = this.hierarchyIndexMap.get(newParentId)
                if (parentNode ) {
                    if (node) {
                        parentNode.children[resourceId] = node
                    }
                } else {
                    ctx.setError(ErrorCodes.BROKEN_INDEX, { reason: 'New parent node not found' }, { id: newParentId })
                    return ctx
                }
                ctx.apply(
                    await this.updateResourceMetafile(newParentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        resourceMetafile.hierarchy.children.push({
                            id: resourceId,
                            order_index: 0
                        })
                        resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                        return resourceMetafile
                    }, false)
                )
            }

            if (ctx.isSuccess()) {
                ctx.apply(
                    await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        resourceMetafile.hierarchy.parent_id = newParentId
                        resourceMetafile.hierarchy.order_index = 0
                        return resourceMetafile
                    }, false)
                )
            }

            if (ctx.isSuccess()) {
                ctx.apply(await this.saveHierarchyIndex(false))
            }
        } catch (e) {
            ctx.applyException(e)
        } finally {
            resLock.releaseAll()
        }
        return ctx
    }

    public async changeOrderIndex(resourceId: IDString, newOrderIndex: number): PromisedContext {
        let ctx = new Context()
        if (!await this.resourceExists(resourceId)) {
            ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource' }, { id: resourceId })
            return ctx
        }
        let lockList: IDString[] = [resourceId]
        const parentId = this.hierarchyIndexMap.get(resourceId)?.parent || null
        if (parentId) {
            lockList.push(parentId)
        }
        const lock = await this.lockQueue.lockMany(lockList)
        try {
            ctx.apply(
                await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    resourceMetafile.hierarchy.order_index = newOrderIndex
                    return resourceMetafile
                }, false)
            )
            if (parentId && ctx.isSuccess()) {
                ctx.apply(
                    await this.updateResourceMetafile(parentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        for (const child of resourceMetafile.hierarchy.children) {
                            if (child.id === resourceId) {
                                child.order_index = newOrderIndex
                            }
                        }
                        resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                        return resourceMetafile
                    }, false)
                )
            }
            if (ctx.isSuccess()) {
                ctx.apply(await this.saveHierarchyIndex(false))
            }
        } catch (e) {
            ctx.applyException(e)
        } finally {
            lock.releaseAll()
        }
        return ctx
    }

    public async createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): PromisedContext {
        let ctx = new Context()
        const lock = await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME])
        const isPrimary = representationEntity.data.is_primary
        try {
            const nowTimeInS = nowInS()
            representationEntity.data.created_at = nowTimeInS
            representationEntity.data.updated_at = nowTimeInS
            representationEntity.data.is_primary = false
            representationEntity.data.uploading = false

            if (!representationEntity.data.is_external) {
                representationEntity.data.uploading = true
                representationEntity.info.data = {
                    uploaded: [],
                    assumedSize: undefined,
                } as Record<string, unknown>

                const filePath = path.join(
                    this.getResourceDirectory(resourceId),
                    representationEntity.data.id + '.' + (representationEntity.data.extension || 'unknown')
                )
                let fh = await fs.open(filePath, 'a')
                await fh.close()
                await fs.utimes(filePath, nowTimeInS, nowTimeInS)
            }

            let resourceMetafileCtx = await this.getResourceMetafile(resourceId)
            if (!resourceMetafileCtx.result) {
                if (resourceMetafileCtx.isFailed()) {
                    ctx.apply(resourceMetafileCtx)
                } else {
                    ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource metafile' }, { id: resourceId })
                }
                return ctx
            }
            const resourceMetafile = resourceMetafileCtx.result

            resourceMetafile.representations.push(representationEntity)
            if (isPrimary) {
                for (const rep of resourceMetafile.representations) {
                    rep.data.is_primary = rep.data.id === representationEntity.data.id
                }
            }
            ctx.apply(
                await this.updateResourceMetafile(resourceId, resourceMetafile, false)
            )
            if (ctx.isSuccess()) {
                this.representationResourceMap.set(representationEntity.data.id, resourceId)
                const node = this.hierarchyIndexMap.get(resourceId)
                if (node) {
                    node.representations[representationEntity.data.id] = isPrimary
                }
                ctx.apply(await this.saveHierarchyIndex(false))
            }
        } catch (e) {
            ctx.applyException(e)
        } finally {
            lock.releaseAll()
        }
        return ctx
    }

    public async uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset: number = 0, length: number | undefined = undefined): PromisedContext<IUploadingPartReport> {
        let report: IUploadingPartReport = {
            status: false,
            resourceId: null,
            isComplete: false,
            data: null
        }
        let ctx = new Context<IUploadingPartReport>(report)

        let fileHandler: fs.FileHandle | undefined = undefined
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            report.resourceId = resourceId
            const lock = await this.lockQueue.lock(resourceId)
            try {
                let resourceMetafileCtx = await this.getResourceMetafile(resourceId)
                if (!resourceMetafileCtx.result) {
                    if (resourceMetafileCtx.isFailed()) {
                        ctx.apply(resourceMetafileCtx)
                    } else {
                        ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource metafile' }, { id: resourceId })
                    }
                    return ctx
                }
                const resourceMetafile = resourceMetafileCtx.result

                let representation = resourceMetafile.representations.find(value => value.data.id === representationId) || null
                if (representation) {
                    report.isComplete = !representation.data.uploading
                    report.data = representation.info.data

                    if (!representation.data.is_external) {
                        const filePath = path.join(
                            this.getResourceDirectory(resourceId),
                            representation.data.id + '.' + (representation.data.extension || 'unknown')
                        )
                        fileHandler = await fs.open(filePath, 'a+')
                        await fileHandler.write(chunk, 0, length, offset)
                        await fileHandler.close()
                        fileHandler = undefined

                        const lowerBound = offset
                        const upperBound = offset + (length || chunk.length)
                        const newParts: {
                            lower: number,
                            upper: number,
                        }[] = []
                        const oldParts: {
                            lower: number,
                            upper: number,
                        }[] = representation.info.data?.uploaded as {
                            lower: number,
                            upper: number,
                        }[] || []
                        let mergePart: {
                            lower: number,
                            upper: number,
                        } | null = null

                        for (const oldPart of oldParts) {
                            let isIntersected = Math.max(oldPart.lower, lowerBound) < Math.min(oldPart.upper, upperBound)
                            if (isIntersected) {
                                if (mergePart) {
                                    mergePart.lower = Math.min(oldPart.lower, lowerBound)
                                    mergePart.upper = Math.max(oldPart.upper, upperBound)
                                } else {
                                    mergePart = {
                                        lower: Math.max(oldPart.lower, lowerBound),
                                        upper: Math.min(oldPart.upper, upperBound)
                                    }
                                }
                            } else {
                                if (mergePart) {
                                    newParts.push(mergePart)
                                    mergePart = null
                                }
                                newParts.push(oldPart)
                            }
                        }
                        if (mergePart) {
                            newParts.push(mergePart)
                        }
                        if (newParts.length === 0) {
                            newParts.push({
                                lower: lowerBound,
                                upper: upperBound
                            })
                        }
                        if (newParts[0].lower === 0 && newParts[0].upper === representation.info.data?.assumedSize) {
                            representation.data.uploading = false
                            const filetype = await fileTypeFromFile(filePath)
                            representation.data.mime = filetype?.mime || null
                            if (filetype?.ext && representation.data.extension !== filetype.ext) {
                                representation.data.extension = filetype.ext || null
                                const newFilePath = path.join(
                                    this.getResourceDirectory(resourceId),
                                    representation.data.id + '.' + (representation.data.extension || 'unknown')
                                )
                                await fs.rename(filePath, newFilePath)
                            }
                            report.isComplete = true
                        } else {
                            representation.info.data = {
                                uploaded: newParts,
                                assumedSize: representation.info.data?.assumedSize || undefined
                            }
                        }
                        report.data = representation.info.data
                        ctx.apply(
                            await this.updateResourceMetafile(resourceId, resourceMetafile, false)
                        )
                        report.status = ctx.status
                    }
                }
            } catch (e) {
                ctx.applyException(e)
            } finally {
                if (fileHandler) {
                    await fileHandler.close()
                }
                lock.release()
            }
        }
        return ctx
    }

    public async finishRepresentationUpload(representationId: IDString): PromisedContext {
        let ctx = new Context()
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            const lock = await this.lockQueue.lock(resourceId)
            try {
                let resourceMetafileCtx = await this.getResourceMetafile(resourceId)
                if (!resourceMetafileCtx.result) {
                    if (resourceMetafileCtx.isFailed()) {
                        ctx.apply(resourceMetafileCtx)
                    } else {
                        ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource metafile' }, { id: resourceId })
                    }
                    return ctx
                }
                const resourceMetafile = resourceMetafileCtx.result

                let representation = resourceMetafile.representations.find(value => value.data.id === representationId) || null
                if (representation) {
                    if (!representation.data.is_external) {
                        const filePath = path.join(
                            this.getResourceDirectory(resourceId),
                            representation.data.id + '.' + (representation.data.extension || 'unknown')
                        )
                        representation.data.uploading = false
                        const filetype = await fileTypeFromFile(filePath)
                        representation.data.mime = filetype?.mime || null
                        if (filetype?.ext && representation.data.extension !== filetype.ext) {
                            representation.data.extension = filetype.ext || null
                            const newFilePath = path.join(
                                this.getResourceDirectory(resourceId),
                                representation.data.id + '.' + (representation.data.extension || 'unknown')
                            )
                            await fs.rename(filePath, newFilePath)
                        }
                        representation.info.data = {}
                        ctx.apply(
                            await this.updateResourceMetafile(resourceId, resourceMetafile, false)
                        )
                    }
                }
            } catch (e) {
                ctx.applyException(e)
            } finally {
                lock.release()
            }
        }
        return ctx
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString, lock: boolean = true): PromisedContext {
        let ctx = new Context()
        const resLock = lock ? await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME]) : null
        try {
            let node = this.hierarchyIndexMap.get(resourceId)
            if (node && 'undefined' !== typeof node.representations[representationId]) {
                for (const repId in node.representations) {
                    node.representations[repId] = repId === representationId
                }
                ctx.apply(await this.saveHierarchyIndex(false))
            } else {
                ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'representation' }, { resourceId, representationId })
                return ctx
            }

            ctx.apply(
                await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    for (const representation of resourceMetafile.representations) {
                        representation.data.is_primary = representation.data.id === representationId
                    }
                    return resourceMetafile
                }, false)
            )
        } catch (e) {
            ctx.applyException(e)
        } finally {
            if (resLock) {
                resLock.releaseAll()
            }
        }
        return ctx
    }

    public async deleteRepresentation(representationId: IDString): PromisedContext {
        let ctx = new Context()
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            const lock = await this.lockQueue.lockMany([resourceId, HIERARCHY_LOCK_NAME])
            try {
                let resourceMetafileCtx = await this.getResourceMetafile(resourceId)
                if (!resourceMetafileCtx.result) {
                    if (resourceMetafileCtx.isFailed()) {
                        ctx.apply(resourceMetafileCtx)
                    } else {
                        ctx.setError(ErrorCodes.NOT_FOUND, { entity: 'resource metafile' }, { id: resourceId })
                    }
                    return ctx
                }
                const resourceMetafile = resourceMetafileCtx.result
                for (let i = 0; i < resourceMetafile.representations.length; i++) {
                    const representation = resourceMetafile.representations[i]
                    if (representation.data.id === representationId) {
                        resourceMetafile.representations.splice(i, 1)

                        ctx.apply(await this.updateResourceMetafile(resourceId, resourceMetafile, false))

                        if (ctx.isSuccess()) {
                            if (!representation.data.is_external) {
                                const filePath = path.join(
                                    this.getResourceDirectory(resourceId),
                                    representation.data.id + '.' + (representation.data.extension || 'unknown')
                                )
                                await fs.rm(filePath, { force: true })
                            }

                            this.representationResourceMap.delete(representationId)
                            const node = this.hierarchyIndexMap.get(resourceId)
                            if (node && 'undefined' !== typeof node.representations[representationId]) {
                                delete node.representations[representationId]
                            }

                            ctx.apply(await this.saveHierarchyIndex(false))
                        }
                        break
                    }
                }
            } catch (e) {
                ctx.applyException(e)
            } finally {
                lock.releaseAll()
            }
        }
        return ctx
    }

    public async deleteMarks(resourceId: IDString, marks: IMarkParam[]): PromisedContext {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            const toDelete = new Set(marks.map(m => m.name + '|' + m.type))
            resourceMetafile.marks = resourceMetafile.marks.filter(m => !toDelete.has(m.name + '|' + m.type))
            return resourceMetafile
        })
    }

    public async deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (const component in componentKeys) {
                if (!resourceMetafile.kv[component]) continue
                for (const key in componentKeys[component]) {
                    delete resourceMetafile.kv[component][key]
                }
            }
            return resourceMetafile
        })
    }

    public async setMarks(resourceId: IDString, marks: IMarkParam[]): PromisedContext {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            const marksData: IMarkData[] = marks.map(mark => { return { value: 0, ...mark } })
            for (let i = 0; i < resourceMetafile.marks.length; i++) {
                const mark = resourceMetafile.marks[i]
                if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
                    resourceMetafile.marks.splice(i, 1)
                }
            }
            resourceMetafile.marks.push(...marksData)
            return resourceMetafile
        })
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): PromisedContext {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (const component in componentKeys) {
                if ('undefined' === typeof resourceMetafile.kv[component]) {
                    resourceMetafile.kv[component] = { ...componentKeys[component] }
                } else {
                    resourceMetafile.kv[component] = {
                        ...resourceMetafile.kv[component],
                        ...componentKeys[component]
                    }
                }
            }
            return resourceMetafile
        })
    }
}