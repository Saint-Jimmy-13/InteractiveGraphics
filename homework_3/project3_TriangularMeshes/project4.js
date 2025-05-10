// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	// Translation matrix
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// Rotation around x axis
	var cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
	var rotX = [
		1, 0, 0, 0,
		0, cosX, sinX, 0,
		0, -sinX, cosX, 0,
		0, 0, 0, 1
	];

	// Rotation around y axis
	var cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
	var rotY = [
		cosY, 0, -sinY, 0,
		0, 1, 0, 0,
		sinY, 0, cosY, 0,
		0, 0, 0, 1
	];

	var transform = MatrixMult(trans, MatrixMult(rotX, rotY));
	var mvp = MatrixMult(projectionMatrix, transform);
	return mvp;
}

const vertexShader = /* glsl */ `
	attribute vec3 pos;
	attribute vec2 texCoord;
	uniform mat4 mvp;
	uniform bool swapYZ;
	varying vec2 vTexCoord;
	void main() {
		// Optionally swap y and z axes
		vec4 p = vec4(pos, 1.0);
		if (swapYZ) {
			float y = p.y;
			p.y = p.z;
			p.z = y;
		}
		// Apply Model-View-Projection
		gl_Position = mvp * p;
		// Pass uv to fragment shader
		vTexCoord = texCoord;
	}
`;

const fragmentShader = /* glsl */ `
	precision mediump float;
	uniform bool showTexture;
	uniform sampler2D uTexture;
	varying vec2 vTexCoord;
	void main() {
		if (showTexture) {
			// Sample texture
			gl_FragColor = texture2D(uTexture, vTexCoord);
		}
		else {
			// Depth-based green channel
			float d = gl_FragCoord.z;
			gl_FragColor = vec4(1.0, d * d, 0.0, 1.0);
		}
	}
`;

class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		// Compile and link shaders
		this.prog = InitShaderProgram(vertexShader, fragmentShader);

		// Attribute locations
		this.posLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');

		// Uniform locations
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.swapLoc = gl.getUniformLocation(this.prog, 'swapYZ');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTexture');
		this.texSamplerLoc = gl.getUniformLocation(this.prog, 'uTexture');

		// Create position and uv buffers
		this.posBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.numVerts = 0;

		// Create and configure texture object
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// State flags
		this.swapFlag = false;
		this.showTexFlag = false;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords) {
		// Upload positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// Upload uvs
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		// Store vertex count
		this.numVerts = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
		this.swapFlag = swap;
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);

		// Set MVP and flags
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
		gl.uniform1i(this.swapLoc, this.swapFlag ? 1 : 0);
		gl.uniform1i(this.showTexLoc, this.showTexFlag ? 1 : 0);

		// Bind and assign position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.enableVertexAttribArray(this.posLoc);
		gl.vertexAttribPointer(this.posLoc, 3, gl.FLOAT, false, 0, 0);

		// Bind and assign uv attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

		// Bind texture unit 0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.texSamplerLoc, 0);

		// Draw triangles
		gl.drawArrays(gl.TRIANGLES, 0, this.numVerts);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		// You can set the texture image data using the following command.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		gl.generateMipmap(gl.TEXTURE_2D);
		
		this.showTexFlag = true;
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) {
		this.showTexFlag = show;
	}
}
