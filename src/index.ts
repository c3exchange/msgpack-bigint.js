//License: Apache 2.0. See LICENSE.md

import { MsgPackDecoder, MsgPackDecoderOptions } from "./decoder";
import { MsgPackEncoder, MsgPackEncoderOptions } from "./encoder";

// -----------------------------------------------------------------------------

export default class MsgPackBigInt {
	static encode(obj: any, options?: MsgPackEncoderOptions): Uint8Array {
		const e = new MsgPackEncoder(obj, options);
		return e.process();
	}

	static decode(buffer: Uint8Array, options?: MsgPackDecoderOptions): any {
		const d = new MsgPackDecoder(buffer, options);
		return d.process();
	}
}
