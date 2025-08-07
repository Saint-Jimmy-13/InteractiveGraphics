// Core variables
let scene, camera, renderer, mixer, knight, cameraTarget;

// Key tracking and movement settings
const keysPressed = {};
const moveSpeed = 0.1;
const turnSpeed = 0.05;
let yaw = 0, pitch = 0;
const camDistance = 5;
const camHeight = 2;

// Initialize game scene
init();
animate();

function init() {
    // Create scene and sky background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);   // Sky blue

    // Setup camera (third-person style)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, camHeight, camDistance);   // Behind and above the player

    // Renderer setup
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 50, 20);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Ground plane
    const textureLoader = new THREE.TextureLoader();
    const grass = textureLoader.load('textures/grass.jpg');
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(100, 100);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshPhongMaterial({map: grass})
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Camera follow target
    cameraTarget = new THREE.Object3D();
    scene.add(cameraTarget);

    // Load knight and castle models
    const loader = new THREE.GLTFLoader();

    loader.load('models/knight.glb', gltf => {
        knight = gltf.scene;
        knight.scale.set(0.01, 0.01, 0.01); // Scale down the knight model
        knight.rotation.y = Math.PI;    // Face the knight forward

        // Place knight so its feet are at y = 0
        const box = new THREE.Box3().setFromObject(knight);
        knight.position.y = -box.min.y;

        // Shadow settings
        knight.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        scene.add(knight);

        // Play idle animation
        mixer = new THREE.AnimationMixer(knight);
        if (gltf.animations.length) {
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
    });

    loader.load('models/castle.glb', gltf => {
        const castle = gltf.scene;
        castle.scale.set(0.2, 0.2, 0.2);
        castle.position.set(0, 0, -20);
        castle.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        scene.add(castle);
    });

    // Resize event handler
    window.addEventListener('resize', onWindowResize);

    // Keyboard input handlers
    window.addEventListener("keydown", e => keysPressed[e.code] = true);
    window.addEventListener("keyup", e => keysPressed[e.code] = false);

    // Pointer lock for mouse look
    document.body.addEventListener('click', () => {
        document.body.requestPointerLock();
    });
    document.addEventListener('mousemove', onMouseMove);
}

function onMouseMove(e) {
    if (document.pointerLockElement !== document.body) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    // Clamp pitch between straight up/down
    const limit = Math.PI / 2 - 0.1;
    pitch = Math.max(-limit, Math.min(limit, pitch));
}

function handleMovement() {
    if (!knight) return;

    // WASD or arrow keys
    const forward = keysPressed["KeyW"] || keysPressed["ArrowUp"];
    const backward = keysPressed["KeyS"] || keysPressed["ArrowDown"];
    const left = keysPressed["KeyA"] || keysPressed["ArrowLeft"];
    const right = keysPressed["KeyD"] || keysPressed["ArrowRight"];

    // Build movement vector in camera space (XZ plane)
    let moveX = 0, moveZ = 0;
    if (forward) moveZ -= 1;
    if (backward) moveZ += 1;
    if (left) moveX -= 1;
    if (right) moveX += 1;

    if (moveX || moveZ) {
        const dir = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(moveSpeed);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        dir.applyQuaternion(yawQuat);
        knight.position.add(dir);
    }
}

function updateCamera() {
    if (!knight) return;
    // Spherical to Cartesian for camera offset
    const x = camDistance * Math.cos(pitch) * Math.sin(yaw);
    const y = camDistance * Math.sin(pitch);
    const z = camDistance * Math.cos(pitch) * Math.cos(yaw);

    cameraTarget.position.set(
        knight.position.x + x,
        knight.position.y + y +camHeight,
        knight.position.z + z
    );

    // Smoothly interpolate camera
    camera.position.lerp(cameraTarget.position, 0.1);
    camera.lookAt(
        knight.position.x,
        knight.position.y + camHeight,
        knight.position.z
    );
}

function animate() {
    requestAnimationFrame(animate);

    // Update animation mixer
    if (mixer) mixer.update(0.016);

    // Move character and camera
    handleMovement();
    updateCamera();

    renderer.render(scene, camera);
}

function onWindowResize() {
    // Maintain aspect ratio on window resize
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
