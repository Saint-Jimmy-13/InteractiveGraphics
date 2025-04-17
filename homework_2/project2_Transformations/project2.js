// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
	// Convert rotation to radians
	var rad = rotation * Math.PI / 180.0;
	var cos = Math.cos(rad);
	var sin = Math.sin(rad);

	// The matrix we want is:
	//
	// [cos*scale	-sin*scale	positionX]
	// [sin*scale	 cos*scale	positionY]
	// [	0			0			1	 ]
	//
	// Where the first and second columns contain rotation and scale part,
	// and third column contains translation part.

	return [
		cos * scale,	// array[0]
		sin * scale,	// array[1]
		0,				// array[2]
		-sin * scale,	// array[3]
		cos * scale,	// array[4]
		0,				// array[5]
		positionX,		// array[6]
		positionY,		// array[7]
		1,				// array[8]
	];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
	var ret = new Array(9);
	
	for (let r = 0; r < 3; ++r) {
		for (let c = 0; c < 3; ++c) {
			let sum = 0;
			for (let k = 0; k < 3; ++k) {
				sum += trans2[r + 3 * k] * trans1[k + 3 * c];
			}
			ret[r + 3 * c] = sum;
		}
	}
	return ret;
}
