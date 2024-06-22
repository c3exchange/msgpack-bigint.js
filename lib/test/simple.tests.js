"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const ava_1 = __importDefault(require("ava"));
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
    blob: new Uint8Array([10, 20, 30, 40]),
    date: new Date(2024, 2, 1, 12, 31, 22, 543)
};
// -----------------------------------------------------------------------------
(0, ava_1.default)('Simple test', (t) => {
    const packed = __1.MsgPackEncoder.encode(testObj);
    const unpacked = __1.MsgPackDecoder.decode(packed);
    t.deepEqual(unpacked, testObj);
    t.pass();
});
(0, ava_1.default)('Multiple test', (t) => {
    const packed = __1.MsgPackEncoder.encode(testObj);
    const multiplePacked = new Uint8Array(packed.byteLength + packed.byteLength);
    multiplePacked.set(packed, 0);
    multiplePacked.set(packed, packed.byteLength);
    const multipleUnpacked = __1.MsgPackDecoder.decode(multiplePacked, {
        allowMultiple: true
    });
    for (const unpacked of multipleUnpacked) {
        t.deepEqual(unpacked, testObj);
    }
    t.pass();
});
//# sourceMappingURL=simple.tests.js.map