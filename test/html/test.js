window.addEventListener("load", function () {
	const obj = {
		small: 4587345.2,
		big: 3242376423784623874n
	};

	const packed = MsgPackBigInt.encode(obj);

	const unpacked = MsgPackBigInt.decode(packed);

	const elem = document.getElementById("output");
	elem.innerText = "The value of obj.big is: " + obj.big.toString();
});
