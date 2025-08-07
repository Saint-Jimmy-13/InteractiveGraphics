// Core variables
let scene, camera, renderer, mixer, knight, cameraTarget;

// Key tracking and movement settings
const keysPressed = {};
const moveSpeed = 0.1;
const turnSpeed = 0.05;

// Initialize game scene
init();
animate();

function init() {
    // Create scene and sky background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);   // Sky blue

    // Setup camera (third-person style)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);   // Behind and above the player

    // Renderer setup
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(10, 50, 30);
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
        scene.add(knight);

        // Shadow settings
        knight.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        // Place knight so its feet are at y = 0
        const box = new THREE.Box3().setFromObject(knight);
        const height = box.max.y - box.min.y;
        knight.position.y = -box.min.y;

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
}

function animate() {
    requestAnimationFrame(animate);

    // Update animation mixer
    const delta = mixer ? 0.0016 : 0;
    if (mixer) mixer.update(delta);

    // Move character and camera
    if (knight) {
        handleMovement();
        updateCamera();
    }

    renderer.render(scene, camera);
}

function handleMovement() {
    const forward = keysPressed["KeyW"] || keysPressed["ArrowUp"];
    const backward = keysPressed["KeyS"] || keysPressed["ArrowDown"];
    const left = keysPressed["KeyA"] || keysPressed["ArrowLeft"];
    const right = keysPressed["KeyD"] || keysPressed["ArrowRight"];

    // Rotate character
    if (left) knight.rotation.y += turnSpeed;
    if (right) knight.rotation.y -= turnSpeed;

    // Move forward or backward
    if (forward || backward) {
        const dir = new THREE.Vector3(0, 0, forward ? -1 : 1);
        dir.applyQuaternion(knight.quaternion);
        knight.position.addScaledVector(dir, moveSpeed);
    }
}

function updateCamera() {
    // Compute camera position behind knight
    const offset = new THREE.Vector3(0, 2, 5).applyQuaternion(knight.quaternion);
    cameraTarget.position.copy(knight.position).add(offset);

    // Smoothly interpolate camera
    camera.position.lerp(cameraTarget.position, 0.1);
    camera.lookAt(knight.position);
}

function onWindowResize() {
    // Maintain aspect ratio on window resize
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
