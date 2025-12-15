import './style.css';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

window.onerror = function(message, source, lineno, colno, error) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.top = '10px';
  errDiv.style.left = '10px';
  errDiv.style.color = 'red';
  errDiv.style.background = 'rgba(0,0,0,0.8)';
  errDiv.style.padding = '10px';
  errDiv.style.zIndex = '9999';
  errDiv.innerText = 'Error: ' + message;
  document.body.appendChild(errDiv);
};

// Configuration
const CONFIG = {
  shipSpeed: 0.2, // Increased speed
  rudderSensitivity: 0.005,
  rockingAmplitude: 0.05,
  rockingSpeed: 0.5,
};

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Fallback sky color

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
// Camera will be attached to ship later, initially set here
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffdec0, 0.6); // Warmer ambient
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffaa33, 2.0);
sunLight.position.set(50, 30, -50);
sunLight.castShadow = true;
scene.add(sunLight);

// Fog for depth and atmosphere
scene.fog = new THREE.FogExp2(0xaaccff, 0.002); // Bluis fog

// --- ASSETS ---
const textureLoader = new THREE.TextureLoader();

// Skybox
textureLoader.load('/textures/skybox.png', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    scene.environment = texture;
}, undefined, function(err) {
    console.error("Skybox failed to load, keeping default color", err);
});

// Textures - Asynchronous loading is fine, materials will update
const woodTexture = textureLoader.load('/textures/wood.png');
woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(2, 2);
woodTexture.colorSpace = THREE.SRGBColorSpace;

const sailTexture = textureLoader.load('/textures/sail_canvas.png');
sailTexture.wrapS = sailTexture.wrapT = THREE.RepeatWrapping;
sailTexture.repeat.set(4, 4);

const waterNormal = textureLoader.load('/textures/water_normal.png');
waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;

// --- OBJECTS ---

// 1. Water
const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: waterNormal,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffaa33,
  waterColor: 0x001e0f,
  distortionScale: 3.7,
  fog: scene.fog !== undefined
});
water.rotation.x = -Math.PI / 2;
scene.add(water);

// 2. Ship Container (The whole ship that rocks)
const shipWrapper = new THREE.Group(); // Handles movement (position/rotationY)
scene.add(shipWrapper);

const shipRockingGroup = new THREE.Group(); // Handles rocking (rotationX/Z)
shipWrapper.add(shipRockingGroup);
// Lift the ship so the deck is above water
// Deck is at y=-0.25 relative to group. Top is 0.
// Let's move shipRockingGroup up by 0.5 so deck is at 0.25 (clear of water)
shipRockingGroup.position.y = 0.5;

// Deck
const deckGeo = new THREE.BoxGeometry(4, 0.5, 10);
const deckMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.8 });
const deck = new THREE.Mesh(deckGeo, deckMat);
deck.position.y = -0.25;
shipRockingGroup.add(deck);

// Hull (Simple bottom)
const hullGeo = new THREE.BoxGeometry(3.8, 1, 9);
const hullMat = new THREE.MeshStandardMaterial({ color: 0x3d2e23 });
const hull = new THREE.Mesh(hullGeo, hullMat);
hull.position.y = -1.0;
shipRockingGroup.add(hull);

// Railings
const railMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.5 });
const railVGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
for(let i=-5; i<=5; i+=1.5) {
  const postL = new THREE.Mesh(railVGeo, railMat);
  postL.position.set(-2, 0.4, i);
  shipRockingGroup.add(postL);
  const postR = new THREE.Mesh(railVGeo, railMat);
  postR.position.set(2, 0.4, i);
  shipRockingGroup.add(postR);
}
const railTopL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 10.2), railMat);
railTopL.position.set(-2, 0.8, 0);
shipRockingGroup.add(railTopL);
const railTopR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 10.2), railMat);
railTopR.position.set(2, 0.8, 0);
shipRockingGroup.add(railTopR);


// Mast and Sails
const mastGeo = new THREE.CylinderGeometry(0.15, 0.25, 8);
const mast = new THREE.Mesh(mastGeo, deckMat);
mast.position.set(0, 4, -2);
shipRockingGroup.add(mast);

const yardGeo = new THREE.CylinderGeometry(0.1, 0.1, 5);
const yard = new THREE.Mesh(yardGeo, deckMat);
yard.rotation.z = Math.PI / 2;
yard.position.set(0, 6, -2);
shipRockingGroup.add(yard);

// Sail
const sailGeo = new THREE.PlaneGeometry(4.8, 3, 10, 5);
const posAttribute = sailGeo.attributes.position;
for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const y = posAttribute.getY(i);
    const z = posAttribute.getZ(i);
    const bulge = Math.sin((x + 2.4) / 4.8 * Math.PI) * Math.sin((y + 1.5) / 3 * Math.PI);
    posAttribute.setZ(i, z + bulge * 0.8);
}
sailGeo.computeVertexNormals();
const sailMat = new THREE.MeshStandardMaterial({ 
    map: sailTexture, 
    side: THREE.DoubleSide, 
    alphaTest: 0.5 
});
const sail = new THREE.Mesh(sailGeo, sailMat);
sail.position.set(0, 4.5, -1.8);
sail.rotation.y = Math.PI;
shipRockingGroup.add(sail);

