// Shared 3D "island" world. Used by the main hub (index.html) and every wing
// (Campus Leadership, Projects & Coursework, DRC, Skills / About).
// Needs three.js (r128, global THREE) loaded first.
//
// init3DWorld({
//   rooms: [{ label, href, x, z, size, color, cap }],
//   theme: { sky, grass, meadow, rim, sparkles,
//            decor: 'pond' | 'stage' | 'tower' | 'arcade' | 'stack' },  // all optional
//   seed:  number,                                                     // optional, scenery layout
//   paths: 'grid' | 'spokes',                                          // optional, default by room count
//   npc:   { lines: ['...'], look: { ...BRI_LOOK overrides }, off: true }  // optional
// });

// ---------------------------------------------------------------------------
// Bri, the running character. Change the colors here and every page updates.
// hairStyle: 'long' | 'bun' | 'ponytail' | 'short'
// ---------------------------------------------------------------------------
const BRI_LOOK = {
  skin: 0xe6b08a,
  hair: 0x3a2318,
  hairStyle: 'long',
  top: 0xff6b8a,
  bottom: 0x3d5a99,
  shoes: 0xffffff,
  accent: 0xffd23f       // hair bow / scrunchie
};

function init3DWorld(cfg) {
  const noWebGL = document.getElementById('no-webgl');
  if (typeof THREE === 'undefined') { if (noWebGL) noWebGL.style.display = 'block'; return; }

  const ROOMS = cfg.rooms;
  const T = Object.assign(
    { sky: 0x9edcff, grass: 0x6ccf4f, meadow: 0x86dc62, rim: 0xf2d49b, decor: 'pond', sparkles: 0xffffff },
    cfg.theme || {}
  );
  const PATHS = cfg.paths || (ROOMS.length === 4 ? 'grid' : 'spokes');

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
  if (PATHS === 'grid') {
    addPath(0, 0, 14, 2.4);
    addPath(0, 0, 2.4, 14);
    addPath(-6, 0, 2.4, 12);
    addPath(6, 0, 2.4, 12);
    addPath(0, -6, 12, 2.4);
    addPath(0, 6, 12, 2.4);
  } else {
    // spokes: along x to the room's column, then along z to the room
    ROOMS.forEach(r => {
      if (r.x !== 0) addPath(r.x / 2, 0, Math.abs(r.x) + 2.4, 2.4);
      if (r.z !== 0) addPath(r.x, r.z / 2, 2.4, Math.abs(r.z) + 2.4);
    });
  }
  addMesh(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 40), 0xf9e6b8, 0, 0.03, 0, { cast: false });

  // Landmark in the back corner
  const LX = 16, LZ = -12;
  if (T.decor === 'stage') {
    addMesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 40), 0xffffff, LX, 0.02, LZ, { cast: false });
    addMesh(new THREE.CylinderGeometry(3.6, 3.6, 0.3, 40), 0xff5fa2, LX, 0.12, LZ);
    addMesh(new THREE.CylinderGeometry(1.6, 1.6, 0.34, 28), 0xffd23f, LX, 0.14, LZ, { cast: false });
  } else if (T.decor === 'tower') {
    // clock tower
    addMesh(new THREE.CylinderGeometry(3.2, 3.6, 0.5, 4), 0xe9d9f5, LX, 0.25, LZ).rotation.y = Math.PI / 4;
    addMesh(new THREE.BoxGeometry(2, 6.5, 2), 0xf6b8cf, LX, 3.7, LZ);
    addMesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), 0xffffff, LX, 7.1, LZ);
    const roof = addMesh(new THREE.ConeGeometry(1.9, 2.4, 4), 0x8b6cff, LX, 8.5, LZ);
    roof.rotation.y = Math.PI / 4;
    [[0, 1.05, 0], [0, -1.05, 0], [1.05, 0, Math.PI / 2], [-1.05, 0, Math.PI / 2]].forEach(([ox, oz, ry], i) => {
      const face = addMesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24), 0xffffff, LX + (i < 2 ? 0 : ox), 5.2, LZ + (i < 2 ? oz : 0), { cast: false });
      face.rotation.x = i < 2 ? Math.PI / 2 : 0;
      face.rotation.z = i < 2 ? 0 : Math.PI / 2;
      const hand = addMesh(new THREE.BoxGeometry(0.08, 0.5, 0.06), 0x23306b, LX + (i < 2 ? 0 : ox * 1.04), 5.3, LZ + (i < 2 ? oz * 1.04 : 0), { cast: false });
      if (i >= 2) hand.rotation.set(0, Math.PI / 2, 0);
    });
  } else if (T.decor === 'arcade') {
    // three little arcade cabinets
    [[-2.2, 0xff6b8a, 0x6fe0d3], [0, 0x22b8a9, 0xffd23f], [2.2, 0x8b6cff, 0xff9db3]].forEach(([dx, body, screen], i) => {
      const cab = addMesh(new THREE.BoxGeometry(1.5, 2.8, 1.2), body, LX + dx, 1.4, LZ + (i === 1 ? 0.6 : 0));
      cab.rotation.y = -0.35;
      const scr = addMesh(new THREE.BoxGeometry(1.1, 0.8, 0.06), screen, LX + dx, 1.9, LZ + (i === 1 ? 0.6 : 0) + 0.62, { cast: false });
      scr.material = new THREE.MeshBasicMaterial({ color: screen });
      scr.position.x = cab.position.x + Math.sin(0.35) * -0.62 * -1;
      scr.position.z = cab.position.z + Math.cos(0.35) * 0.62;
      scr.rotation.y = -0.35;
    });
  } else if (T.decor === 'stack') {
    // a stack of colorful blocks
    const cols = [0xffb81f, 0xff6b8a, 0x22b8a9, 0x8b6cff, 0x4d8cff];
    cols.forEach((c, i) => {
      const s = 2.6 - i * 0.35;
      const b = addMesh(new THREE.BoxGeometry(s, 0.7, s), c, LX, 0.35 + i * 0.7, LZ);
      b.rotation.y = i * 0.45;
    });
  } else {
    addMesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 40), 0xf2d49b, LX, 0.02, LZ, { cast: false });
    addMesh(new THREE.CylinderGeometry(3.6, 3.6, 0.14, 40), 0x4fb6ff, LX, 0.03, LZ, { cast: false });
    addMesh(new THREE.CylinderGeometry(1.3, 1.3, 0.16, 24), 0x8fd3ff, LX - 0.8, 0.04, LZ - 0.6, { cast: false });
  }

  // Rooms: colored pads with a sloped skirt and a lighter cap. The skirt is a
  // ramp the ball rides up, so it never looks like it is floating onto the pad.
  const ROOM_HEIGHT = 1.2;
  const PLAYER_RADIUS = 0.6;
  const GROUND_Y = PLAYER_RADIUS;
  const CAP_HEIGHT = 0.18;
  const RAMP = 2.0;

  ROOMS.forEach(r => {
    const half = r.size / 2;
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(half * Math.SQRT2, (half + RAMP) * Math.SQRT2, ROOM_HEIGHT - CAP_HEIGHT, 4, 1),
      mat(r.color)
    );
    skirt.rotation.y = Math.PI / 4;
    skirt.position.set(r.x, (ROOM_HEIGHT - CAP_HEIGHT) / 2, r.z);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    scene.add(skirt);

    addMesh(new THREE.BoxGeometry(r.size + 0.2, CAP_HEIGHT, r.size + 0.2), r.cap, r.x, ROOM_HEIGHT - CAP_HEIGHT / 2, r.z);

    const o = half - 0.2;
    [[-o, -o], [o, -o], [-o, o], [o, o]].forEach(([dx, dz]) => {
      addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), 0xffffff, r.x + dx, ROOM_HEIGHT + 0.25, r.z + dz);
      addMesh(new THREE.SphereGeometry(0.2, 14, 14), r.color, r.x + dx, ROOM_HEIGHT + 0.6, r.z + dz);
    });
  });

  // Height of the walkable surface at a point (0 on the ground, up the ramp, ROOM_HEIGHT on a pad)
  function surfaceHeight(x, z) {
    let h = 0, lift = 0;
    ROOMS.forEach(r => {
      const half = r.size / 2;
      const d = Math.max(Math.abs(x - r.x), Math.abs(z - r.z));
      if (d >= half + RAMP) return;
      const t = Math.min(1, (half + RAMP - d) / RAMP);
      const edge = Math.min(1, Math.max(0, (half + 0.1 - d) / 0.2));
      const hh = (ROOM_HEIGHT - CAP_HEIGHT) * t + CAP_HEIGHT * edge;
      if (hh > h) {
        h = hh;
        lift = 0.07 * Math.min(1, hh / 0.2) * (1 - edge);
      }
    });
    return h + lift;
  }

  // Small deterministic random so scenery is the same every load
  let seed = cfg.seed || 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function farFromRooms(x, z, margin) {
    return ROOMS.every(r => Math.hypot(x - r.x, z - r.z) > r.size / 2 + margin) &&
           Math.hypot(x - LX, z - LZ) > 6;
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
    if (!farFromRooms(x, z, 1.4 + RAMP)) continue;
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
    if (!farFromRooms(x, z, 2 + RAMP)) continue;
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

  // Sparkles: little glowing dots drifting up and down for extra color
  // (uses Math.random so the scenery layout above stays the same)
  const sparkleCols = [T.sparkles, 0xffd23f, 0xff9db3, 0x9be7ff];
  const sparkles = [];
  for (let i = 0; i < 34; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + Math.random() * 0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: sparkleCols[i % sparkleCols.length], transparent: true, opacity: 0.85 })
    );
    const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 22;
    s.position.set(Math.cos(a) * d, 1 + Math.random() * 3, Math.sin(a) * d);
    s.userData = { baseY: s.position.y, phase: Math.random() * 6.28, speed: 0.6 + Math.random() * 0.9 };
    scene.add(s);
    sparkles.push(s);
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

  // -------------------------------------------------------------------------
  // Bri: a character that runs around the island and chats when you get close
  // -------------------------------------------------------------------------
  const npcCfg = cfg.npc || {};
  const LOOK = Object.assign({}, BRI_LOOK, npcCfg.look || {});
  const NPC_LINES = npcCfg.lines || [
    "Hi! I'm Briana. Welcome to my portfolio.",
    'Every room is a short story or game from something I have worked on.',
    'Click anywhere to roll there, or press Enter at a room to go in.'
  ];

  function box(w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.castShadow = true;
    return m;
  }

  function makeBri() {
    const g = new THREE.Group();
    const parts = {};

    function limb(radius, length, color, y, x) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, length, 10), mat(color));
      m.position.y = -length / 2;
      m.castShadow = true;
      pivot.add(m);
      return { pivot, mesh: m };
    }

    // legs and shoes
    ['L', 'R'].forEach((side, i) => {
      const x = i === 0 ? -0.14 : 0.14;
      const leg = limb(0.11, 0.72, LOOK.bottom, 0.78, x);
      const shoe = box(0.22, 0.12, 0.34, LOOK.shoes);
      shoe.position.set(0, -0.74, 0.05);
      leg.pivot.add(shoe);
      g.add(leg.pivot);
      parts['leg' + side] = leg.pivot;
    });

    // torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.72, 14), mat(LOOK.top));
    torso.position.y = 1.14;
    torso.castShadow = true;
    g.add(torso);
    parts.torso = torso;

    // arms (sleeve + skin)
    ['L', 'R'].forEach((side, i) => {
      const x = i === 0 ? -0.37 : 0.37;
      const arm = limb(0.07, 0.6, LOOK.skin, 1.42, x);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 0.22, 10), mat(LOOK.top));
      sleeve.position.y = -0.11;
      arm.pivot.add(sleeve);
      g.add(arm.pivot);
      parts['arm' + side] = arm.pivot;
    });

    // head, face and hair
    const head = new THREE.Group();
    head.position.y = 1.78;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), mat(LOOK.skin));
    skull.castShadow = true;
    head.add(skull);
    [-0.1, 0.1].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2b1b14 }));
      eye.position.set(ex, 0.03, 0.27);
      head.add(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff9db3, transparent: true, opacity: 0.55 }));
      cheek.position.set(ex * 1.7, -0.06, 0.24);
      cheek.scale.z = 0.4;
      head.add(cheek);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8a3b3b }));
    smile.position.set(0, -0.08, 0.285);
    smile.rotation.z = Math.PI;
    head.add(smile);

    const hairMat = mat(LOOK.hair);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.rotation.x = -0.35;
    cap.position.set(0, 0.04, -0.02);
    cap.castShadow = true;
    head.add(cap);
    if (LOOK.hairStyle === 'long') {
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.85, 14), hairMat);
      back.position.set(0, -0.3, -0.14);
      back.scale.z = 0.55;
      back.castShadow = true;
      head.add(back);
      parts.hairBack = back;
    } else if (LOOK.hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), hairMat);
      bun.position.set(0, 0.36, -0.1);
      head.add(bun);
    } else if (LOOK.hairStyle === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 0.6, 10), hairMat);
      tail.position.set(0, -0.05, -0.36);
      tail.rotation.x = -0.5;
      head.add(tail);
      parts.hairBack = tail;
    }
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), mat(LOOK.accent));
    bow.position.set(0.22, 0.2, -0.05);
    head.add(bow);

    g.add(head);
    parts.head = head;
    g.userData.parts = parts;
    scene.add(g);
    return g;
  }

  let bri = null;
  const briState = { x: 0, z: 0, tx: 0, tz: 0, runPhase: 0, talking: false, lineIdx: 0, lineTimer: 0, speed: 0, idleWait: 0 };
  let bubbleEl = null, tagEl = null;

  if (!npcCfg.off) {
    bri = makeBri();
    briState.x = 3; briState.z = 3;
    bri.position.set(briState.x, 0, briState.z);

    const wrap = document.getElementById('scene-wrap');
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'npc-bubble';
    wrap.appendChild(bubbleEl);
    tagEl = document.createElement('div');
    tagEl.className = 'npc-tag';
    tagEl.textContent = 'Briana';
    wrap.appendChild(tagEl);
  }

  function blockedByRoom(x, z, pad) {
    return ROOMS.some(r => Math.max(Math.abs(x - r.x), Math.abs(z - r.z)) < r.size / 2 + RAMP + pad);
  }

  function pickBriTarget() {
    for (let n = 0; n < 40; n++) {
      const x = (Math.random() * 2 - 1) * 16;
      const z = (Math.random() * 2 - 1) * 16;
      if (blockedByRoom(x, z, 0.8) || Math.hypot(x - LX, z - LZ) < 5.5) continue;
      // make sure the straight run does not cut through a room
      let ok = true;
      for (let s = 1; s <= 12; s++) {
        const px = briState.x + (x - briState.x) * s / 12;
        const pz = briState.z + (z - briState.z) * s / 12;
        if (blockedByRoom(px, pz, 0.8) || Math.hypot(px - LX, pz - LZ) < 4.5) { ok = false; break; }
      }
      if (ok) { briState.tx = x; briState.tz = z; return; }
    }
    briState.tx = briState.x; briState.tz = briState.z;
  }
  pickBriTarget();

  const BRI_SPEED = 4.2;

  function updateBri(delta, elapsed) {
    if (!bri) return;
    const parts = bri.userData.parts;
    const dxp = player.position.x - briState.x;
    const dzp = player.position.z - briState.z;
    const distToPlayer = Math.hypot(dxp, dzp);

    briState.talking = distToPlayer < 3.6;
    let moving = false;
    let faceX = 0, faceZ = 0, hasFace = false;

    if (briState.talking) {
      faceX = dxp; faceZ = dzp; hasFace = true;
      briState.lineTimer += delta;
      if (briState.lineTimer > 4.5) {
        briState.lineTimer = 0;
        briState.lineIdx = (briState.lineIdx + 1) % NPC_LINES.length;
      }
    } else if (briState.idleWait > 0) {
      briState.idleWait -= delta;
    } else {
      const dx = briState.tx - briState.x;
      const dz = briState.tz - briState.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.4) {
        briState.idleWait = 0.4 + Math.random() * 1.6;
        pickBriTarget();
      } else {
        const step = Math.min(dist, BRI_SPEED * delta);
        const nx = briState.x + (dx / dist) * step;
        const nz = briState.z + (dz / dist) * step;
        if (blockedByRoom(nx, nz, 0.5)) {
          pickBriTarget();
        } else {
          briState.x = nx; briState.z = nz;
          faceX = dx; faceZ = dz; hasFace = true;
          moving = true;
        }
      }
    }

    // smooth turning
    if (hasFace) {
      const want = Math.atan2(faceX, faceZ);
      let diff = want - bri.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      bri.rotation.y += diff * Math.min(1, 10 * delta);
    }

    // run cycle
    briState.speed += ((moving ? 1 : 0) - briState.speed) * Math.min(1, 10 * delta);
    briState.runPhase += delta * 11 * briState.speed;
    const swing = Math.sin(briState.runPhase) * 0.95 * briState.speed;
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armL.rotation.x = -swing * 0.9;
    parts.armR.rotation.x = swing * 0.9;
    const bob = Math.abs(Math.sin(briState.runPhase)) * 0.1 * briState.speed;
    const breathe = Math.sin(elapsed * 2) * 0.012 * (1 - briState.speed);
    bri.position.set(briState.x, bob + breathe, briState.z);
    parts.torso.rotation.x = 0.12 * briState.speed;
    if (parts.hairBack) parts.hairBack.rotation.x = (parts.hairBack.rotation.x * 0.9) + (briState.speed * 0.15 * Math.sin(briState.runPhase * 0.5) * 0.1);

    // wave when talking
    if (briState.talking) {
      parts.armR.rotation.x = -2.4 + Math.sin(elapsed * 9) * 0.25;
      parts.armR.rotation.z = -0.25;
    } else {
      parts.armR.rotation.z = 0;
    }
  }

  const briHead = new THREE.Vector3();
  function updateBriLabels() {
    if (!bri) return;
    briHead.set(briState.x, 2.65, briState.z).project(camera);
    const visible = briHead.z < 1;
    const sx = (briHead.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-briHead.y * 0.5 + 0.5) * window.innerHeight;
    tagEl.style.left = sx + 'px';
    tagEl.style.top = sy + 'px';
    tagEl.style.display = visible && !briState.talking ? 'block' : 'none';
    bubbleEl.style.left = sx + 'px';
    bubbleEl.style.top = (sy - 8) + 'px';
    if (briState.talking && visible) {
      bubbleEl.textContent = NPC_LINES[briState.lineIdx];
      bubbleEl.style.display = 'block';
    } else {
      bubbleEl.style.display = 'none';
    }
  }

  // -------------------------------------------------------------------------
  // Movement: keys, click-to-roll, and clickable room labels
  // -------------------------------------------------------------------------
  const keys = {};
  let activeRoom = null;
  let autoTarget = null;
  let travelled = 0;

  function enterRoom(room) {
    window.location.href = room.href;
  }

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'Enter' && activeRoom) enterRoom(activeRoom);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  // Click or tap anywhere on the ground to roll there
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  renderer.domElement.addEventListener('pointerdown', e => {
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      autoTarget = {
        x: Math.max(-17, Math.min(17, hit.x)),
        z: Math.max(-17, Math.min(17, hit.z))
      };
    }
  });

  const velocity = new THREE.Vector2(0, 0);
  const MAX_SPEED = 6;
  const ACCEL = 24;
  const DAMPING = 10;

  const cameraTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let cameraInitialized = false;
  const promptEl = document.getElementById('prompt-3d');
  if (promptEl) {
    promptEl.addEventListener('click', () => { if (activeRoom) enterRoom(activeRoom); });
  }

  // Short controls card, fades once the player has moved a bit
  const wrapEl = document.getElementById('scene-wrap');
  const controlsEl = document.createElement('div');
  controlsEl.id = 'controls-card';
  controlsEl.innerHTML =
    '<strong>How to move</strong>' +
    '<span>WASD or arrow keys, or click the ground to roll there</span>' +
    '<span>Enter, or click a room name, to go inside</span>';
  wrapEl.appendChild(controlsEl);

  function updatePlayer(delta) {
    let dx = 0, dz = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dz -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dz += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    let targetX = 0, targetZ = 0;
    if (dx !== 0 || dz !== 0) {
      autoTarget = null;
      const len = Math.sqrt(dx * dx + dz * dz);
      targetX = (dx / len) * MAX_SPEED;
      targetZ = (dz / len) * MAX_SPEED;
    } else if (autoTarget) {
      const ax = autoTarget.x - player.position.x;
      const az = autoTarget.z - player.position.z;
      const dist = Math.hypot(ax, az);
      if (dist < 0.25) {
        autoTarget = null;
      } else {
        const sp = MAX_SPEED * Math.min(1, dist / 1.6);
        targetX = (ax / dist) * sp;
        targetZ = (az / dist) * sp;
      }
    }

    const rate = (targetX === 0 && targetZ === 0) ? DAMPING : ACCEL;
    velocity.x += (targetX - velocity.x) * Math.min(rate * delta, 1);
    velocity.y += (targetZ - velocity.y) * Math.min(rate * delta, 1);

    const before = player.position.clone();
    player.position.x += velocity.x * delta;
    player.position.z += velocity.y * delta;
    player.position.x = Math.max(-18, Math.min(18, player.position.x));
    player.position.z = Math.max(-18, Math.min(18, player.position.z));

    player.rotation.z -= (velocity.x * delta) / PLAYER_RADIUS;
    player.rotation.x += (velocity.y * delta) / PLAYER_RADIUS;

    travelled += Math.hypot(player.position.x - before.x, player.position.z - before.z);
    if (travelled > 5) controlsEl.classList.add('dim');

    activeRoom = ROOMS.find(r =>
      Math.abs(player.position.x - r.x) < r.size / 2 &&
      Math.abs(player.position.z - r.z) < r.size / 2
    ) || null;

    // Ride the ramp: height follows the surface under the ball
    const targetY = GROUND_Y + surfaceHeight(player.position.x, player.position.z);
    player.position.y += (targetY - player.position.y) * Math.min(1, 25 * delta);

    if (activeRoom) {
      promptEl.textContent = `Press Enter or tap here to go to ${activeRoom.label}`;
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

  function updateSparkles(elapsed) {
    sparkles.forEach(s => {
      const u = s.userData;
      s.position.y = u.baseY + Math.sin(elapsed * u.speed + u.phase) * 0.5;
      s.material.opacity = 0.55 + 0.35 * Math.sin(elapsed * u.speed * 1.7 + u.phase);
    });
  }

  // Floating HTML labels projected from each room's 3D position. Clicking a
  // label rolls the ball to that room, and clicking again goes inside.
  const labelsEl = document.getElementById('labels');
  const labelEls = ROOMS.map(r => {
    const el = document.createElement('div');
    el.className = 'room-label';
    el.textContent = r.label;
    el.style.background = '#' + r.color.toString(16).padStart(6, '0');
    el.addEventListener('click', () => {
      if (activeRoom === r) enterRoom(r);
      else autoTarget = { x: r.x, z: r.z };
    });
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
    const elapsed = clock.elapsedTime;
    updatePlayer(delta);
    updateBri(delta, elapsed);
    updateCamera(delta);
    updateClouds(delta);
    updateSparkles(elapsed);
    updateLabels();
    updateBriLabels();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}
