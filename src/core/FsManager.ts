import path from 'node:path'
import fs from 'node:fs/promises'
import type Config from './Config.js'
import { AsyncLockQueue } from './AsyncLockQueue.js'
import { fileTypeFromFile } from 'file-type'
import {
    IDString,
    ILogger,
    IRepresentationDTE, IResourceDTE, IResourceKV,
    IResourceMetafile, IUploadingPartReport
} from './contracts.js'
import { nowInMS } from './utils.js'

export type HierarchyNode = {
    parent: IDString | null,
    children: Record<IDString, HierarchyNode>
    representations: Record<IDString, boolean>
}

const HIERARCHY_LOCK_NAME = 'hierarchy'

export default class FsManager {

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

    async init(): Promise<void> {
        await this.initHierarchyIndex()
    }

    protected getHierarchyIndexFilePath() {
        return path.join(this.absoluteRoot, 'hierarchy.json')
    }

    protected indexHierarchyNodeRecursive(node: HierarchyNode): void {
        for (const childId of Object.keys(node.children)) {
            const childNode = node.children[childId]
            this.hierarchyIndexMap.set(childId, childNode)
            for (const representationId of Object.keys(childNode.representations)) {
                this.representationResourceMap.set(representationId, childId)
            }
            this.indexHierarchyNodeRecursive(childNode)
        }
    }

    protected async initHierarchyIndex(): Promise<void> {
        this.hierarchyIndexMap.clear()
        this.representationResourceMap.clear()
        try {
            this.hierarchyIndexTree = JSON.parse(await fs.readFile(this.getHierarchyIndexFilePath(), { encoding: 'utf-8' }))
            this.indexHierarchyNodeRecursive(this.hierarchyIndexTree)
        } catch (e) {
            this.logger.error(e)
            this.hierarchyIndexTree = { parent: null, children: {}, representations: {} }
        }
    }

    protected async saveHierarchyIndex(lock: boolean = true): Promise<void> {
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
            this.logger.error(e)
        } finally {
            if (hiLock) {
                hiLock.release()
            }
        }
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

