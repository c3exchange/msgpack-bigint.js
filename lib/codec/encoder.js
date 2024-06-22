"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackEncoder = void 0;
const ext_1 = require("../ext");
;
/**
 * Implements a MsgPack encoder.
 * @class MsgPackEncoder
 */
class MsgPackEncoder {
    /**
     * Encodes a value into on array of bytes using MsgPack codec.
     * @method encode
     * @param {any} value - The value to encode.
     * @param {MsgPackEncoderOptions} opts - Encoder configuration settings.
     * @returns {Uint8Array} - The encoded data as a byte array.
     */
    static encode(value, opts) {
        opts = Object.assign({}, {
            extensions: [
                new ext_1.MsgPackBigIntExtension(1),
                new ext_1.MsgPackDateExtension()
            ],
            sortKeys: true,
            useFloat: false
        }, opts);
        const e = new MsgPackEncoder(value, opts.extensions || [], opts.sortKeys, opts.useFloat);
        return e.process();
    }
    ;
    constructor(value, extensions, sortKeys, useFloat) {
        this.value = value;
        this.extensions = extensions;
        this.sortKeys = sortKeys;
        this.useFloat = useFloat;
        this.bufferView = new DataView(new ArrayBuffer(2048));
        this.buffer = new Uint8Array(this.bufferView.buffer);
        this.bufferLen = 0;
    }
    process() {
        this.parse(this.value);
        return new Uint8Array(this.buffer.buffer, 0, this.bufferLen);
    }
    parse(obj) {
        if (obj === null) {
            this.encodeNull();
            return;
        }
        if (typeof obj === 'boolean') {
            this.encodeBoolean(obj);
            return;
        }
        if (typeof obj === 'number') {
            this.encodeNumber(obj);
            return;
        }
        if (typeof obj === 'string') {
            this.encodeString(obj);
            return;
        }
        for (const extension of this.extensions) {
            if (extension.is(obj)) {
                const data = extension.encode(obj);
                this.encodeExtension(extension.type, data);
                return;
            }
        }
        if (Array.isArray(obj)) {
            this.encodeArray(obj);
            return;
        }
        if (ArrayBuffer.isView(obj)) {
            this.encodeBinary(obj);
            return;
        }
        if (typeof obj === 'object') {
            this.encodeMap(obj);
            return;
        }
        throw new Error('MsgPackEncoder: unsupported object of type ' + Object.prototype.toString.apply(obj));
    }
    encodeNull() {
        this.writeUint8(0xC0);
    }
    encodeBoolean(b) {
        this.writeUint8(b === false ? 0xC2 : 0xC3);
    }
    encodeNumber(n) {
        if (Number.isSafeInteger(n)) {
            if (n >= 0) {
                if (n < 0x80) {
                    this.writeUint8(n);
                }
                else if (n < 0x100) {
                    this.writeUint8(0xCC);
                    this.writeUint8(n);
                }
                else if (n < 0x10000) {
                    this.writeUint8(0xCD);
                    this.writeUint16(n);
                }
                else if (n < 0x100000000) {
                    this.writeUint8(0xCE);
                    this.writeUint32(n);
                }
                else {
                    this.writeUint8(0xCF);
                    this.writeUint64(n);
                }
            }
            else {
                if (n >= -0x20) {
                    this.writeUint8(0xE0 | (n + 0x20));
                }
                else if (n >= -0x80) {
                    this.writeUint8(0xD0);
                    this.writeInt8(n);
                }
                else if (n >= -0x8000) {
                    this.writeUint8(0xD1);
                    this.writeInt16(n);
                }
                else if (n >= -0x80000000) {
                    this.writeUint8(0xD2);
                    this.writeInt32(n);
                }
                else {
                    this.writeUint8(0xD3);
                    this.writeInt64(n);
                }
            }
        }
        else {
            if (this.useFloat) {
                this.writeUint8(0xCA);
                this.writeFloat(n);
            }
            else {
                this.writeUint8(0xCB);
                this.writeDouble(n);
            }
        }
    }
    encodeString(s) {
        const strLen = s.length;
        let buf = new Uint8Array(s.length * 2);
        let ofs = 0;
        let pos = 0;
        while (pos < strLen) {
            if (buf.byteLength - ofs < 4) {
                const newBuf = new Uint8Array(buf.byteLength + 2048);
                newBuf.set(buf);
                buf = newBuf;
            }
            let ch = s.charCodeAt(pos);
            pos += 1;
            if ((ch & 0xFFFFFF80) === 0) {
                buf[ofs] = ch;
                ofs += 1;
                continue;
            }
            else if ((ch & 0xFFFFF800) === 0) {
                // 2-bytes
                buf[ofs] = ((ch >> 6) & 0x1f) | 0xc0;
                ofs += 1;
            }
            else {
                if (ch >= 0xD800 && ch <= 0xDBFF && pos < strLen) {
                    const ch2 = s.charCodeAt(pos);
                    if ((ch2 & 0xFC00) === 0xDC00) {
                        pos += 1;
                        ch = ((ch & 0x3FF) << 10) + (ch2 & 0x3FF) + 0x10000;
                    }
                }
                if ((ch & 0xffff0000) === 0) {
                    buf[ofs] = ((ch >> 12) & 0x0F) | 0xE0;
                    buf[ofs + 1] = ((ch >> 6) & 0x3F) | 0x80;
                    ofs += 2;
                }
                else {
                    buf[ofs] = ((ch >> 18) & 0x07) | 0xF0;
                    buf[ofs + 1] = ((ch >> 12) & 0x3F) | 0x80;
                    buf[ofs + 2] = ((ch >> 6) & 0x3F) | 0x80;
                    ofs += 3;
                }
            }
            buf[ofs] = (ch & 0x3F) | 0x80;
            ofs += 1;
        }
        if (ofs < 32) {
            this.writeUint8(0xA0 + ofs);
        }
        else if (ofs < 0x100) {
            this.writeUint8(0xD9);
            this.writeUint8(ofs);
        }
        else if (ofs < 0x10000) {
            this.writeUint8(0xDA);
            this.writeUint16(ofs);
        }
        else if (ofs < 0x100000000) {
            this.writeUint8(0xDB);
            this.writeUint32(ofs);
        }
        else {
            throw new Error('MsgPackEncoder: string too long');
        }
        this.writeBuffer(new Uint8Array(buf.buffer, 0, ofs));
    }
    encodeBinary(obj) {
        const size = obj.byteLength;
        if (size < 0x100) {
            this.writeUint8(0xC4);
            this.writeUint8(size);
        }
        else if (size < 0x10000) {
            this.writeUint8(0xC5);
            this.writeUint16(size);
        }
        else if (size < 0x100000000) {
            this.writeUint8(0xC6);
            this.writeUint32(size);
        }
        else {
            throw new Error('MsgPackEncoder: binary object is too large');
        }
        this.writeBuffer(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength));
    }
    encodeArray(obj) {
        const size = obj.length;
        if (size < 16) {
            this.writeUint8(0x90 + size);
        }
        else if (size < 0x10000) {
            this.writeUint8(0xDC);
            this.writeUint16(size);
        }
        else if (size < 0x100000000) {
            this.writeUint8(0xDD);
            this.writeUint32(size);
        }
        else {
            throw new Error('MsgPackEncoder: array object is too large');
        }
        for (const v of obj) {
            this.parse(v);
        }
    }
    encodeMap(obj) {
        const keys = Object.keys(obj);
        if (this.sortKeys) {
            keys.sort();
        }
        let keysCount = 0;
        for (const key of keys) {
            if (obj[key] !== undefined) {
                keysCount += 1;
            }
        }
        if (keysCount < 16) {
            this.writeUint8(0x80 + keysCount);
        }
        else if (keysCount < 0x10000) {
            this.writeUint8(0xDE);
            this.writeUint16(keysCount);
        }
        else if (keysCount < 0x100000000) {
            this.writeUint8(0xDF);
            this.writeUint32(keysCount);
        }
        else {
            throw new Error('MsgPackEncoder: object has a large number of keys');
        }
        for (const key of keys) {
            if (obj[key] !== undefined) {
                this.parse(key);
                this.parse(obj[key]);
            }
        }
    }
    encodeExtension(type, data) {
        const size = data.length;
        if (size === 1) {
            this.writeUint8(0xD4);
        }
        else if (size === 2) {
            this.writeUint8(0xD5);
        }
        else if (size === 4) {
            this.writeUint8(0xD6);
        }
        else if (size === 8) {
            this.writeUint8(0xD7);
        }
        else if (size === 16) {
            this.writeUint8(0xD8);
        }
        else if (size < 0x100) {
            this.writeUint8(0xC7);
            this.writeUint8(size);
        }
        else if (size < 0x10000) {
            this.writeUint8(0xC8);
            this.writeUint16(size);
        }
        else if (size < 0x100000000) {
            this.writeUint8(0xC9);
            this.writeUint32(size);
        }
        else {
            throw new Error('MsgPackEncoder: extension object is too large');
        }
        this.writeInt8(type);
        this.writeBuffer(data);
    }
    writeUint8(n) {
        this.ensureSpace(1);
        this.bufferView.setUint8(this.bufferLen, n);
        this.bufferLen += 1;
    }
    writeInt8(n) {
        this.ensureSpace(1);
        this.bufferView.setInt8(this.bufferLen, n);
        this.bufferLen += 1;
    }
    writeUint16(n) {
        this.ensureSpace(2);
        this.bufferView.setUint16(this.bufferLen, n);
        this.bufferLen += 2;
    }
    writeInt16(n) {
        this.ensureSpace(2);
        this.bufferView.setInt16(this.bufferLen, n);
        this.bufferLen += 2;
    }
    writeUint32(n) {
        this.ensureSpace(4);
        this.bufferView.setUint32(this.bufferLen, n);
        this.bufferLen += 4;
    }
    writeInt32(n) {
        this.ensureSpace(4);
        this.bufferView.setInt32(this.bufferLen, n);
        this.bufferLen += 4;
    }
    writeUint64(n) {
        this.ensureSpace(8);
        const hi = Math.floor(n / 0x1_0000_0000);
        this.bufferView.setUint32(this.bufferLen, hi);
        this.bufferView.setUint32(this.bufferLen + 4, n); //high bits will be truncated by DataView
        this.bufferLen += 8;
    }
    writeInt64(n) {
        this.ensureSpace(8);
        const hi = Math.floor(n / 0x1_0000_0000);
        this.bufferView.setUint32(this.bufferLen, hi);
        this.bufferView.setUint32(this.bufferLen + 4, n); //high bits will be truncated by DataView
        this.bufferLen += 8;
    }
    writeFloat(n) {
        this.ensureSpace(4);
        this.bufferView.setFloat32(this.bufferLen, n);
        this.bufferLen += 4;
    }
    writeDouble(n) {
        this.ensureSpace(8);
        this.bufferView.setFloat64(this.bufferLen, n);
        this.bufferLen += 8;
    }
    writeBuffer(b) {
        this.ensureSpace(b.byteLength);
        this.buffer.set(b, this.bufferLen);
        this.bufferLen += b.byteLength;
    }
    ensureSpace(size) {
        if (this.bufferView.byteLength - this.bufferLen < size) {
            const newBufferSize = (this.bufferView.byteLength + size + 2047) & (~2047);
            const newBufferView = new DataView(new ArrayBuffer(newBufferSize));
            const newBuffer = new Uint8Array(newBufferView.buffer);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            this.bufferView = newBufferView;
        }
    }
}
exports.MsgPackEncoder = MsgPackEncoder;
;
//# sourceMappingURL=encoder.js.map