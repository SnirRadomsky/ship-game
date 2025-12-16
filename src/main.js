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
let shipSpeed = 0.1; // Now mutable
const CONFIG = {
  rudderSensitivity: 0.005,
  rockingAmplitude: 0.05,
  rockingSpeed: 0.5,
};

// ...

// PowerUp Logic moved below scene initialization


// State
let wheelAngle = 0;
let shipHeading = 0;
let lastMouseX = 0;
let isDragging = false;
let time = 0;
let keys = { left: false, right: false, up: false, down: false };


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

class Obstacle {
    constructor() {
        this.mesh = new THREE.Group();
        
        // Buoy Geometry
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0;
        this.mesh.add(base);
        
        const topGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.6;
        this.mesh.add(top);

        this.reset();
        scene.add(this.mesh);
    }
    
    reset() { 
        this.mesh.position.set(
            (Math.random() - 0.5) * 400,
            -0.2, 
            (Math.random() - 0.5) * 400
        );
        this.bobOffset = Math.random() * 100;
    }
    
    update() {
         // Bobbing
         this.mesh.position.y = -0.2 + Math.sin(time * 2 + this.bobOffset) * 0.2;
         
         // Rotate slightly
         this.mesh.rotation.z = Math.sin(time + this.bobOffset) * 0.1;
         
         // Respawn if too far
         if(this.mesh.position.distanceTo(shipWrapper.position) > 250) {
             this.mesh.position.set(
                 shipWrapper.position.x + (Math.random() - 0.5) * 300,
                 -0.2,
                 shipWrapper.position.z + (Math.random() - 0.5) * 300
             );
         }
    }
}
const obstacles = [];
for(let i=0; i<10; i++) obstacles.push(new Obstacle());

