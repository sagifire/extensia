import { uuidv7obj } from "uuidv7"
import { Uuid25 } from "uuid25"

import { IDString } from './contracts.js'


export default class Namer {
    generateResourceId(): IDString {
        return Uuid25.fromBytes(uuidv7obj().bytes).toHex();
    }

    generateRepresentationId(): IDString {
        return Uuid25.fromBytes(uuidv7obj().bytes).toHex();
    }
}