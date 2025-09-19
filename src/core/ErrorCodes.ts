

const Codes = {
    THROWN_EXCEPTION: 'THROWN_EXCEPTION',
    THROWN_UNKNOWN: 'THROWN_UNKNOWN',
    INVALID_ERROR_CODE: 'INVALID_ERROR_CODE',

    CONFLICT: 'CONFLICT',
    CANNOT_ROLLBACK: 'CANNOT_ROLLBACK',
    CANNOT_APPLY: 'CANNOT_APPLY',

    BROKEN_INDEX: 'BROKEN_INDEX',
    PARENT_NOT_FOUND: 'PARENT_NOT_FOUND',

    INVALID_DATA: 'INVALID_DATA',
    NOT_FOUND: 'NOT_FOUND'
}

export type ErrorCode = keyof typeof Codes
export const ErrorCodes = Codes as Record<ErrorCode, ErrorCode>

export const ErrorMessages: Record<ErrorCode, string> = {
    THROWN_EXCEPTION: '{message}',
    THROWN_UNKNOWN: 'Unknown is thrown as error',
    INVALID_ERROR_CODE: '{code}',

    CONFLICT: '{reason}',
    CANNOT_ROLLBACK: 'Cannot rollback {target}',
    CANNOT_APPLY: 'Cannot apply {target}',

    BROKEN_INDEX: '{reason}, need store reindex!',
    PARENT_NOT_FOUND: 'Parent {entity} not found',

    INVALID_DATA: 'Invalid {entity}',
    NOT_FOUND: '{entity} not found'
}