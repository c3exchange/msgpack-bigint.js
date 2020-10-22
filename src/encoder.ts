//License: Apache 2.0. See LICENSE.md

// -----------------------------------------------------------------------------

const uint8Max = BigInt(0x100);
const uint16Max = BigInt(0x10000);
const uint32Max = BigInt(0x100000000);
const uint64Max = BigInt("0x10000000000000000");

const neg32 = BigInt(-0x20);
const int8Min = BigInt(-0x80);
const int16Min = BigInt(-0x8000);
const int32Min = BigInt(-0x80000000);
const int64Min = BigInt("-9223372036854775808");

// -----------------------------------------------------------------------------

export interface MsgPackEncoderExtensionResult {
	type: number;
	data: Uint8Array;
}

export interface MsgPackEncoderOptions {
	extension?: (obj: unknown) => MsgPackEncoderExtensionResult;
	sortKeys?: boolean;
	useFloat?: boolean;
}

export class MsgPackEncoder {
	private obj: any;
	private buffer: Uint8Array;
	private bufferView: DataView;
	private bufferLen: number;
	private extension: ((obj: unknown) => MsgPackEncoderExtensionResult) | null;
	private sortKeys: boolean;
	private useFloat: boolean;

	constructor(obj: any, options?: MsgPackEncoderOptions) {
		this.obj = obj;
		this.bufferView = new DataView(new ArrayBuffer(2048));
		this.buffer = new Uint8Array(this.bufferView.buffer);
		this.bufferLen = 0;

		this.extension = null;
		this.sortKeys = false;
		this.useFloat = false;
		if (options) {
			if (options.extension) {
				this.extension = options.extension;
			}
			if (options.sortKeys) {
				this.sortKeys = options.sortKeys;
			}
			if (options.useFloat) {
				this.useFloat = options.useFloat;
			}
		}
	}

	public process(): Uint8Array {
		//parse input data
		this.parse(this.obj);

		return new Uint8Array(this.buffer.buffer, 0, this.bufferLen);
	}

	private parse(obj: any): void {
		if (obj === null) {
			this.encodeNull();
		}
		else if (typeof obj === "boolean") {
			this.encodeBoolean(obj);
		}
		else if (typeof obj === "number") {
			this.encodeNumber(obj);
		}
		else if (typeof obj === "string") {
			this.encodeString(obj);
		}
		else if (typeof obj === "bigint") {
			this.encodeBigInt(obj);
		}
		else {
			this.encodeObject(obj);
		}
	}

	private encodeNull(): void {
		this.writeUint8(0xC0);
	}

	private encodeBoolean(b: boolean): void {
		this.writeUint8(b === false ? 0xC2 : 0xC3);
	}

	private encodeNumber(n: number): void {
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

	private encodeString(s: string): void {
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
			throw new Error("MsgPackEncoder: string too long");
		}

		this.writeBuffer(new Uint8Array(buf.buffer, 0, ofs));
	}

	encodeBigInt(obj: bigint): void {
		if (obj >= BigInt(0)) {
			if (obj < BigInt(0x80)) {
				this.writeUint8(Number(obj));
			}
			else if (obj < uint8Max) {
				this.writeUint8(0xCC);
				this.writeUint8(Number(obj));
			}
			else if (obj < uint16Max) {
				this.writeUint8(0xCD);
				this.writeUint16(Number(obj));
			}
			else if (obj < uint32Max) {
				this.writeUint8(0xCE);
				this.writeUint32(Number(obj));
			}
			else if (obj < uint64Max) {
				this.writeUint8(0xCF);
				this.writeUint64(obj);
			}
			else {
				throw new Error("MsgPackEncoder: positive bigint too big");
			}
		}
		else {
			if (obj >= neg32) {
				this.writeUint8(0xE0 | (Number(obj) + 0x20));
			}
			else if (obj >= int8Min) {
				this.writeUint8(0xD0);
				this.writeInt8(Number(obj));
			}
			else if (obj >= int16Min) {
				this.writeUint8(0xD1);
				this.writeInt16(Number(obj));
			}
			else if (obj >= int32Min) {
				this.writeUint8(0xD2);
				this.writeInt32(Number(obj));
			}
			else if (obj >= int64Min) {
				this.writeUint8(0xD3);
				this.writeInt64(obj);
			}
			else {
				throw new Error("MsgPackEncoder: negative bigint too big");
			}
		}
	}

