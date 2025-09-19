import { ErrorCode, ErrorCodes, ErrorMessages } from './ErrorCodes.js'

export class Context<T = undefined> {
    protected resultValue: T;

    protected statusValue: boolean = true;

    protected errorMessage: string | undefined = undefined;
    protected errorCodeValue: ErrorCode | undefined = undefined;
    protected errorInfoData: Record<string, unknown> = {};

    public scope: Record<string, unknown> = {};

    constructor(...args: [T] extends [undefined] ? [] : [init: T]) {
        this.resultValue = (args.length ? args[0] : undefined) as T
    }

    public isSuccess(): boolean { return this.status }
    public isFailed(): boolean { return !this.status }
    public set status(newStatus:boolean) { this.statusValue = newStatus }
    public get status(): boolean { return this.statusValue }

    public get result(): T { return this.resultValue }
    public set result(newResult: T) { this.resultValue = newResult }

    public $cast<T>() { return this as unknown as Context<T> }
    public setupResult<X>(result: X) {
        const casted = this.$cast<X>();
        casted.result = result;
        return casted;
    }

    public get error(): string | undefined { return this.errorMessage }
    public get errorCode(): ErrorCode | undefined { return this.errorCodeValue }
    public get errorInfo(): Record<string, unknown> { return this.errorInfoData }

    public setError(
        code: ErrorCode,
        placeholders: Record<string, string | number> = {},
        info: Record<string, unknown> = {}
    ) {
        this.status = false;
        if ('undefined' === typeof ErrorCodes[code]) {
            this.errorCodeValue = ErrorCodes.INVALID_ERROR_CODE
            this.errorMessage = this.errorCodeValue + ': ' + ErrorMessages[ErrorCodes.INVALID_ERROR_CODE].replace('{code}', code)
            this.errorInfoData = {
                invalidError: { code, placeholders, info }
            }
        } else {
            this.errorCodeValue = code;
            this.errorMessage = code + ': ' + ErrorMessages[code]
            this.errorInfoData = info;
            for (const placeholderName in placeholders) {
                this.errorMessage = this.errorMessage?.replace(
                    '{' + placeholderName + '}',
                    '' + placeholders[placeholderName]
                )
            }
        }
    }

    public apply<X>(ctx: Context<X>): this {
        this.status = this.status && ctx.status;
        this.errorMessage = ctx.error
        this.errorCodeValue = ctx.errorCode
        this.errorInfoData = ctx.errorInfo
        return this
    }

    public applyResult<X>(ctx: Context<X>): Context<X> {
        return this.apply(ctx).setupResult(ctx.result!)
    }

    public applyException(err: Error | unknown): this {
        if (err instanceof Error) {
            this.setError(ErrorCodes.THROWN_EXCEPTION, {
                message: err.message,
            }, {
                stack: err.stack
            })
        } else {
            this.setError(ErrorCodes.THROWN_UNKNOWN, {}, { unknown: err })
        }

        return this
    }


}

export type PromisedContext<T = void> = Promise<Context<T>>