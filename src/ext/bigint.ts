import { Buffer } from 'node:buffer';
import { MsgPackExtension } from './interface';

// -----------------------------------------------------------------------------

export class MsgPackBigIntExtension implements MsgPackExtension<bigint> {
	constructor(private extType: number) {
	};

	public get type(): number {
		return this.extType;
	}

	public is(obj: any): boolean {
		return typeof obj === 'bigint';
	}

	public encode(obj: bigint): Uint8Array {
		return new Uint8Array(Buffer.from(obj.toString(), 'ascii'));
	}

	public decode(data: Uint8Array): bigint {
		return BigInt(Buffer.from(data).toString('ascii'));
	}
};
