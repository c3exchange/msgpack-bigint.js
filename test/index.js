const msgpack = require("../dist/msgpack-bigint");
const test = require("ava");

// -----------------------------------------------------------------------------

test('MsgPack test', (t) => {
	const obj = {
		big: 5674356348348534756n,
		small: 342342,
		str: "test string",
		arr: [
			10, 20, 11n, "dummy data"
		],
		b: true,
		n: null,
		blob: new Uint8Array([ 10, 20, 30, 40 ])
	};

	const packed = msgpack.encode(obj);
	const unpacked = msgpack.decode(packed);

	t.deepEqual(unpacked, {
		big: 5674356348348534756n,
		small: 342342,
		str: "test string",
		arr: [
			10, 20, 11, "dummy data" //11 fits in a number so it is expected the original bigint to end as a number
		],
		b: true,
		n: null,
		blob: new Uint8Array([ 10, 20, 30, 40 ])
	});

	t.pass();
});
