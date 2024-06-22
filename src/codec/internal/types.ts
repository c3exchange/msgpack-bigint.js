export type IReaderFunction = (param: number | IReaderFunction) => any;

export interface ITokenDecoder {
	fn: IReaderFunction;
	param: number | IReaderFunction;
};
