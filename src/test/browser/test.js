/* eslint-disable no-undef */
window.addEventListener('load', function () {
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

	const packed = MsgPack.MsgPackEncoder.encode(testObj);

	const unpacked = MsgPack.MsgPackDecoder.decode(packed);

	const elem = document.getElementById('output');
	let s = 'BigInt: ' + unpacked.big.toString() + '\n';
	s += 'Small: ' + unpacked.small.toString() + '\n';
	s += 'Str: ' + unpacked.str + '\n';
	s += 'Bool: ' + unpacked.b.toString() + '\n';
	s += 'Date: ' + unpacked.date.toString() + '\n';
	elem.innerText = s;
});