	encodeObject(obj: unknown): void {
		if (this.extension) {
			const ext = this.extension(obj);
			if (ext) {
				this.encodeExtension(ext);
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
		if (typeof obj === "object") {
			this.encodeMap(obj as Record<string, unknown>);
			return;
		}

		throw new Error("MsgPackEncoder: unsupported object of type " + Object.prototype.toString.apply(obj));
	}

	encodeBinary(obj: ArrayBufferView): void {
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
			throw new Error("MsgPackEncoder: binary object is too large");
		}

		this.writeBuffer(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength));
	}

	encodeArray(obj: Array<unknown>): void {
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
			throw new Error("MsgPackEncoder: array object is too large");
		}

		for (const v of obj) {
			this.parse(v);
		}
	}

	encodeMap(obj: Record<string, unknown>): void {
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
			throw new Error("MsgPackEncoder: array object is too large");
		}

		for (const key of keys) {
			if (obj[key] !== undefined) {
				this.encodeString(key);
				this.parse(obj[key]);
			}
		}
	}

	encodeExtension(ext: MsgPackEncoderExtensionResult): void {
		const size = ext.data.length;
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
			throw new Error("MsgPackEncoder: extension object is too large");
		}

		this.writeUint8(ext.type);
		this.writeBuffer(ext.data);
	}

	private writeUint8(n: number): void {
		this.ensureSpace(1);
		this.bufferView.setUint8(this.bufferLen, n);
		this.bufferLen += 1;
	}

	private writeInt8(n: number): void {
		this.ensureSpace(1);
		this.bufferView.setInt8(this.bufferLen, n);
		this.bufferLen += 1;
	}

	private writeUint16(n: number): void {
		this.ensureSpace(2);
		this.bufferView.setUint16(this.bufferLen, n);
		this.bufferLen += 2;
	}

	private writeInt16(n: number): void {
		this.ensureSpace(2);
		this.bufferView.setInt16(this.bufferLen, n);
		this.bufferLen += 2;
	}

	private writeUint32(n: number): void {
		this.ensureSpace(4);
		this.bufferView.setUint32(this.bufferLen, n);
		this.bufferLen += 4;
	}

	private writeInt32(n: number): void {
		this.ensureSpace(4);
		this.bufferView.setInt32(this.bufferLen, n);
		this.bufferLen += 4;
	}

	private writeUint64(n: number | bigint): void {
		this.ensureSpace(8);
		if (typeof n === 'number') {
			const hi = Math.floor(n / 0x1_0000_0000);
			this.bufferView.setUint32(this.bufferLen, hi);
			this.bufferView.setUint32(this.bufferLen + 4, n); //high bits will be truncated by DataView
		}
		else {
			const hi = Number(n / uint32Max);
			const lo = Number(n % uint32Max);
			this.bufferView.setUint32(this.bufferLen, hi);
			this.bufferView.setUint32(this.bufferLen + 4, lo);
		}
		this.bufferLen += 8;
	}

	private writeInt64(n: number | bigint) {
		this.ensureSpace(8);
		if (typeof n === 'number') {
			const hi = Math.floor(n / 0x1_0000_0000);
			this.bufferView.setUint32(this.bufferLen, hi);
			this.bufferView.setUint32(this.bufferLen + 4, n); //high bits will be truncated by DataView
		}
		else {
			let hi = Number(n / uint32Max);
			const lo = Number(n % uint32Max);
			if (hi < 0 && lo !== 0) {
				hi -= 1;
			}
			this.bufferView.setUint32(this.bufferLen, hi);
			this.bufferView.setUint32(this.bufferLen + 4, lo);
		}
		this.bufferLen += 8;
	}

	private writeFloat(n: number) {
		this.ensureSpace(4);
		this.bufferView.setFloat32(this.bufferLen, n);
		this.bufferLen += 4;
	}

	private writeDouble(n: number) {
		this.ensureSpace(8);
		this.bufferView.setFloat64(this.bufferLen, n);
		this.bufferLen += 8;
	}

	private writeBuffer(b: Uint8Array) {
		this.ensureSpace(b.byteLength);
		this.buffer.set(b, this.bufferLen);
		this.bufferLen += b.byteLength;
	}

	private ensureSpace(size: number) {
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
