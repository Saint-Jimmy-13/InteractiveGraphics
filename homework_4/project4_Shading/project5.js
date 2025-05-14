// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
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

	var transform = MatrixMult(trans, rotX);
	var mv = MatrixMult(transform, rotY);
	return mv;
}

const vertexShader = /* glsl */ `
	attribute vec3 aPos;
	attribute vec3 aNorm;
	attribute vec2 aTexCoord;
	uniform mat4 uMVP;
	uniform mat4 uMV;
	uniform mat3 uNormalMat;
	uniform bool uSwapYZ;
	varying vec3 vNorm;
	varying vec3 vPos;
	varying vec2 vTexCoord;
	void main() {
		vec3 p = aPos;
		vec3 n = aNorm;
		if (uSwapYZ) {
			float y = p.y;
			p.y = p.z;
			p.z = y;

			float t = n.y;
			n.y = n.z;
			n.z = t;
		}
		vec4 posMV = uMV * vec4(p, 1.0);
		vPos = posMV.xyz;
		vNorm = normalize(uNormalMat * n);
		vTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
		gl_Position = uMVP * vec4(p, 1.0);
	}
`;

const fragmentShader = /* glsl */ `
	precision mediump float;
	uniform vec3 uLightDir;
	uniform float uShine;
	uniform sampler2D uTexture;
	uniform bool uShowTexture;
	varying vec3 vNorm;
	varying vec3 vPos;
	varying vec2 vTexCoord;
	void main () {
		vec3 N = normalize(vNorm);
		vec3 L = normalize(uLightDir);
		vec3 V = normalize(-vPos);
		vec3 H = normalize(L + V);

		vec3 Kd = vec3(1.0);
		vec3 Ks = vec3(1.0);
		if (uShowTexture) {
			Kd = texture2D(uTexture, vTexCoord).rgb;
		}

		float NdotL = max(dot(N, L), 0.0);
		float NdotH = max(dot(N, H), 0.0);

		vec3 ambient = 0.1 * Kd;
		vec3 diffuse = Kd * NdotL;
		vec3 specular = Ks * pow(NdotH, uShine);

		vec3 color = ambient + diffuse + specular;
		gl_FragColor = vec4(color, 1.0);
	}
`;

class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		// Compile and link shaders
		const gl = window.gl;
		this.prog = InitShaderProgram(vertexShader, fragmentShader);

		// Attribute locations
		this.aPosLoc = gl.getAttribLocation(this.prog, 'aPos');
		this.aNormLoc = gl.getAttribLocation(this.prog, 'aNorm');
		this.aTexCoordLoc = gl.getAttribLocation(this.prog, 'aTexCoord');

		// Uniform locations
		this.uMVPLoc = gl.getUniformLocation(this.prog, 'uMVP');
		this.uMVLoc = gl.getUniformLocation(this.prog, 'uMV');
		this.uNormalMatLoc = gl.getUniformLocation(this.prog, 'uNormalMat');
		this.uSwapYZLoc = gl.getUniformLocation(this.prog, 'uSwapYZ');
		this.uLightDirLoc = gl.getUniformLocation(this.prog, 'uLightDir');
		this.uShineLoc = gl.getUniformLocation(this.prog, 'uShine');
		this.uShowTexLoc = gl.getUniformLocation(this.prog, 'uShowTexture');
		this.uTextureLoc = gl.getUniformLocation(this.prog, 'uTexture');

		// Buffers
		this.posBuffer = gl.createBuffer();
		this.normBuffer = gl.createBuffer();
		this.uvBuffer = gl.createBuffer();
		this.numVerts = 0;

		// Texture setup
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// State flags
		this.lightDir = [0, 0, 1];
		this.shininess = 32.0;
		this.swapFlag = false;
		this.showTexFlag = false;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals) {
		const gl = window.gl;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

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
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixMVP, matrixMV, matrixNormal) {
		const gl = window.gl;
		gl.useProgram(this.prog);

		// Bind attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.enableVertexAttribArray(this.aPosLoc);
		gl.vertexAttribPointer(this.aPosLoc, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.enableVertexAttribArray(this.aNormLoc);
        gl.vertexAttribPointer(this.aNormLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.enableVertexAttribArray(this.aTexCoordLoc);
        gl.vertexAttribPointer(this.aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

		// Set uniforms
		gl.uniformMatrix4fv(this.uMVPLoc, false, new Float32Array(matrixMVP));
		gl.uniformMatrix4fv(this.uMVLoc, false, new Float32Array(matrixMV));
		gl.uniformMatrix3fv(this.uNormalMatLoc, false, new Float32Array(matrixNormal));
		gl.uniform3fv(this.uLightDirLoc, new Float32Array(this.lightDir));
		gl.uniform1f(this.uShineLoc, this.shininess);
		gl.uniform1i(this.uShowTexLoc, this.showTexFlag ? 1 : 0);
		gl.uniform1i(this.uSwapYZLoc, this.swapFlag ? 1 : 0);
        
		// Bind texture unit 0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.uTextureLoc, 0);

		// Draw triangles
		gl.drawArrays(gl.TRIANGLES, 0, this.numVerts);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const gl = window.gl;
		
		gl.activeTexture(gl.TEXTURE0);
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
	
	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
		this.lightDir = [x, y, z];
	}
	
	// This method is called to set the shininess of the material
	setShininess(shininess) {
		this.shininess = shininess;
	}
}