// Rigging
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
const createRope = (start, end, thickness = 0.03) => {
    const dist = start.distanceTo(end);
    const geometry = new THREE.CylinderGeometry(thickness, thickness, dist);
    const rope = new THREE.Mesh(geometry, ropeMat);
    rope.position.copy(start).clone().lerp(end, 0.5);
    rope.lookAt(end);
    rope.rotateX(-Math.PI / 2);
    return rope;
};
shipRockingGroup.add(createRope(new THREE.Vector3(-1.8, 0.5, -1.8), new THREE.Vector3(0, 7, -2)));
shipRockingGroup.add(createRope(new THREE.Vector3(1.8, 0.5, -1.8), new THREE.Vector3(0, 7, -2)));
shipRockingGroup.add(createRope(new THREE.Vector3(0, 8, -2), new THREE.Vector3(0, 1, -5))); 
shipRockingGroup.add(createRope(new THREE.Vector3(0, 7, -2), new THREE.Vector3(0, 1, 4))); 

// Helm
const helmGroup = new THREE.Group();
helmGroup.position.set(0, 1.1, 1.5);
shipRockingGroup.add(helmGroup);

const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), deckMat);
stand.position.y = -0.6;
helmGroup.add(stand);

const wheelGroup = new THREE.Group();
wheelGroup.position.y = 0.2;
helmGroup.add(wheelGroup);

const rimGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 32);
const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.3 });
wheelGroup.add(new THREE.Mesh(rimGeo, woodDarkMat));

const spokeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2);
for(let i=0; i<8; i++) {
  const spoke = new THREE.Mesh(spokeGeo, woodDarkMat);
  spoke.rotation.z = i * Math.PI / 4;
  wheelGroup.add(spoke);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.2), woodDarkMat);
  handle.position.set(Math.cos(i*Math.PI/4)*0.7, Math.sin(i*Math.PI/4)*0.7, 0);
  handle.rotation.z = i * Math.PI/4 - Math.PI/2;
  wheelGroup.add(handle);
}
wheelGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), new THREE.MeshStandardMaterial({color: 0xcfb997})));

// Boy
const boyGroup = new THREE.Group();
boyGroup.position.set(0, 0, 2.3);
shipRockingGroup.add(boyGroup);
boyGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7), new THREE.MeshStandardMaterial({ color: 0x708090 })).translateY(0.35));
boyGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshStandardMaterial({ color: 0xe0ac69 })).translateY(0.85));
boyGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })).translateY(0.9));


// --- GAMEPLAY ELEMENTS ---
// Targets/Crates to steer around
const crates = [];
const crateGeo = new THREE.BoxGeometry(1, 1, 1);
const crateMat = new THREE.MeshStandardMaterial({ map: woodTexture });

function spawnCrates() {
    for(let i=0; i<20; i++) {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(
            (Math.random() - 0.5) * 500,
            0, // Water level
            (Math.random() - 0.5) * 500
        );
        scene.add(crate);
        crates.push(crate);
    }
}
spawnCrates();

// --- LOGIC ---
let wheelAngle = 0;
let shipHeading = 0;
let lastMouseX = 0;
let isDragging = false;
let time = 0;
let score = 0;
const scoreEl = document.getElementById('score');

// Input
const onDown = (x) => { isDragging = true; lastMouseX = x; };
const onMove = (x) => {
    if (!isDragging) return;
    const delta = x - lastMouseX;
    wheelAngle += delta * 0.01;
    wheelAngle = Math.max(-2, Math.min(2, wheelAngle));
    wheelGroup.rotation.z = -wheelAngle;
    lastMouseX = x;
};
const onUp = () => { isDragging = false; };

window.addEventListener('mousedown', (e) => onDown(e.clientX));
window.addEventListener('mousemove', (e) => onMove(e.clientX));
window.addEventListener('mouseup', onUp);
window.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), {passive: false});
window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), {passive: false});
window.addEventListener('touchend', onUp);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Attach camera to shipWrapper for "Third Person" feeling, but smoothed
shipWrapper.add(camera);
camera.position.set(0, 3, 5); 
camera.rotation.set(-0.3, 0, 0);

function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    water.material.uniforms['time'].value += 1.0 / 60.0;
    
    // Physics
    // 1. Turning
    shipHeading += wheelAngle * -0.01;
    shipWrapper.rotation.y = shipHeading;
    
    // 2. Movement (Always moving forward if sail is up)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), shipHeading);
    shipWrapper.position.add(forward.multiplyScalar(CONFIG.shipSpeed));
    
    // 3. Wheel auto-center
    if (!isDragging) {
        wheelAngle *= 0.98;
        wheelGroup.rotation.z = -wheelAngle;
    }
    
    // 4. Rocking
    shipRockingGroup.rotation.x = Math.sin(time) * 0.03;
    shipRockingGroup.rotation.z = Math.sin(time * 0.7) * 0.04 + (wheelAngle * 0.1); // Lean into turn
    
    // Floating Crates (Simple "infinite" world)
    crates.forEach(crate => {
        crate.position.y = Math.sin(time * 2 + crate.position.x) * 0.2;
        crate.rotation.x = Math.sin(time + crate.position.z) * 0.1;

        if (crate.position.distanceTo(shipWrapper.position) > 300) {
             crate.position.set(
                shipWrapper.position.x + (Math.random() - 0.5) * 200,
                0,
                shipWrapper.position.z + (Math.random() - 0.5) * 200 - 100 
            );
        }
        
        // Collection
        if (crate.position.distanceTo(shipWrapper.position) < 4) {
             score += 10;
             scoreEl.innerText = 'Score: ' + score;
             // Respawn
             crate.position.set(
                shipWrapper.position.x + (Math.random() - 0.5) * 200,
                0,
                shipWrapper.position.z + (Math.random() - 0.5) * 200 - 150 
            );
        }
    });

    renderer.render(scene, camera);
}

animate();
