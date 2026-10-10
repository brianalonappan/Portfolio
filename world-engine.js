// Shared top-down "walkable world" engine.
// Used by both the main hub (index.html) and the DRC sub-hub (internship-externship.html).
// Call initWorld(rooms, options) after the page defines its own room list.

function initWorld(rooms, opts = {}) {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const promptEl = document.getElementById('world-prompt');

  // Logical game-space dimensions (what room coordinates are authored against).
  const W = canvas.width;
  const H = canvas.height;

  // Render the canvas at the screen's actual pixel density so it isn't blurry
  // on retina/high-DPI displays, while keeping all game logic in logical W x H units.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  ctx.scale(dpr, dpr);

  const speed = opts.speed || 4;
  const radius = opts.radius || 14;

  // Isometric projection: a simple 30-degree, scaled-down affine transform.
  // World/collision logic below stays in flat (x, y) coordinates — only
  // draw() and project() use these to render it as a tilted "diorama" instead
  // of a flat top-down map.
  const ISO_SCALE = 0.55;
  const ISO_ANGLE = Math.PI / 6; // 30 degrees
  const ISO_A = Math.cos(ISO_ANGLE) * ISO_SCALE;
  const ISO_B = Math.sin(ISO_ANGLE) * ISO_SCALE;
  const ISO_C = -Math.cos(ISO_ANGLE) * ISO_SCALE;
  const ISO_D = Math.sin(ISO_ANGLE) * ISO_SCALE;
  const CENTER_X = W / 2;
  const CENTER_Y = H / 2;

  function project(x, y) {
    const rx = x - CENTER_X;
    const ry = y - CENTER_Y;
    return {
      sx: CENTER_X + ISO_A * rx + ISO_C * ry,
      sy: CENTER_Y + ISO_B * rx + ISO_D * ry
    };
  }

  const player = { x: opts.startX || W / 2, y: opts.startY || H / 2 };
  const keys = {};
  let activeRoom = null;

  function onKeyDown(e) {
    keys[e.key] = true;
    if (e.key === 'Enter' && activeRoom) {
      window.location.href = activeRoom.href;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.key] = false;
  }

  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', () => canvas.focus());
  canvas.focus();

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    });
    lines.push(line.trim());
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  function update() {
    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / len) * speed;
      player.y += (dy / len) * speed;
    }

    player.x = Math.max(radius, Math.min(W - radius, player.x));
    player.y = Math.max(radius, Math.min(H - radius, player.y));

    activeRoom = rooms.find(r =>
      player.x > r.x && player.x < r.x + r.w &&
      player.y > r.y && player.y < r.y + r.h
    ) || null;

    if (promptEl) {
      if (activeRoom) {
        promptEl.textContent = `Press Enter to go to ${activeRoom.label}`;
        promptEl.style.display = 'block';
      } else {
        promptEl.style.display = 'none';
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f6f1e9';
    ctx.fillRect(0, 0, W, H);

    // Everything in this block is drawn in "world space" and skewed by the
    // isometric transform, so rectangles render as tilted parallelograms.
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.transform(ISO_A, ISO_B, ISO_C, ISO_D, 0, 0);

    // Ground plane
    ctx.fillStyle = '#efe7d8';
    ctx.fillRect(-CENTER_X, -CENTER_Y, W, H);
    ctx.strokeStyle = '#d9d2c3';
    ctx.lineWidth = 1;
    ctx.strokeRect(-CENTER_X, -CENTER_Y, W, H);

    rooms.forEach(r => {
      const isActive = r === activeRoom;
      const rx = r.x - CENTER_X;
      const ry = r.y - CENTER_Y;
      ctx.fillStyle = isActive ? '#1f2a44' : '#eee7db';
      ctx.fillRect(rx, ry, r.w, r.h);
      ctx.strokeStyle = '#d4a24e';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, r.w, r.h);
    });

    // Player token (a circle under this transform renders as a flattened oval)
    ctx.beginPath();
    ctx.arc(player.x - CENTER_X, player.y - CENTER_Y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a24e';
    ctx.fill();
    ctx.strokeStyle = '#1f2a44';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Labels are drawn upright, in screen space, positioned at each room's
    // projected center, so they stay readable instead of skewing with the floor.
    ctx.font = '14px Georgia';
    ctx.textAlign = 'center';
    rooms.forEach(r => {
      const isActive = r === activeRoom;
      const center = project(r.x + r.w / 2, r.y + r.h / 2);
      ctx.fillStyle = isActive ? '#f6f1e9' : '#1f2a44';
      wrapText(r.label, center.sx, center.sy, r.w * ISO_SCALE - 10, 16);
    });
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
}