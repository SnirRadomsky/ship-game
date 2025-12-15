import './style.css';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { AudioManager } from './audio.js';

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
  shipSpeed: 0.1, // Reduced speed
  rudderSensitivity: 0.005,
  rockingAmplitude: 0.05,
  rockingSpeed: 0.5,
};

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffdec0, 0.6); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffaa33, 2.0);
sunLight.position.set(50, 30, -50);
sunLight.castShadow = true;
scene.add(sunLight);

scene.fog = new THREE.FogExp2(0xaaccff, 0.002); 

// --- ASSETS ---
const textureLoader = new THREE.TextureLoader();

// Skybox
textureLoader.load('/textures/skybox.png', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    scene.environment = texture;
});

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

// Ship
const shipWrapper = new THREE.Group(); 
scene.add(shipWrapper);

const shipRockingGroup = new THREE.Group();
shipWrapper.add(shipRockingGroup);
shipRockingGroup.position.y = 0.5;

const deckGeo = new THREE.BoxGeometry(4, 0.5, 10);
const deckMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.8 });
const deck = new THREE.Mesh(deckGeo, deckMat);
deck.position.y = -0.25;
shipRockingGroup.add(deck);

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


// Mast
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

// --- AUDIO & VISUAL ENHANCEMENTS ---
const audio = new AudioManager();

class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.splashGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.splashMat = new THREE.MeshBasicMaterial({ color: 0xccffff });
        this.sparkleGeo = new THREE.OctahedronGeometry(0.3);
        this.sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    }
    spawnSplash(pos, count = 10) {
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(this.splashGeo, this.splashMat);
            mesh.position.copy(pos);
            mesh.position.y = 0; 
            const vel = new THREE.Vector3((Math.random()-0.5)*0.4, Math.random()*0.5, (Math.random()-0.5)*0.4);
            this.particles.push({ mesh, vel, type: 'splash', life: 1.0 });
            this.scene.add(mesh);
        }
        audio.playTone('splash');
    }
    spawnSparkles(pos, count = 15) {
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(this.sparkleGeo, this.sparkleMat);
            mesh.position.copy(pos);
            const vel = new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5);
            this.particles.push({ mesh, vel, type: 'sparkle', life: 1.5 });
            this.scene.add(mesh);
        }
        audio.playTone('success');
    }
    update() {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= 0.02;
            p.mesh.position.add(p.vel);
            p.vel.y -= 0.02; 
            p.mesh.rotation.x += 0.1; p.mesh.rotation.z += 0.1;
            p.mesh.scale.setScalar(Math.max(0, p.life));
            if (p.life <= 0 || p.mesh.position.y < -1) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}
const particleManager = new ParticleManager(scene);

// Trails
const trailGeo = new THREE.PlaneGeometry(2, 2);
const trailMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, transparent: true, opacity: 0.4,
    map: waterNormal // Reuse
});
const trails = [];
let trailTimer = 0;
function spawnTrailStep() {
    const t = new THREE.Mesh(trailGeo, trailMat.clone());
    t.rotation.x = -Math.PI / 2;
    t.position.copy(shipWrapper.position);
    t.position.y = 0.1;
    t.position.add(new THREE.Vector3(0,0,2.5).applyAxisAngle(new THREE.Vector3(0,1,0), shipWrapper.rotation.y));
    scene.add(t);
    trails.push({ mesh: t, life: 1.0 });
}

// Seagulls
const seagullGeo = new THREE.BufferGeometry();
const seagullVerts = new Float32Array([-0.5, 0, 0.2, 0, 0, -0.2, 0.5, 0, 0.2, 0, -0.1, 0]);
seagullGeo.setIndex([0,1,3, 1,2,3, 0,3,2]);
seagullGeo.setAttribute('position', new THREE.BufferAttribute(seagullVerts, 3));
const seagullMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

class Seagull {
    constructor() {
        this.mesh = new THREE.Mesh(seagullGeo, seagullMat);
        this.mesh.position.set((Math.random()-0.5)*100, 15 + Math.random()*10, (Math.random()-0.5)*100);
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.1 + Math.random() * 0.1;
        scene.add(this.mesh);
    }
    update() {
        const target = shipWrapper.position;
        const dist = this.mesh.position.distanceTo(target);
        if (dist > 50) {
             this.mesh.lookAt(target);
             this.mesh.translateZ(this.speed);
        } else {
             this.mesh.rotateY(0.01);
             this.mesh.translateZ(this.speed);
        }
        this.mesh.rotation.z = Math.sin(time * 5 + this.angle) * 0.2;
    }
}
const seagulls = [];
for(let i=0; i<10; i++) seagulls.push(new Seagull());

// --- GAMEPLAY ELEMENTS ---

const FISH_TYPES = [
    { name: 'Red', color: 0xff2222 },
    { name: 'Blue', color: 0x2222ff },
    { name: 'Green', color: 0x22ff22 },
    { name: 'Yellow', color: 0xffff00 },
    { name: 'Purple', color: 0xaa22ff }
];

