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
  shipSpeed: 0.1, // Reduced speed for easier control
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



// --- GAMEPLAY ELEMENTS: FISH & MISSIONS ---

// Fish Metadata
const FISH_TYPES = [
    { name: 'Red', color: 0xff2222 }, // Brighter red
    { name: 'Blue', color: 0x2222ff },
    { name: 'Green', color: 0x22ff22 },
    { name: 'Yellow', color: 0xffff00 },
    { name: 'Purple', color: 0xaa22ff }
];

class Fish {
    constructor(type) {
        this.type = type;
        this.mesh = new THREE.Group();
        
        // LARGE Fish Geometry (Easier to see)
        // Body
        const bodyGeo = new THREE.ConeGeometry(0.6, 1.5, 8); // 3x bigger
        bodyGeo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ 
            color: type.color, 
            roughness: 0.2, // Shinier
            emissive: type.color,
            emissiveIntensity: 0.4 // More glowing/visible
        });
        const body = new THREE.Mesh(bodyGeo, mat);
        this.mesh.add(body);
        
        // Tail
        const tailGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
        tailGeo.rotateX(-Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, mat);
        tail.position.z = 0.9;
        this.mesh.add(tail);

        // Randomize initial position
        this.reset();
        scene.add(this.mesh);
        
        // Animation offsets
        this.randomOffset = Math.random() * 100;
        this.speed = 0.02 + Math.random() * 0.03; // Slower fish
        this.jumpPhase = Math.random() * Math.PI * 2;
        this.jumping = false;
    }

    reset() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 140; // Spawn radius
        this.mesh.position.set(
            Math.cos(angle) * dist + shipWrapper.position.x,
            -0.5, // Underwater depth
            Math.sin(angle) * dist + shipWrapper.position.z
        );
        this.mesh.rotation.y = Math.random() * Math.PI * 2;
        this.active = true;
        this.mesh.visible = true;
    }

    update() {
        if (!this.active) return;

        // Swim changes
        const timeVal = time * 2 + this.randomOffset;
        
        // Wiggle
        this.mesh.children[1].rotation.y = Math.sin(timeVal * 10) * 0.3; // Tail wiggle

        // Move forward
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(forward.multiplyScalar(this.speed));

        // Jump Logic
        if (!this.jumping && Math.random() < 0.005) { // More frequent jumps
            this.jumping = true;
            this.jumpTime = 0;
        }

        if (this.jumping) {
            this.jumpTime += 0.05;
            // Parabola jump
            this.mesh.position.y = Math.sin(this.jumpTime) * 2 - 0.5;
            this.mesh.rotation.x = -Math.sin(this.jumpTime) * 0.5; // Tilt up/down
            
            if (this.jumpTime > Math.PI) {
                this.jumping = false;
                this.mesh.position.y = -0.1;
                this.mesh.rotation.x = 0;
            }
        } else {
             // Keep AT water surface (fins visible)
             this.mesh.position.y = -0.1 + Math.sin(timeVal) * 0.1;
        }

        // Wrap around ship if too far
        if (this.mesh.position.distanceTo(shipWrapper.position) > 200) {
            this.reset();
        }
    }
}

// System
const fishes = [];
// Spawn 10 of each type
FISH_TYPES.forEach(type => {
    for(let i=0; i<8; i++) { // 40 fish total
        fishes.push(new Fish(type));
    }
});


// Mission Logic
const MISSION_CONFIG = {
    counts: [3, 4, 5], // Progression
};
let currentMission = {
    type: FISH_TYPES[3], // Start with Yellow
    target: 3,
    current: 0
};

// UI Elements
const uiMissionText = document.getElementById('mission-text');
const uiMissionCount = document.getElementById('mission-count');
const uiMissionColor = document.getElementById('mission-color');
const uiMissionProgress = document.getElementById('mission-progress');
const uiFeedbackParams = document.getElementById('feedback-container');

function updateMissionUI() {
    uiMissionCount.innerText = currentMission.target;
    uiMissionColor.innerText = currentMission.type.name;
    uiMissionColor.style.color = '#' + currentMission.type.color.toString(16).padStart(6, '0');
    uiMissionProgress.innerText = `${currentMission.current}/${currentMission.target}`;
}
updateMissionUI();

function showFeedback(text) {
    const el = document.createElement('div');
    el.className = 'feedback-item';
    el.innerText = text;
    uiFeedbackParams.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function checkCollisions() {
    fishes.forEach(fish => {
        if (!fish.active) return;

        // Simple distance check
        if (fish.mesh.position.distanceTo(shipWrapper.position) < 3.5) {
            // CATCH!
            fish.active = false;
            fish.mesh.visible = false;
            
            // Check Mission
            if (fish.type.name === currentMission.type.name) {
                currentMission.current++;
                showFeedback(currentMission.current.toString()); // Show number!
                
                // Mission Complete?
                if (currentMission.current >= currentMission.target) {
                    showFeedback("GREAT JOB!");
                    // New Mission after delay
                    setTimeout(nextMission, 2000);
                }
            } else {
                showFeedback("Oops!"); // Wrong fish
            }
            updateMissionUI();

            // Respawn fish later
            setTimeout(() => fish.reset(), 5000);
        }
    });
}

function nextMission() {
    // Pick random different color
    let newType = currentMission.type;
    while(newType === currentMission.type) {
        newType = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
    }
    currentMission.type = newType;
    currentMission.current = 0;
    // Keep target at 3 or increase? Let's keep specific simple logic for now
    currentMission.target = 3 + Math.floor(Math.random() * 3);
    
    updateMissionUI();
    const container = document.getElementById('mission-container');
    container.classList.remove('mission-complete');
    void container.offsetWidth; // trigger reflow
    container.classList.add('mission-complete');
}


// --- LOGIC LOOP ---
let wheelAngle = 0;
let shipHeading = 0;
let lastMouseX = 0;
let isDragging = false;
let time = 0;

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
    
    // Fish Updates
    fishes.forEach(f => f.update());
    checkCollisions();

    renderer.render(scene, camera);
}

animate();