class Fish {
// ... (Fish class remains same, just ensuring context match)
    constructor(type) {
        this.type = type;
        this.mesh = new THREE.Group();
        
        // LARGE Fish Geometry
        const bodyGeo = new THREE.ConeGeometry(0.6, 1.5, 8); 
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
        // Spawn ahead of ship mostly
        const angle = -shipHeading + (Math.random() - 0.5) * Math.PI; // In front cone
        const dist = 40 + Math.random() * 100;
        this.mesh.position.set(
            shipWrapper.position.x + Math.sin(angle) * dist,
            -0.5,
            shipWrapper.position.z + Math.cos(angle) * dist
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

        if (!this.jumping && Math.random() < 0.005) { 
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

// Dolphin Class
class Dolphin {
    constructor() {
        this.mesh = new THREE.Group();
        // Grey Body
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        bodyGeo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, mat);
        this.mesh.add(body);
        
        // Fin
        const finGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
        const fin = new THREE.Mesh(finGeo, mat);
        fin.position.set(0, 0.4, -0.2);
        fin.rotation.x = -Math.PI / 4;
        this.mesh.add(fin);
        
        // Tail
        const tailGeo = new THREE.BoxGeometry(0.6, 0.1, 0.4);
        const tail = new THREE.Mesh(tailGeo, mat);
        tail.position.z = 0.8;
        this.mesh.add(tail);

        this.reset();
        scene.add(this.mesh);
        this.jumpOffset = Math.random() * 100;
    }
    
    reset() {
        // Spawn far out side
        const side = Math.random() > 0.5 ? 1 : -1;
        this.mesh.position.set(
            shipWrapper.position.x + side * (30 + Math.random() * 20),
            -2,
            shipWrapper.position.z + (Math.random() - 0.5) * 50
        );
        this.mesh.rotation.y = shipHeading; // Swim with ship
        this.active = true;
    }
    
    update() {
        // Parallel swim
        const speed = CONFIG.shipSpeed * 1.2; // Slightly faster than ship
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(forward.multiplyScalar(speed));
        
        // Jump cycle
        const jumpCycle = (time * 0.5 + this.jumpOffset) % (Math.PI * 4);
        if(jumpCycle < Math.PI) {
            // Jumping
            this.mesh.position.y = Math.sin(jumpCycle) * 3 - 1;
            this.mesh.rotation.x = -Math.cos(jumpCycle) * 0.5;
            if(Math.abs(this.mesh.position.y) < 0.2) particleManager.spawnSplash(this.mesh.position, 2);
        } else {
            this.mesh.position.y = -1;
            this.mesh.rotation.x = 0;
        }
        
        // Reset if passed
        if(this.mesh.position.distanceTo(shipWrapper.position) > 100) {
             const forwardDir = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), shipHeading);
             const target = shipWrapper.position.clone().add(forwardDir.multiplyScalar(-60)); // Behind
             this.mesh.position.copy(target);
             this.mesh.position.x += (Math.random() - 0.5) * 60;
             this.mesh.rotation.y = shipHeading;
        }
    }
}
const dolphins = [];
for(let i=0; i<3; i++) dolphins.push(new Dolphin());

// Bonus Fish (Golden)
class BonusFish extends Fish {
    constructor() {
        super({ name: 'Gold', color: 0xffd700 });
        this.mesh.children[0].material.emissiveIntensity = 0.8; // Shinier
        this.mesh.children[0].material.metalness = 1.0;
        this.isBonus = true;
        this.speed = 0.08; // Fast!
    }
}
const bonusFishes = [];
for(let i=0; i<3; i++) bonusFishes.push(new BonusFish());

// POWER UP LOGIC (Moved here to ensure scene exists)
const POWERUP_TYPES = [
    { name: 'Speed', color: 0x00ffff, icon: '⚡' },
    { name: 'Magnet', color: 0xff00ff, icon: '🧲' }
];

let activeEffects = {
    speedBoost: 0,
    magnet: 0
};

class PowerUp {
    constructor(type) {
        this.type = type;
        this.mesh = new THREE.Group();
        
        // Orb
        const orbGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const orbMat = new THREE.MeshStandardMaterial({ 
            color: type.color, 
            emissive: type.color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        this.mesh.add(orb);
        
        // Rings
        const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
        const ring = new THREE.Mesh(ringGeo, orbMat);
        ring.rotation.x = Math.PI / 2;
        this.mesh.add(ring);

        this.reset();
        scene.add(this.mesh);
        this.bobOffset = Math.random() * 100;
    }
    
    reset() {
        // Spawn relative to ship so player can find them!
        const angle = -shipHeading + (Math.random() - 0.5) * Math.PI * 0.8; // In front cone
        const dist = 50 + Math.random() * 150;
        
        this.mesh.position.set(
             shipWrapper.position.x + Math.sin(angle) * dist,
             0.5, 
             shipWrapper.position.z + Math.cos(angle) * dist
        );
        
        this.active = true;
        this.mesh.visible = true;
    }
    
    update() {
        if(!this.active) return;
        
        // Animation
        this.mesh.position.y = 0.5 + Math.sin(time * 3 + this.bobOffset) * 0.3;
        this.mesh.rotation.y += 0.05;
        this.mesh.children[1].rotation.x = Math.PI/2 + Math.sin(time) * 0.2;
        
        // Respawn if far
        if(this.mesh.position.distanceTo(shipWrapper.position) > 250) {
            this.reset();
        }
    }
}
const powerUps = [];
POWERUP_TYPES.forEach(type => {
    for(let i=0; i<5; i++) powerUps.push(new PowerUp(type));
});

function checkPowerUps() {
    powerUps.forEach(p => {
        if(!p.active) return;
        if(p.mesh.position.distanceTo(shipWrapper.position) < 4) {
             p.active = false;
             p.mesh.visible = false;
             
             // Activate Effect
             showFeedback(p.type.name + "!", true);
             audio.playTone('success');
             particleManager.spawnSparkles(shipWrapper.position, 40);
             
             if(p.type.name === 'Speed') {
                 activeEffects.speedBoost = 600; // Frames (~10s)
             } else if(p.type.name === 'Magnet') {
                 activeEffects.magnet = 600;
             }
             
             setTimeout(() => p.reset(), 15000);
        }
    });
}

function updateEffects() {
    if(activeEffects.speedBoost > 0) activeEffects.speedBoost--;
    if(activeEffects.magnet > 0) activeEffects.magnet--;
}


// Fish & Logic Update
const fishes = [];
FISH_TYPES.forEach(type => {
    for(let i=0; i<6; i++) fishes.push(new Fish(type));
});

let level = 1;
let currentMission = {
    type: FISH_TYPES[Math.floor(Math.random()*FISH_TYPES.length)],
    target: 2,
    current: 0,
    mode: 'count' // 'count' or 'math'
};

const uiMissionCount = document.getElementById('mission-count');
const uiMissionColor = document.getElementById('mission-color');
const uiMissionProgress = document.getElementById('mission-progress');
const uiFeedbackParams = document.getElementById('feedback-container');

// ... (Mission logic)
const uiLevel = document.getElementById('level-indicator');

function updateLevelUI() {
    uiLevel.innerText = 'Level: ' + level;
}

function updateMissionUI() {
    if(currentMission.mode === 'math') {
        const remaining = currentMission.target - currentMission.current;
        document.getElementById('mission-text').innerHTML = `Math Time! <br> You have ${currentMission.current}. needed ${currentMission.target}. <br> ${currentMission.current} + <span style='font-size:2rem;color:white'>?</span> = ${currentMission.target}`;
        uiMissionProgress.style.display = 'none';
        uiMissionColor.innerText = ''; 
    } else {
        document.getElementById('mission-text').innerHTML = `Catch <span id="mission-count">${currentMission.target}</span> <span id="mission-color">${currentMission.type.name}</span> Fish!`;
        const c = document.getElementById('mission-color');
        if(c) c.style.color = '#' + currentMission.type.color.toString(16).padStart(6, '0');
        uiMissionProgress.style.display = 'block';
        uiMissionProgress.innerText = `${currentMission.current}/${currentMission.target}`;
    }
}

function showFeedback(text, isBig = false) {
    const el = document.createElement('div');
    el.className = 'feedback-item';
    el.innerText = text;
    if(isBig) {
        el.style.fontSize = '4rem';
        el.style.color = '#fff700';
        el.style.textShadow = '0 0 20px black';
    }
    uiFeedbackParams.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function checkObstacles() {
    obstacles.forEach(obs => {
         const dist = obs.mesh.position.distanceTo(shipWrapper.position);
         if (dist < 4) {
             if(Math.random() < 0.1) { 
                 audio.playTone('fail');
                 showFeedback("WATCH OUT!");
             }
             shipRockingGroup.rotation.x = (Math.random()-0.5) * 0.5;
             shipRockingGroup.rotation.z = (Math.random()-0.5) * 0.5;
             const bounce = shipWrapper.position.clone().sub(obs.mesh.position).normalize().multiplyScalar(0.5);
             shipWrapper.position.add(bounce);
         }
    });
}

function checkCollisions() {
    // Regular Fish
    fishes.forEach(fish => handleFishCollision(fish));
    // Bonus Fish
    bonusFishes.forEach(fish => handleFishCollision(fish));
}

function handleFishCollision(fish) {
    if (!fish.active) return;
    if (fish.mesh.position.distanceTo(shipWrapper.position) < 3.5) {
        fish.active = false;
        fish.mesh.visible = false;
        
        // Bonus Fish Logic
        if(fish.isBonus) {
             showFeedback("+5 POINTS!", true);
             audio.playTone('success');
             particleManager.spawnSparkles(shipWrapper.position, 30);
             setTimeout(() => fish.reset(), 10000);
             return;
        }

        if (fish.type.name === currentMission.type.name || currentMission.mode === 'math') {
            currentMission.current++;
            
            // Visual Counting
            showFeedback(currentMission.current.toString(), true);
            particleManager.spawnSparkles(fish.mesh.position);
            audio.speak(currentMission.current.toString());
            
            if (currentMission.current >= currentMission.target) {
                showFeedback("GREAT JOB!");
                audio.speak("Great Job! Mission Complete!");
                particleManager.spawnSparkles(shipWrapper.position, 50);
                level++;
                updateLevelUI();
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
}

function nextMission() {
    // 30% chance of Math Mission if level > 2
    if(level > 2 && Math.random() < 0.3) {
        currentMission.mode = 'math';
        currentMission.current = Math.floor(Math.random() * 3) + 1; // Start with some logic
        currentMission.target = currentMission.current + Math.floor(Math.random() * 3) + 1;
        currentMission.type = { name: 'Any', color: 0xffffff }; // Any fish counts for math (simplification)
    } else {
        currentMission.mode = 'count';
        let newType = currentMission.type;
        while(newType === currentMission.type) {
            newType = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
        }
        currentMission.type = newType;
        currentMission.current = 0;
        currentMission.target = Math.min(10, 2 + level); 
    }
    
    updateMissionUI();
    const container = document.getElementById('mission-container');
    container.classList.remove('mission-complete');
    void container.offsetWidth; 
    container.classList.add('mission-complete');
    
    if(currentMission.mode === 'math') {
        audio.speak(`Math Time! You have ${currentMission.current}. Catch more to reach ${currentMission.target}`);
    } else {
        audio.speak(`Catch ${currentMission.target} ${currentMission.type.name} Fish`);
    }
}

const onDown = (x) => { isDragging = true; lastMouseX = x; audio.resume(); }; 
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

// ...
// ...

window.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if(e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = true;
    if(e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;
    audio.resume();
});
window.addEventListener('keyup', (e) => {
    if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if(e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
    if(e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// IMPORTANT: Attach camera to ship so it follows!
shipWrapper.add(camera);
camera.position.set(0, 3, 5); 
camera.rotation.set(-0.3, 0, 0);

// ...
const uiSpeed = document.getElementById('speedometer');

function animate() {
    requestAnimationFrame(animate);
    
    // Keyboard Input
    if (keys.left) wheelAngle -= 0.05;
    if (keys.right) wheelAngle += 0.05;
    
    // Speed Control
    if (keys.up) shipSpeed = Math.min(0.3, shipSpeed + 0.005);
    else if (keys.down) shipSpeed = Math.max(0.02, shipSpeed - 0.005);
    else {
        // Auto-settle to cruising speed
        if(shipSpeed > 0.1) shipSpeed -= 0.002;
        if(shipSpeed < 0.1) shipSpeed += 0.002;
    }
    
    // Apply Speed Boost
    let currentSpeed = shipSpeed;
    if(activeEffects.speedBoost > 0) currentSpeed *= 2.0;
    
    // Update Speedometer
    if(uiSpeed) uiSpeed.innerText = Math.round(currentSpeed * 200) + ' קמ"ש';

    // Clamp Wheel & Speed
    wheelAngle = Math.max(-2, Math.min(2, wheelAngle));
    wheelGroup.rotation.z = -wheelAngle;
    
    time += 0.01;
    water.material.uniforms['time'].value += 1.0 / 60.0;
    
    shipHeading += wheelAngle * -0.01;
    shipWrapper.rotation.y = shipHeading;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), shipHeading);
    shipWrapper.position.add(forward.multiplyScalar(currentSpeed));

    // Trail
    trailTimer++;
    if(trailTimer > (activeEffects.speedBoost > 0 ? 5 : 10)) { // Faster trail if boosted
        spawnTrailStep(); trailTimer = 0; 
    }
    trails.forEach((t, i) => {
        t.life -= 0.01;
        t.mesh.material.opacity = t.life * 0.4;
        t.mesh.scale.setScalar(1 + (1-t.life)); 
        if(t.life <= 0) { scene.remove(t.mesh); trails[i] = null; }
    });
    for(let i=trails.length-1; i>=0; i--) if(!trails[i]) trails.splice(i, 1);
    
    if (!isDragging && !keys.left && !keys.right) { 
        wheelAngle *= 0.98; 
        wheelGroup.rotation.z = -wheelAngle; 
    }
    
    shipRockingGroup.rotation.x = Math.sin(time) * 0.03;
    shipRockingGroup.rotation.z = Math.sin(time * 0.7) * 0.04 + (wheelAngle * 0.1); 
    
    fishes.forEach(f => f.update());
    dolphins.forEach(d => d.update());
    bonusFishes.forEach(f => f.update());
    powerUps.forEach(p => p.update()); // Update PowerUps
    obstacles.forEach(o => o.update());
    seagulls.forEach(s => s.update());
    particleManager.update();
    
    checkCollisions(); // This logic now handles Magnet
    checkObstacles();
    checkPowerUps(); // New check
    updateEffects(); // Tick timers

    renderer.render(scene, camera);
}

animate();
