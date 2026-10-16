// Shared 3D "island" world. Used by the main hub (index.html) and the DRC
// wing (internship-externship.html). Needs three.js (r128, global THREE) loaded first.
//
// init3DWorld({
//   rooms: [{ label, href, x, z, size, color, cap }],
//   theme: { sky, grass, meadow, rim, decor: 'pond' | 'stage' },   // all optional
//   seed:  number                                                   // optional, scenery layout
// });

function init3DWorld(cfg) {
  const noWebGL = document.getElementById('no-webgl');
  if (typeof THREE === 'undefined') { if (noWebGL) noWebGL.style.display = 'block'; return; }

  const ROOMS = cfg.rooms;
  const T = Object.assign(
    { sky: 0x9edcff, grass: 0x6ccf4f, meadow: 0x86dc62, rim: 0xf2d49b, decor: 'pond' },
    cfg.theme || {}
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(T.sky);
  scene.fog = new THREE.Fog(T.sky, 28, 75);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (err) {
    if (noWebGL) noWebGL.style.display = 'block';
    return;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('scene-wrap').appendChild(renderer.domElement);

  // Lighting: warm sun plus sky/ground bounce so shadows stay colorful
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x6fbf4a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff1d0, 0.9);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  scene.add(sun);

  function mat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  function addMesh(geo, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    scene.add(m);
    return m;
  }

  // Island: sandy rim, grass disc, lighter inner meadow
  addMesh(new THREE.CylinderGeometry(31, 31.6, 0.4, 64), T.rim, 0, -0.25, 0, { cast: false });
  addMesh(new THREE.CylinderGeometry(30, 30, 0.4, 64), T.grass, 0, -0.2, 0, { cast: false });
  addMesh(new THREE.CylinderGeometry(17, 17, 0.42, 64), T.meadow, 0, -0.19, 0, { cast: false });

  // Sand paths out to each room
  function addPath(x, z, w, d) {
    addMesh(new THREE.BoxGeometry(w, 0.06, d), 0xf5dca4, x, 0.02, z, { cast: false });
  }
  addPath(0, 0, 14, 2.4);
  addPath(0, 0, 2.4, 14);
  addPath(-6, 0, 2.4, 12);
  addPath(6, 0, 2.4, 12);
  addPath(0, -6, 12, 2.4);
  addPath(0, 6, 12, 2.4);
  addMesh(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 40), 0xf9e6b8, 0, 0.03, 0, { cast: false });

  // Landmark in the back corner: a pond, or a little stage for the dance wing
  if (T.decor === 'stage') {
    addMesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 40), 0xffffff, 16, 0.02, -12, { cast: false });
    addMesh(new THREE.CylinderGeometry(3.6, 3.6, 0.3, 40), 0xff5fa2, 16, 0.12, -12);
    addMesh(new THREE.CylinderGeometry(1.6, 1.6, 0.34, 28), 0xffd23f, 16, 0.14, -12, { cast: false });
  } else {
    addMesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 40), 0xf2d49b, 16, 0.02, -12, { cast: false });
    addMesh(new THREE.CylinderGeometry(3.6, 3.6, 0.14, 40), 0x4fb6ff, 16, 0.03, -12, { cast: false });
    addMesh(new THREE.CylinderGeometry(1.3, 1.3, 0.16, 24), 0x8fd3ff, 15.2, 0.04, -12.6, { cast: false });
  }

  // Rooms: colored platforms with a lighter cap. The top surface sits at
  // ROOM_HEIGHT so the ball can hop onto it.
  const ROOM_HEIGHT = 1.2;
  const PLAYER_RADIUS = 0.6;
  const GROUND_Y = PLAYER_RADIUS;
  const PLATFORM_Y = ROOM_HEIGHT + PLAYER_RADIUS;
  const CAP_HEIGHT = 0.18;

  ROOMS.forEach(r => {
    addMesh(new THREE.BoxGeometry(r.size, ROOM_HEIGHT - CAP_HEIGHT, r.size), r.color, r.x, (ROOM_HEIGHT - CAP_HEIGHT) / 2, r.z);
    addMesh(new THREE.BoxGeometry(r.size + 0.2, CAP_HEIGHT, r.size + 0.2), r.cap, r.x, ROOM_HEIGHT - CAP_HEIGHT / 2, r.z);

    const o = r.size / 2 - 0.2;
    [[-o, -o], [o, -o], [-o, o], [o, o]].forEach(([dx, dz]) => {
      addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), 0xffffff, r.x + dx, ROOM_HEIGHT + 0.25, r.z + dz);
      addMesh(new THREE.SphereGeometry(0.2, 14, 14), r.color, r.x + dx, ROOM_HEIGHT + 0.6, r.z + dz);
    });
  });

  // Small deterministic random so scenery is the same every load
  let seed = cfg.seed || 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function farFromRooms(x, z, margin) {
    return ROOMS.every(r => Math.hypot(x - r.x, z - r.z) > r.size / 2 + margin) &&
           Math.hypot(x - 16, z + 12) > 6;
  }

  // Trees (round and pine) around the outer ring
  const leafColors = [0x2fb344, 0x3fcf5a, 0x1f9d55, 0x57d36b];
  const pineColors = [0x1d8a5a, 0x23a06a];
  let placed = 0, tries = 0;
  while (placed < 38 && tries < 600) {
    tries++;
    const angle = rand() * Math.PI * 2;
    const dist = 10 + rand() * 18;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (!farFromRooms(x, z, 3.5)) continue;
    const s = 0.8 + rand() * 0.7;
    addMesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 1.2 * s, 8), 0x8a5a3a, x, 0.6 * s, z);
    if (rand() > 0.45) {
      addMesh(new THREE.SphereGeometry(0.95 * s, 14, 14), leafColors[Math.floor(rand() * leafColors.length)], x, 1.9 * s, z);
    } else {
      const c = pineColors[Math.floor(rand() * pineColors.length)];
      addMesh(new THREE.ConeGeometry(1.0 * s, 1.6 * s, 10), c, x, 1.7 * s, z);
      addMesh(new THREE.ConeGeometry(0.75 * s, 1.3 * s, 10), c, x, 2.5 * s, z);
    }
    placed++;
  }

  // Flowers and rocks
  const flowerColors = [0xff6b8a, 0xffd23f, 0xffffff, 0xff9d3f, 0xc79bff];
  placed = 0; tries = 0;
  while (placed < 70 && tries < 900) {
    tries++;
    const angle = rand() * Math.PI * 2;
    const dist = 3 + rand() * 24;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (!farFromRooms(x, z, 1.4)) continue;
    addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), 0x2fa84a, x, 0.15, z, { cast: false });
    addMesh(new THREE.SphereGeometry(0.13, 8, 8), flowerColors[Math.floor(rand() * flowerColors.length)], x, 0.34, z, { cast: false });
    placed++;
  }
  placed = 0; tries = 0;
  while (placed < 10 && tries < 200) {
    tries++;
    const angle = rand() * Math.PI * 2;
    const dist = 9 + rand() * 18;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (!farFromRooms(x, z, 2)) continue;
    const rock = addMesh(new THREE.DodecahedronGeometry(0.4 + rand() * 0.35, 0), 0xb9bfd0, x, 0.25, z);
    rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    placed++;
  }

  // Clouds
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const blobs = 3 + Math.floor(rand() * 3);
    for (let b = 0; b < blobs; b++) {
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(1.4 + rand() * 1.2, 14, 14),
        new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false })
      );
      blob.position.set(b * 1.6 - blobs * 0.8, rand() * 0.6, rand() * 1.2);
      blob.scale.y = 0.7;
      g.add(blob);
    }
    g.position.set(-45 + rand() * 90, 14 + rand() * 7, -40 + rand() * 50);
    g.userData.speed = 0.4 + rand() * 0.5;
    scene.add(g);
    clouds.push(g);
  }

  // Player: a striped ball so you can see it roll
  function makeBallTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const bands = ['#ff6b8a', '#ffd23f', '#22b8a9', '#8b6cff'];
    const w = c.width / 8;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = bands[i % bands.length];
      g.fillRect(i * w, 0, w, c.height);
    }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.arc(i * w + w / 2, c.height / 2, 9, 0, Math.PI * 2);
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  const player = new THREE.Mesh(
    new THREE.SphereGeometry(PLAYER_RADIUS, 32, 32),
    new THREE.MeshLambertMaterial({ map: makeBallTexture() })
  );
  player.position.set(0, GROUND_Y, 0);
  player.castShadow = true;
  scene.add(player);

  // Movement
  const keys = {};
  let activeRoom = null;

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'Enter' && activeRoom) {
      window.location.href = activeRoom.href;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  const velocity = new THREE.Vector2(0, 0);
  const MAX_SPEED = 6;
  const ACCEL = 24;
  const DAMPING = 10;

  const cameraTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let cameraInitialized = false;
  const promptEl = document.getElementById('prompt-3d');

  function updatePlayer(delta) {
    let dx = 0, dz = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dz -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dz += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    let targetX = 0, targetZ = 0;
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      targetX = (dx / len) * MAX_SPEED;
      targetZ = (dz / len) * MAX_SPEED;
    }

    const rate = (targetX === 0 && targetZ === 0) ? DAMPING : ACCEL;
    velocity.x += (targetX - velocity.x) * Math.min(rate * delta, 1);
    velocity.y += (targetZ - velocity.y) * Math.min(rate * delta, 1);

    player.position.x += velocity.x * delta;
    player.position.z += velocity.y * delta;
    player.position.x = Math.max(-18, Math.min(18, player.position.x));
    player.position.z = Math.max(-18, Math.min(18, player.position.z));

    player.rotation.z -= (velocity.x * delta) / PLAYER_RADIUS;
    player.rotation.x += (velocity.y * delta) / PLAYER_RADIUS;

    activeRoom = ROOMS.find(r =>
      Math.abs(player.position.x - r.x) < r.size / 2 &&
      Math.abs(player.position.z - r.z) < r.size / 2
    ) || null;

    // Start climbing a little before the ball reaches a room so the hop
    // finishes before it would clip into the edge.
    const RAMP_MARGIN = 2.5;
    const nearRoom = ROOMS.find(r =>
      Math.abs(player.position.x - r.x) < r.size / 2 + RAMP_MARGIN &&
      Math.abs(player.position.z - r.z) < r.size / 2 + RAMP_MARGIN
    ) || null;

    const targetY = nearRoom ? PLATFORM_Y : GROUND_Y;
    const hopRate = 1 - Math.pow(0.00001, delta);
    player.position.y += (targetY - player.position.y) * hopRate;

    if (activeRoom) {
      promptEl.textContent = `Press Enter to go to ${activeRoom.label}`;
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  }

  function updateCamera(delta) {
    cameraTarget.set(player.position.x, 7, player.position.z + 9);
    lookTarget.set(player.position.x, 0.5, player.position.z);

    if (!cameraInitialized) {
      camera.position.copy(cameraTarget);
      cameraInitialized = true;
    } else {
      const camRate = 1 - Math.pow(0.001, delta);
      camera.position.lerp(cameraTarget, camRate);
    }

    camera.lookAt(lookTarget);
  }

  function updateClouds(delta) {
    clouds.forEach(c => {
      c.position.x += c.userData.speed * delta;
      if (c.position.x > 55) c.position.x = -55;
    });
  }

  // Floating HTML labels projected from each room's 3D position
  const labelsEl = document.getElementById('labels');
  const labelEls = ROOMS.map(r => {
    const el = document.createElement('div');
    el.className = 'room-label';
    el.textContent = r.label;
    el.style.background = '#' + r.color.toString(16).padStart(6, '0');
    labelsEl.appendChild(el);
    return el;
  });

  const labelPos = new THREE.Vector3();
  function updateLabels() {
    ROOMS.forEach((r, i) => {
      labelPos.set(r.x, 2.9, r.z);
      labelPos.project(camera);
      labelEls[i].style.left = `${(labelPos.x * 0.5 + 0.5) * window.innerWidth}px`;
      labelEls[i].style.top = `${(-labelPos.y * 0.5 + 0.5) * window.innerHeight}px`;
      labelEls[i].style.display = labelPos.z < 1 ? 'block' : 'none';
    });
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    updatePlayer(delta);
    updateCamera(delta);
    updateClouds(delta);
    updateLabels();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}