    public async createResourceMetafile(resourceMetafile: IResourceMetafile): Promise<boolean> {
        let result = true
        const resourceFilePath = this.getResourceFilePath(resourceMetafile.data.id)
        const resourceDirectory = this.getResourceDirectory(resourceMetafile.data.id)

        if (resourceMetafile.hierarchy.parent_id) {
            if (!await this.resourceExists(resourceMetafile.hierarchy.parent_id)) {
                this.logger.error('Parent resource not found, cannot create resource')
                return false
            }
            if (this.inChildren(resourceMetafile.data.id, resourceMetafile.hierarchy.parent_id)) {
                this.logger.error('Cyclic hierarchy detected, cannot create resource')
                return false
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
                    this.logger.error('Parent node not found, need full store reindex')
                }
            } else {
                this.hierarchyIndexTree.children[resourceMetafile.data.id] = node
            }
            await this.saveHierarchyIndex(false)

        } catch (e) {
            this.logger.error(e)
            result = false
        } finally {
            resLock.releaseAll()
        }
        return result
    }

    protected async updateResourceMetafile(
        resourceId: IDString,
        patch: IResourceMetafile | ((resourceMetafile: IResourceMetafile) => Promise<IResourceMetafile>),
        lock: boolean = true
    ): Promise<boolean> {
        let result = true
        let resourceMetafile: IResourceMetafile | null = null
        const resLock = lock ? await this.lockQueue.lock(resourceId) : undefined
        try {
            if ('function' === typeof patch) {
                resourceMetafile = await this.getResourceMetafile(resourceId)
                if (resourceMetafile) {
                    resourceMetafile = await patch(resourceMetafile)
                }
            } else {
                resourceMetafile = patch
            }
            if (resourceMetafile) {
                resourceMetafile.data.updated_at = nowInMS()
                const resourceFilePath = this.getResourceFilePath(resourceId)
                    await fs.writeFile(resourceFilePath, JSON.stringify(resourceMetafile, null, 4) + '\n', {
                        encoding: 'utf-8',
                        flag: 'w'
                    })

            } else {
                result = false
            }
        } catch (e) {
            this.logger.error(e)
            result = false
        } finally {
            if (resLock) {
                resLock.release()
            }
        }
        return result
    }

    public async updateResource(resourceMetafile: IResourceMetafile): Promise<boolean> {
        let result = false

        if (await this.resourceExists(resourceMetafile.data.id)) {
            const oldMetafile = await this.getResourceMetafile(resourceMetafile.data.id)
            if (!oldMetafile) {
                this.logger.error('Old metafile not found, cannot update resource')
                return false
            }

            const resLock = await this.lockQueue.lock(resourceMetafile.data.id)
            try {
                resourceMetafile.representations = oldMetafile.representations
                resourceMetafile.hierarchy.children = oldMetafile.hierarchy.children
                resourceMetafile.hierarchy.parent_id = oldMetafile.hierarchy.parent_id
                resourceMetafile.data.updated_at = nowInMS()
                resourceMetafile.data.is_deleted = false

                await this.updateResourceMetafile(resourceMetafile.data.id, resourceMetafile, false)
            } catch (e) {
                this.logger.error(e)
                result = false
            } finally {
                resLock.release()
            }
        }

        return result
    }

    public async getResourceMetafile(resourceId: IDString): Promise<IResourceMetafile | null> {
        let result = null
        let resourceFilePath = this.getResourceFilePath(resourceId)
        try {
            let content = await fs.readFile(resourceFilePath, { encoding: 'utf-8' })
            result = JSON.parse(content) as IResourceMetafile
        } catch (e) {
            this.logger.error(e)
        }
        return result
    }

    public async appendChild(resourceID: IDString, childID: IDString): Promise<boolean> {
        if (this.inChildren(childID, resourceID)) {
            this.logger.error('Cyclic hierarchy detected, cannot append child')
            return false
        }
        let resourceNode = this.hierarchyIndexMap.get(resourceID)
        if (resourceNode) {
            if (resourceNode.children[childID]) {
                if (this.logger.warn) {
                    this.logger.warn('Child already exists, cannot append child')
                }
                return true
            }
        }

        let result = false
        const resLock = await this.lockQueue.lockMany([resourceID, childID, HIERARCHY_LOCK_NAME])
        try {
            const resourceEntity = await this.getResourceMetafile(resourceID)
            const childEntity = await this.getResourceMetafile(childID)

            if (resourceEntity && childEntity) {
                childEntity.hierarchy.parent_id = resourceID

                resourceEntity.hierarchy.children = resourceEntity.hierarchy.children.concat({
                    id: childID,
                    order_index: childEntity.hierarchy.order_index
                }).sort((a, b) => a.order_index - b.order_index)

                result = await this.updateResourceMetafile(resourceID, resourceEntity, false)
                    && await this.updateResourceMetafile(childID, childEntity, false)

                let childNode = this.hierarchyIndexMap.get(childID)
                if (resourceNode && childNode) {
                    resourceNode.children[childID] = childNode
                    childNode.parent = resourceID
                    await this.saveHierarchyIndex(false)
                } else {
                    this.logger.error('Resource or child node not found, need full store reindex')
                }
            }
        } catch(e) {
            this.logger.error(e)
            result = false
        } finally {
            resLock.releaseAll()
        }
        return result
    }

    public async deleteResource(resourceId: IDString, recursive: boolean = false): Promise<boolean> {
        if (!await this.resourceExists(resourceId)) {
            return false
        }

        let result = false
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
            await this.deleteResourceFiles(resourceId)
            if (recursive) {
                for (const childId of childIds) {
                    await this.deleteResourceFiles(childId)
                    this.deleteFromIndex(childId)
                }
            } else {
                for (const childId of childIds) {
                    await this.updateResourceMetafile(childId, async (resourceMetafile): Promise<IResourceMetafile> => {
                        resourceMetafile.hierarchy.parent_id = null
                        return resourceMetafile
                    }, false)
                    let childNode = this.hierarchyIndexMap.get(childId)
                    if (childNode) {
                        childNode.parent = null
                        this.hierarchyIndexTree.children[childId] = childNode
                    } else {
                        this.logger.error('Child node not found, need full store reindex')
                    }
                }
            }
            if (parentId) {
                await this.updateResourceMetafile(parentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter(value => value.id !== resourceId)
                    resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                    return resourceMetafile
                }, false)
            }

            this.deleteFromIndex(resourceId)
            await this.saveHierarchyIndex(false)
            result = true
        } catch (e) {
            this.logger.error(e)
        } finally {
            resLock.releaseAll()
        }
        return result
    }

    protected async deleteResourceFiles(resourceId: IDString): Promise<void> {
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
        } catch (_e) {}
    }

    public async resourceExists(resourceId: IDString): Promise<boolean> {
        const resourceFilePath = this.getResourceFilePath(resourceId)
        let result = false
        result = await fs.access(resourceFilePath).then(() => true).catch(() => false)
        return result
    }

    public async changeParent(resourceId: IDString, newParentId: IDString | null): Promise<boolean> {
        let result = false
        let lockList: IDString[] = [resourceId, HIERARCHY_LOCK_NAME]
        const oldParentId: IDString | null = this.hierarchyIndexMap.get(resourceId)?.parent || null
        if (oldParentId === newParentId) {
            return true
        }
        if (oldParentId) {
            lockList.push(oldParentId)
        }
        if (newParentId) {
            if (this.inChildren(resourceId, newParentId)) {
                this.logger.error('Cyclic hierarchy detected, cannot change parent')
                return false
            }
            lockList.push(newParentId)
        }
        const resLock = await this.lockQueue.lockMany(lockList)
        try {
            let node = this.hierarchyIndexMap.get(resourceId)
            if (node) {
                node.parent = newParentId
            } else {
                this.logger.error('Old parent node not found, need full store reindex')
            }
            if (oldParentId) {
                const oldParentNode = this.hierarchyIndexMap.get(oldParentId)
                if (oldParentNode) {
                    delete oldParentNode.children[resourceId]
                } else {
                    this.logger.error('Old parent node not found, need full store reindex')
                }
                await this.updateResourceMetafile(oldParentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.filter(value => value.id !== resourceId)
                    resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                    return resourceMetafile
                }, false)
            }
            if (newParentId) {
                let parentNode = this.hierarchyIndexMap.get(newParentId)
                if (parentNode ) {
                    if (node) {
                        parentNode.children[resourceId] = node
                    }
                } else {
                    this.logger.error('New parent node not found, need full store reindex')
                }
                await this.updateResourceMetafile(newParentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    resourceMetafile.hierarchy.children.push({
                        id: resourceId,
                        order_index: 0
                    })
                    resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                    return resourceMetafile
                }, false)
            }
            await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
                resourceMetafile.hierarchy.parent_id = newParentId
                resourceMetafile.hierarchy.order_index = 0
                return resourceMetafile
            }, false)

            await this.saveHierarchyIndex(false)
            result = true
        } catch (e) {
            this.logger.error(e)
        } finally {
            resLock.releaseAll()
        }
        return result
    }

    public async changeOrderIndex(resourceId: IDString, newOrderIndex: number): Promise<boolean> {
        if (!await this.resourceExists(resourceId)) {
            return false
        }
        let lockList: IDString[] = [resourceId]
        const parentId = this.hierarchyIndexMap.get(resourceId)?.parent || null
        if (parentId) {
            lockList.push(parentId)
        }
        let result = false
        const lock = await this.lockQueue.lockMany(lockList)
        try {
            result = await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
                resourceMetafile.hierarchy.order_index = newOrderIndex
                return resourceMetafile
            }, false)
            if (parentId) {
                result = await this.updateResourceMetafile(parentId, async (resourceMetafile): Promise<IResourceMetafile> => {
                    for (const child of resourceMetafile.hierarchy.children) {
                        if (child.id === resourceId) {
                            child.order_index = newOrderIndex
                        }
                    }
                    resourceMetafile.hierarchy.children = resourceMetafile.hierarchy.children.sort((a, b) => a.order_index - b.order_index)
                    return resourceMetafile
                }, false)
            }
            await this.saveHierarchyIndex(false)
        } catch (e) {
            this.logger.error(e)
        } finally {
            lock.releaseAll()
        }
        return result
    }

    public async createRepresentation(resourceId: IDString, representationEntity: IRepresentationDTE): Promise<boolean> {
        const lock = await this.lockQueue.lock(resourceId)
        const isPrimary = representationEntity.data.is_primary
        try {
            const notTimeInMs = nowInMS()
            representationEntity.data.created_at = notTimeInMs
            representationEntity.data.updated_at = notTimeInMs
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
                    representationEntity.data.id + '.' + representationEntity.data.extension
                )
                await fs.utimes(filePath, notTimeInMs, notTimeInMs)
            }

            let resourceMetafile = await this.getResourceMetafile(resourceId)
            if (resourceMetafile) {
                resourceMetafile.representations.push(representationEntity)
                if (isPrimary) {
                    for (const rep of resourceMetafile.representations) {
                        rep.data.is_primary = rep.data.id === representationEntity.data.id
                    }
                }
                await this.updateResourceMetafile(resourceId, resourceMetafile)
            } else {
                this.logger.error('Resource not found, cannot create representation')
            }
        } catch (e) {
            this.logger.error(e)
        } finally {
            lock.release()
        }
        return false
    }

    public async uploadRepresentationPart(representationId: IDString, chunk: Buffer, offset: number = 0, length: number | undefined = undefined): Promise<IUploadingPartReport> {
        let report: IUploadingPartReport = {
            status: false,
            resourceId: null,
            isComplete: false,
            data: null
        }
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            report.resourceId = resourceId
            const lock = await this.lockQueue.lock(resourceId)
            try {
                let resourceMetafile = await this.getResourceMetafile(resourceId)
                if (resourceMetafile) {
                    let representation = resourceMetafile.representations.find(value => value.data.id === representationId) || null
                    if (representation) {
                        report.isComplete = !representation.data.uploading
                        report.data = representation.info.data

                        if (!representation.data.is_external) {
                            const filePath = path.join(
                                this.getResourceDirectory(resourceId),
                                representation.data.id + '.' + representation.data.extension
                            )
                            const fileHandler = await fs.open(filePath, 'w')
                            await fileHandler.write(chunk, offset, length)

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
                            if (newParts[0].lower === 0 && newParts[0].upper === representation.info.data?.assumedSize) {
                                representation.data.uploading = false
                                const filetype = await fileTypeFromFile(filePath)
                                representation.data.mime = filetype?.mime || null
                                if (filetype?.ext && representation.data.extension !== filetype.ext) {
                                    representation.data.extension = filetype.ext || null
                                    const newFilePath = path.join(
                                        this.getResourceDirectory(resourceId),
                                        representation.data.id + '.' + representation.data.extension
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
                            report.status = await this.updateResourceMetafile(resourceId, resourceMetafile)
                        }
                    }
                }
            } catch (e) {
                this.logger.error(e)
            } finally {
                lock.release()
            }
        }
        return report
    }

    public async finishRepresentationUpload(representationId: IDString): Promise<boolean> {
        let result = false
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            const lock = await this.lockQueue.lock(resourceId)
            try {
                let resourceMetafile = await this.getResourceMetafile(resourceId)
                if (resourceMetafile) {
                    let representation = resourceMetafile.representations.find(value => value.data.id === representationId) || null
                    if (representation) {
                        if (!representation.data.is_external) {
                            const filePath = path.join(
                                this.getResourceDirectory(resourceId),
                                representation.data.id + '.' + representation.data.extension
                            )
                            representation.data.uploading = false
                            const filetype = await fileTypeFromFile(filePath)
                            representation.data.mime = filetype?.mime || null
                            if (filetype?.ext && representation.data.extension !== filetype.ext) {
                                representation.data.extension = filetype.ext || null
                                const newFilePath = path.join(
                                    this.getResourceDirectory(resourceId),
                                    representation.data.id + '.' + representation.data.extension
                                )
                                await fs.rename(filePath, newFilePath)
                            }
                            representation.info.data = {}
                            await this.updateResourceMetafile(resourceId, resourceMetafile)
                        }
                    }
                }
            } catch (e) {
                this.logger.error(e)
            } finally {
                lock.release()
            }
        }
        return result
    }

    public async makeRepresentationPrimary(resourceId: IDString, representationId: IDString): Promise<boolean> {
        let node = this.hierarchyIndexMap.get(resourceId)
        if (node && node.representations[representationId]) {
            for (const repId in node.representations) {
                node.representations[repId] = repId === representationId
            }
            await this.saveHierarchyIndex(false)
        } else {
            return false
        }

        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (const representation of resourceMetafile.representations) {
                representation.data.is_primary = representation.data.id === representationId
            }
            return resourceMetafile
        })
    }

    public async deleteRepresentation(representationId: IDString): Promise<boolean> {
        let result = false
        const resourceId = this.representationResourceMap.get(representationId)
        if (resourceId) {
            const lock = await this.lockQueue.lock(resourceId)
            try {
                let resourceMetafile = await this.getResourceMetafile(resourceId)
                if (resourceMetafile) {
                    for (let i = 0; i < resourceMetafile.representations.length; i++) {
                        const representation = resourceMetafile.representations[i]
                        if (representation.data.id === representationId) {
                            resourceMetafile.representations.splice(i, 1)
                            if (!representation.data.is_external) {
                                const filePath = path.join(
                                    this.getResourceDirectory(resourceId),
                                    representation.data.id + '.' + representation.data.extension
                                )
                                await fs.rm(filePath, { force: true })
                            }
                            break
                        }
                    }
                    result = true
                }
            } catch (e) {
                this.logger.error(e)
            } finally {
                lock.release()
            }
        }
        return result
    }

    public async deleteMarks(resourceId: IDString, marks: { name: string, type: string }[]): Promise<boolean> {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (let i = 0; i < resourceMetafile.marks.length; i++) {
                const mark = resourceMetafile.marks[i]
                if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
                    resourceMetafile.marks.splice(i, 1)
                }
            }
            return resourceMetafile
        })
    }

    public async deleteResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (const component in componentKeys) {
                if (componentKeys.hasOwnProperty(component)) {
                    for (const key in componentKeys[component]) {
                        if (componentKeys[component].hasOwnProperty(key)) {
                            delete resourceMetafile.kv[component][key]
                        }
                    }
                }
            }
            return resourceMetafile
        })
    }

    public async setMarks(resourceId: IDString, marks: { name: string, type: string, value: number | null }[]): Promise<boolean> {
        return await this.updateResourceMetafile(resourceId, async (resourceMetafile): Promise<IResourceMetafile> => {
            for (let i = 0; i < resourceMetafile.marks.length; i++) {
                const mark = resourceMetafile.marks[i]
                if (-1 !== marks.findLastIndex((m) => m.name === mark.name && m.type === mark.type)) {
                    resourceMetafile.marks.splice(i, 1)
                }
            }
            resourceMetafile.marks.push(...marks)
            return resourceMetafile
        })
    }

    public async setResourceKV(resourceId: IDString, componentKeys: IResourceKV): Promise<boolean> {
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