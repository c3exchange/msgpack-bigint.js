export interface MsgPackExtension<T = any> {
	get type(): number;

	is(obj: any): boolean;

	encode(obj: T): Uint8Array;
	decode(data: Uint8Array): T;
};
