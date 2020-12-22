//License: Apache 2.0. See LICENSE.md

import * as ieee754 from "ieee754";

// -----------------------------------------------------------------------------

const uint32Max = BigInt(0x100000000);

const minHiSafeInt = Math.floor(Number.MIN_SAFE_INTEGER / 0x1_0000_0000);
const maxHiSafeInt = Math.floor(Number.MAX_SAFE_INTEGER / 0x1_0000_0000);

// -----------------------------------------------------------------------------

type IReaderFunction = (param?: number | IReaderFunction) => any;

interface ITokenDecoder {
	fn: IReaderFunction;
	param?: number | IReaderFunction;
}

// -----------------------------------------------------------------------------

export interface MsgPackDecoderOptions {
	extension?: (type: number, data: Uint8Array) => any;
}

export class MsgPackDecoder {
	private buffer: Uint8Array;
	private ofs: number;
	private len: number;
	private extension?: (type: number, data: Uint8Array) => any;
	private tokenMap: ITokenDecoder[];

	constructor(buffer: Buffer | Uint8Array, options?: MsgPackDecoderOptions) {
		if (buffer instanceof Uint8Array) {
			this.buffer = buffer;
		}
		else {
			throw new Error("UInt64: invalid data");
		}
		this.ofs = 0;
		this.len = buffer.length;

		this.extension = undefined;
		if (options && options.extension) {
			this.extension = options.extension;
		}

		this.tokenMap = [];
		this.tokenMap.push({ fn: this.constantNull.bind(this) }); //0xC0
		this.tokenMap.push({ fn: this.invalidOpcode.bind(this) }); //0xC1
		this.tokenMap.push({ fn: this.constantFalse.bind(this) }); //0xC2
		this.tokenMap.push({ fn: this.constantTrue.bind(this) }); //0xC3

		this.tokenMap.push({ fn: this.readBinary.bind(this), param: this.readUint8.bind(this) }); //0xC4
		this.tokenMap.push({ fn: this.readBinary.bind(this), param: this.readUint16.bind(this) }); //0xC5
		this.tokenMap.push({ fn: this.readBinary.bind(this), param: this.readUint32.bind(this) }); //0xC6

		this.tokenMap.push({ fn: this.readExtension.bind(this), param: this.readUint8.bind(this) }); //0xC7
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: this.readUint16.bind(this) }); //0xC8
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: this.readUint32.bind(this) }); //0xC9

		this.tokenMap.push({ fn: this.readFloat.bind(this) }); //0xCA
		this.tokenMap.push({ fn: this.readDouble.bind(this) }); //0xCB

		this.tokenMap.push({ fn: this.readUint8.bind(this) }); //0xCC
		this.tokenMap.push({ fn: this.readUint16.bind(this) }); //0xCD
		this.tokenMap.push({ fn: this.readUint32.bind(this) }); //0xCE
		this.tokenMap.push({ fn: this.readUint64.bind(this) }); //0xCF

		this.tokenMap.push({ fn: this.readInt8.bind(this) }); //0xD0
		this.tokenMap.push({ fn: this.readInt16.bind(this) }); //0xD1
		this.tokenMap.push({ fn: this.readInt32.bind(this) }); //0xD2
		this.tokenMap.push({ fn: this.readInt64.bind(this) }); //0xD3

		this.tokenMap.push({ fn: this.readExtension.bind(this), param: 1 }); //0xD4
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: 2 }); //0xD5
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: 4 }); //0xD6
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: 8 }); //0xD7
		this.tokenMap.push({ fn: this.readExtension.bind(this), param: 16 }); //0xD8

		this.tokenMap.push({ fn: this.readString.bind(this), param: this.readUint8.bind(this) }); //0xD9
		this.tokenMap.push({ fn: this.readString.bind(this), param: this.readUint16.bind(this) }); //0xDA
		this.tokenMap.push({ fn: this.readString.bind(this), param: this.readUint32.bind(this) }); //0xDB

		this.tokenMap.push({ fn: this.readArray.bind(this), param: this.readUint16.bind(this) }); //0xDC
		this.tokenMap.push({ fn: this.readArray.bind(this), param: this.readUint32.bind(this) }); //0xDD

		this.tokenMap.push({ fn: this.readMap.bind(this), param: this.readUint16.bind(this) }); //0xDE
		this.tokenMap.push({ fn: this.readMap.bind(this), param: this.readUint32.bind(this) }); //0xDF
	}

	public process(): any {
		if (this.len == 0) {
			return undefined;
		}

		const opcode = this.readUint8();
		if (opcode < 0x80) {
			return opcode; //positive constant
		}
		if (opcode >= 0xE0) {
			return opcode - 0x100; //negative constant
		}
		if (opcode < 0x90) {
			return this.readMap(opcode - 0x80);
		}
		if (opcode < 0xA0) {
			return this.readArray(opcode - 0x90);
		}
		if (opcode < 0xC0) {
			return this.readString(opcode - 0xA0);
		}

		return this.tokenMap[opcode - 0xC0].fn(this.tokenMap[opcode - 0xC0].param);
	}

	private readUint8(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(1);
		const n = this.buffer[this.ofs];
		this.ofs += 1;
		return n;
	}

	private readInt8(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(1);
		const n = this.buffer[this.ofs];
		this.ofs += 1;
		return (n & 0x80) ? (n - 256) : n;
	}

	private readUint16(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(2);
		let n = this.buffer[this.ofs] << 8;
		n |= this.buffer[this.ofs + 1];
		this.ofs += 2;
		return n;
	}

	private readInt16(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(2);
		const n = this.buffer[this.ofs];
		this.ofs += 2;
		return (n & 0x8000) ? (n - 65536) : n;
	}

	private readUint32(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(4);
		let n = this.buffer[this.ofs + 1] << 16;
		n |= this.buffer[this.ofs + 2] << 8;
		n |= this.buffer[this.ofs + 3];
		n += this.buffer[this.ofs] * 16777216; //the high byte at the end because OR operator uses 32-bit signed values
		this.ofs += 4;
		return n;
	}

	private readInt32(/*param?: number | IReaderFunction*/): number {
		this.checkAvailable(4);
		let n = this.buffer[this.ofs + 1] << 16;
		n |= this.buffer[this.ofs + 2] << 8;
		n |= this.buffer[this.ofs + 3];
		n |= this.buffer[this.ofs] << 24;
		this.ofs += 4;
		return n;
	}

	private readUint64(/*param?: number | IReaderFunction*/): number|bigint {
		const hi = this.readUint32();
		const lo = this.readUint32();
		if (hi > maxHiSafeInt) {
			return (BigInt(hi) * uint32Max) + BigInt(lo);
		}
		return (hi * 0x1_0000_0000) + lo;
	}

	private readInt64(/*param?: number | IReaderFunction*/): number|bigint {
		const hi = this.readUint32();
		const lo = this.readUint32();

		if (hi < minHiSafeInt || (hi === minHiSafeInt && lo === 0) || hi > maxHiSafeInt) {
			return (BigInt(hi) * uint32Max) + BigInt(lo);
		}
		return (hi * 0x1_0000_0000) + lo;
	}

	private readFloat(/*param?: number | IReaderFunction*/): any {
		this.checkAvailable(4);
		const n = ieee754.read(this.buffer, this.ofs, false, 23, 4);
		this.ofs += 8;
		return n;
	}

	private readDouble(/*param?: number | IReaderFunction*/): any {
		this.checkAvailable(8);
		const n = ieee754.read(this.buffer, this.ofs, false, 52, 8);
		this.ofs += 8;
		return n;
	}

	private constantNull(/*param?: number | IReaderFunction*/): any {
		return null;
	}

	private constantFalse(/*param?: number | IReaderFunction*/): any {
		return false;
	}

	private constantTrue(/*param?: number | IReaderFunction*/): any {
		return true;
	}

	private readBinary(param?: number | IReaderFunction): any {
		if (typeof param === 'function') {
			param = param(0) as number;
		}

		if (!param) {
			return new Uint8Array();
		}
		this.checkAvailable(param);

		const value = this.buffer.slice(this.ofs, this.ofs + param);

		this.ofs += param;

		return value;
	}

	private readExtension(param?: number | IReaderFunction): any {
		if (typeof param === 'function') {
			param = param(0) as number;
		}

		const type = this.readUint8();
		if (param) {
			this.checkAvailable(param);
		}

		if (!this.extension) {
			throw new Error("MsgPackDecoder: unsupported extension of type 0x" + type.toString(16));
		}

		const start = this.ofs;
		this.ofs += param!;
		return this.extension(type, this.buffer.slice(start, start + param!));
	}

	private readString(param?: number | IReaderFunction): any {
		if (typeof param === 'function') {
			param = param(0) as number;
		}

		if (!param) {
			return "";
		}
		this.checkAvailable(param);

		let invalidUtf8 = false;
		const savedOffset = this.ofs;
		const savedParam = param;

		let str = [];

		while (param > 0) {
			let ch = this.buffer[this.ofs];
			this.ofs += 1;
			param -= 1;

			if (ch < 128) {
				str.push(String.fromCharCode(ch));
				continue;
			}

			if ((ch & 0xE0) === 0xC0) {
				if (param < 1) { //invalid character found
					invalidUtf8 = true;
					break;
				}

				ch = ((ch & 0x1F) << 6) | (this.buffer[this.ofs] & 0x3F);
				this.ofs += 1;
				param -= 1;
			}
			else if ((ch & 0xF0) === 0xE0) {
				if (param < 2) { //invalid character found
					invalidUtf8 = true;
					break;
				}

				ch = ((ch & 0x0F) << 12) | ((this.buffer[this.ofs] & 0x3F) << 6) | (this.buffer[this.ofs + 1] & 0x3F);
				this.ofs += 2;
				param -= 2;
			}
			else if ((ch & 0xF8) === 0xF0) {
				if (param < 3) { //invalid character found
					invalidUtf8 = true;
					break;
				}

				ch = ((ch & 0x0F) << 18) | ((this.buffer[this.ofs] & 0x3F) << 12) | ((this.buffer[this.ofs + 1] & 0x3F) << 6) |
					(this.buffer[this.ofs + 2] & 0x3F);
				this.ofs += 3;
				param -= 3;
			}
			else {
				//invalid character found
				invalidUtf8 = true;
				break;
			}

			if (ch >= 0x010000) {
				ch -= 0x010000;
				str.push(String.fromCharCode((ch >>> 10) + 0xD800, (ch & 0x3FF) + 0xDC00));
			}
			else {
				str.push(String.fromCharCode(ch));
			}
		}

		//code will enter inside this loop if we found an invalid UTF-8 character to decode in the previous one
		if (invalidUtf8) {
			str = [];
			this.ofs = savedOffset;
			for (param = savedParam; param > 0; param -= 1) {
				str.push(String.fromCharCode(this.buffer[this.ofs]));
				this.ofs += 1;
			}
		}

		return str.join("");
	}

	private readMap(param?: number | IReaderFunction): any {
		if (typeof param === 'function') {
			param = param(0) as number;
		}

		const value:Record<any, any> = {};

		for (let idx = 0; idx < param!; idx++) {
			const key = this.process();
			value[key] = this.process();
		}

		return value;
	}

	private readArray(param?: number | IReaderFunction): any {
		if (typeof param === 'function') {
			param = param(0) as number;
		}

		const value = new Array(param as number);

		for (let idx = 0; idx < param!; idx++) {
			value[idx] = this.process();
		}

		return value;
	}

	private checkAvailable(count: number): void {
		if (this.len - this.ofs < count) {
			throw new Error("MsgPackDecoder: end of stream reached");
		}
	}

	private invalidOpcode(/*param?: number | IReaderFunction*/): any {
		throw new Error("MsgPackDecoder: invalid opcode");
	}
}
