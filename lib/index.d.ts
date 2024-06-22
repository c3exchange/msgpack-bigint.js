import { Buffer } from 'node:buffer';

export interface MsgPackExtension<T = any> {
	get type(): number;
	is(obj: any): boolean;
	encode(obj: T): Uint8Array;
	decode(data: Uint8Array): T;
}
export declare class MsgPackBigIntExtension implements MsgPackExtension<bigint> {
	private extType;
	constructor(extType: number);
	get type(): number;
	is(obj: any): boolean;
	encode(obj: bigint): Uint8Array;
	decode(data: Uint8Array): bigint;
}
export declare class MsgPackDateExtension implements MsgPackExtension<Date> {
	get type(): number;
	is(obj: any): boolean;
	encode(obj: Date): Uint8Array;
	decode(data: Uint8Array): Date;
}
/**
 * MsgPack encoder configuration options.
 * @interface MsgPackEncoderOptions
 */
export interface MsgPackEncoderOptions {
	/**
	 * A set of msgpack extensions.
	 * @type {MsgPackExtension[]}
	 */
	extensions: MsgPackExtension[];
	/**
	 * Sorts keys before encoding an object.
	 * @type {boolean}
	 * @default true
	 */
	sortKeys: boolean;
	/**
	 * If a number is not a safe integer, store it as a single-precision floating-point
	 * value instead of double-precision.
	 * @type {boolean}
	 * @default false
	 */
	useFloat: boolean;
}
/**
 * Implements a MsgPack encoder.
 * @class MsgPackEncoder
 */
export declare class MsgPackEncoder {
	private value;
	private extensions;
	private sortKeys;
	private useFloat;
	private bufferView;
	private buffer;
	private bufferLen;
	/**
	 * Encodes a value into on array of bytes using MsgPack codec.
	 * @method encode
	 * @param {any} value - The value to encode.
	 * @param {MsgPackEncoderOptions} opts - Encoder configuration settings.
	 * @returns {Uint8Array} - The encoded data as a byte array.
	 */
	static encode<T = any>(value: T, opts?: Partial<MsgPackEncoderOptions>): Uint8Array;
	private constructor();
	private process;
	private parse;
	private encodeNull;
	private encodeBoolean;
	private encodeNumber;
	private encodeString;
	encodeBinary(obj: ArrayBufferView): void;
	encodeArray(obj: Array<unknown>): void;
	encodeMap(obj: Record<any, any>): void;
	encodeExtension(type: number, data: Uint8Array): void;
	private writeUint8;
	private writeInt8;
	private writeUint16;
	private writeInt16;
	private writeUint32;
	private writeInt32;
	private writeUint64;
	private writeInt64;
	private writeFloat;
	private writeDouble;
	private writeBuffer;
	private ensureSpace;
}
/**
 * MsgPack decoder configuration options.
 * @interface MsgPackDecoderOptions
 */
export interface MsgPackDecoderOptions {
	/**
	 * A set of msgpack extensions.
	 * @type {MsgPackExtension[]}
	 */
	extensions: MsgPackExtension[];
	/**
	 * Allows decoding multiple values in the same buffer.
	 * @type {boolean}
	 * @default false
	 */
	allowMultiple: boolean;
	/**
	 * Throws an error is the stream contains multiple but malformed values.
	 * If false, only fully decoded objects are returned and errors are
	 * ignored.
	 * @type {boolean}
	 * @default true
	 */
	multipleCanThrowError: boolean;
}
/**
 * Implements a MsgPack decoder.
 * @class MsgPackDecoder
 */
export declare class MsgPackDecoder {
	private extensions;
	private buffer;
	private ofs;
	private len;
	private tokenMap;
	/**
	 * Decodes a byte array data into a value using MsgPack codec.
	 * @method decode
	 * @param {Buffer | Uint8Array} buffer - The encoded data buffer.
	 * @param {MsgPackDecoderOptions} opts - Decoder configuration settings.
	 * @returns {T} - The decoded value.
	 */
	static decode<T = any>(buffer: Buffer | Uint8Array, opts?: Partial<MsgPackDecoderOptions>): T | T[];
	private constructor();
	private process;
	private readUint8;
	private readInt8;
	private readUint16;
	private readInt16;
	private readUint32;
	private readInt32;
	private readUint64;
	private readInt64;
	private readFloat;
	private readDouble;
	private constantNull;
	private constantFalse;
	private constantTrue;
	private readBinary;
	private readExtension;
	private readString;
	private readMap;
	private readArray;
	private checkAvailable;
	private invalidOpcode;
}

export {};
