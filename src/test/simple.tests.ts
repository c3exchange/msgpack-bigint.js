import { MsgPackEncoder, MsgPackDecoder } from '..';
import test, { ExecutionContext } from 'ava';

// -----------------------------------------------------------------------------

const testObj = {
	big: 5674356348348534756n,
	small: 342342,
	str: 'test string',
	arr: [
		10, 20, 11n, 'dummy data'
	],
	b: true,
	n: null,
	blob: new Uint8Array([ 10, 20, 30, 40 ]),
	date: new Date(2024, 2, 1, 12, 31, 22, 543)
};

// -----------------------------------------------------------------------------

test('Simple test', (t: ExecutionContext) => {
	const packed = MsgPackEncoder.encode(testObj);
	const unpacked = MsgPackDecoder.decode(packed);

	t.deepEqual(unpacked, testObj);

	t.pass();
});

test('Multiple test', (t: ExecutionContext) => {
	const packed = MsgPackEncoder.encode(testObj);
	const multiplePacked = new Uint8Array(packed.byteLength + packed.byteLength);
	multiplePacked.set(packed, 0);
	multiplePacked.set(packed, packed.byteLength);

	const multipleUnpacked = MsgPackDecoder.decode(multiplePacked, {
		allowMultiple: true
	});

	for (const unpacked of multipleUnpacked) {
		t.deepEqual(unpacked, testObj);
	}

	t.pass();
});