class Fish {
    constructor(type) {
        this.type = type;
        this.mesh = new THREE.Group();
        
        // LARGE Fish Geometry
        const bodyGeo = new THREE.ConeGeometry(0.6, 1.5, 8); // 3x bigger
        bodyGeo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ 
            color: type.color, roughness: 0.2, emissive: type.color, emissiveIntensity: 0.4
        });
        const body = new THREE.Mesh(bodyGeo, mat);
        this.mesh.add(body);
        
        const tailGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
        tailGeo.rotateX(-Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, mat);
        tail.position.z = 0.9;
        this.mesh.add(tail);

        this.reset();
        scene.add(this.mesh);
        
        this.randomOffset = Math.random() * 100;
        this.speed = 0.02 + Math.random() * 0.03;
        this.jumping = false;
    }

    reset() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 140;
        this.mesh.position.set(
            Math.cos(angle) * dist + shipWrapper.position.x,
            -0.5,
            Math.sin(angle) * dist + shipWrapper.position.z
        );
        this.mesh.rotation.y = Math.random() * Math.PI * 2;
        this.active = true;
        this.mesh.visible = true;
    }

    update() {
        if (!this.active) return;
        const timeVal = time * 2 + this.randomOffset;
        this.mesh.children[1].rotation.y = Math.sin(timeVal * 10) * 0.3; // Tail wiggle
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(forward.multiplyScalar(this.speed));

        if (!this.jumping && Math.random() < 0.005) { // More frequent jumps
            this.jumping = true;
            this.jumpTime = 0;
            particleManager.spawnSplash(this.mesh.position, 5);
        }

        if (this.jumping) {
            this.jumpTime += 0.05;
            this.mesh.position.y = Math.sin(this.jumpTime) * 2 - 0.5;
            this.mesh.rotation.x = -Math.sin(this.jumpTime) * 0.5;
            if (this.jumpTime > Math.PI) {
                this.jumping = false;
                this.mesh.position.y = -0.1;
                this.mesh.rotation.x = 0;
                particleManager.spawnSplash(this.mesh.position, 5);
            }
        } else {
             this.mesh.position.y = -0.1 + Math.sin(timeVal) * 0.1;
        }

        if (this.mesh.position.distanceTo(shipWrapper.position) > 200) {
            this.reset();
        }
    }
}

const fishes = [];
FISH_TYPES.forEach(type => {
    for(let i=0; i<5; i++) fishes.push(new Fish(type));
});

let currentMission = {
    type: FISH_TYPES[3],
    target: 3,
    current: 0
};

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
        if (fish.mesh.position.distanceTo(shipWrapper.position) < 3.5) {
            fish.active = false;
            fish.mesh.visible = false;
            
            if (fish.type.name === currentMission.type.name) {
                currentMission.current++;
                showFeedback(currentMission.current.toString());
                particleManager.spawnSparkles(fish.mesh.position);
                audio.speak(currentMission.current.toString());
                if (currentMission.current >= currentMission.target) {
                    showFeedback("GREAT JOB!");
                    audio.speak("Great Job! Mission Complete!");
                    particleManager.spawnSparkles(shipWrapper.position, 50);
                    setTimeout(nextMission, 3000);
                }
            } else {
                showFeedback("Oops!");
                audio.playTone('fail');
                shipRockingGroup.rotation.z += 0.2; 
            }
            updateMissionUI();
            setTimeout(() => fish.reset(), 5000);
        }
    });
}

function nextMission() {
    let newType = currentMission.type;
    while(newType === currentMission.type) {
        newType = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
    }
    currentMission.type = newType;
    currentMission.current = 0;
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

const onDown = (x) => { isDragging = true; lastMouseX = x; audio.resume(); }; // Resume audio on first interaction
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

shipWrapper.add(camera);
camera.position.set(0, 3, 5); 
camera.rotation.set(-0.3, 0, 0);

function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01;
    water.material.uniforms['time'].value += 1.0 / 60.0;
    
    shipHeading += wheelAngle * -0.01;
    shipWrapper.rotation.y = shipHeading;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), shipHeading);
    shipWrapper.position.add(forward.multiplyScalar(CONFIG.shipSpeed));

    // Trail
    trailTimer++;
    if(trailTimer > 10) { spawnTrailStep(); trailTimer = 0; }
    trails.forEach((t, i) => {
        t.life -= 0.01;
        t.mesh.material.opacity = t.life * 0.4;
        t.mesh.scale.setScalar(1 + (1-t.life)); 
        if(t.life <= 0) { scene.remove(t.mesh); trails[i] = null; }
    });
    for(let i=trails.length-1; i>=0; i--) if(!trails[i]) trails.splice(i, 1);
    
    if (!isDragging) { wheelAngle *= 0.98; wheelGroup.rotation.z = -wheelAngle; }
    
    shipRockingGroup.rotation.x = Math.sin(time) * 0.03;
    shipRockingGroup.rotation.z = Math.sin(time * 0.7) * 0.04 + (wheelAngle * 0.1); 
    
    fishes.forEach(f => f.update());
    seagulls.forEach(s => s.update());
    particleManager.update();
    checkCollisions();

    renderer.render(scene, camera);
}

animate();
