import Core from './Core.js'
import { IPlugin } from './contracts.js'

export default abstract class Plugin implements IPlugin {
    public static readonly name: never // need to overload to a string type in plugin implementation

    protected constructor(protected readonly api: Core) {}

    public abstract init(): Promise<void>
}