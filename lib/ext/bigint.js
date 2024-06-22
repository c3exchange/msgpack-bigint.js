"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackBigIntExtension = void 0;
const node_buffer_1 = require("node:buffer");
// -----------------------------------------------------------------------------
class MsgPackBigIntExtension {
    constructor(extType) {
        this.extType = extType;
    }
    ;
    get type() {
        return this.extType;
    }
    is(obj) {
        return typeof obj === 'bigint';
    }
    encode(obj) {
        return new Uint8Array(node_buffer_1.Buffer.from(obj.toString(), 'ascii'));
    }
    decode(data) {
        return BigInt(node_buffer_1.Buffer.from(data).toString('ascii'));
    }
}
exports.MsgPackBigIntExtension = MsgPackBigIntExtension;
;
//# sourceMappingURL=bigint.js.map