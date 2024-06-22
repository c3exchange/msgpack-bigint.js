"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackDateExtension = void 0;
const node_buffer_1 = require("node:buffer");
// -----------------------------------------------------------------------------
class MsgPackDateExtension {
    get type() {
        return -1;
    }
    is(obj) {
        return obj instanceof Date;
    }
    encode(obj) {
        const ms = obj.getTime();
        const secs = Math.floor(ms / 1000);
        const nanosecs = (ms % 1000) * 1000000;
        // timestamp 96 stores the number of seconds and nanoseconds that have elapsed since 1970-01-01 00:00:00 UTC
        // in 64-bit signed integer and 32-bit unsigned integer:
        // +--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
        // |  0xc7  |   12   |   -1   |nanoseconds in 32-bit unsigned int |                   seconds in 64-bit signed int                        |
        // +--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
        const buffer = node_buffer_1.Buffer.alloc(12);
        buffer.writeUInt32BE(nanosecs, 0);
        buffer.writeUInt32BE(Math.floor(secs / 4294967296), 4);
        buffer.writeUInt32BE(secs & 0xffffffff, 8);
        // Done
        return new Uint8Array(buffer);
    }
    decode(data) {
        const buffer = node_buffer_1.Buffer.from(data);
        let secs;
        let secsHi;
        let nanosecs;
        switch (data.length) {
            case 4:
                // timestamp 32 stores the number of seconds that have elapsed since 1970-01-01 00:00:00 UTC
                // in an 32-bit unsigned integer:
                // +--------+--------+--------+--------+--------+--------+
                // |  0xd6  |   -1   |   seconds in 32-bit unsigned int  |
                // +--------+--------+--------+--------+--------+--------+
                secs = buffer.readUInt32BE(0);
                return new Date(secs * 1000);
            case 8:
                // timestamp 64 stores the number of seconds and nanoseconds that have elapsed since 1970-01-01 00:00:00 UTC
                // in 32-bit unsigned integers:
                // +--------+--------+--------+--------+--------+------|-+--------+--------+--------+--------+
                // |  0xd7  |   -1   | nanosec. in 30-bit unsigned int |   seconds in 34-bit unsigned int    |
                // +--------+--------+--------+--------+--------+------^-+--------+--------+--------+--------+
                nanosecs = buffer.readUInt32BE(0);
                secs = buffer.readUInt32BE(4);
                secsHi = nanosecs % 4;
                nanosecs = Math.floor(nanosecs / 4);
                return new Date((secs + (secsHi * 4294967296)) * 1000 + Math.floor(nanosecs / 1000000));
            case 12:
                // timestamp 96 stores the number of seconds and nanoseconds that have elapsed since 1970-01-01 00:00:00 UTC
                // in 64-bit signed integer and 32-bit unsigned integer:
                // +--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
                // |  0xc7  |   12   |   -1   |nanoseconds in 32-bit unsigned int |                   seconds in 64-bit signed int                        |
                // +--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
                nanosecs = buffer.readUInt32BE(0);
                secsHi = buffer.readUInt32BE(4);
                secs = buffer.readUInt32BE(8);
                return new Date((secs + (secsHi * 4294967296)) * 1000 + Math.floor(nanosecs / 1000000));
        }
        throw new Error('MsgPackDateExtension: unsupported format');
    }
}
exports.MsgPackDateExtension = MsgPackDateExtension;
;
//# sourceMappingURL=timestamp.js.map