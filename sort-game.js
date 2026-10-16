// Generic shuffled sorting round: drag a card into a bin, or click a card then click a bin.
// Expects these ids on the page: entry, game, results, timer, score, placed,
// card-pool, bin-row, final-score. Start a round with startRound().
//
// initSortGame({
//   bins:      [{ id, label }],
//   makeRound: () => [{ id, label, sub?, answer, wide? }],   // fresh random cards each call
//   seconds:   60,
//   binRowClass: 'five'                                      // optional extra class for #bin-row
// });

function initSortGame(cfg) {
  const $ = id => document.getElementById(id);
  const binLabel = {};
  cfg.bins.forEach(b => { binLabel[b.id] = b.label; });

  let cards = [];
  let total = 0;
  let placedCount = 0;
  let correctCount = 0;
  let selectedId = null;
  let timeLeft = 0;
  let timerInterval = null;
  let best = 0;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    $(id).classList.remove('hidden');
  }

  function updateHud() {
    $('timer').textContent = Math.max(timeLeft, 0);
    $('score').textContent = correctCount;
    $('placed').textContent = `${placedCount}/${total}`;
  }

  function buildBins() {
    const row = $('bin-row');
    row.innerHTML = '';
    if (cfg.binRowClass) row.classList.add(cfg.binRowClass);

    cfg.bins.forEach(b => {
      const bin = document.createElement('div');
      bin.className = 'bin';
      bin.dataset.category = b.id;

      const h = document.createElement('h3');
      h.textContent = b.label;
      bin.appendChild(h);

      bin.addEventListener('dragover', e => {
        e.preventDefault();
        bin.classList.add('drag-over');
      });
      bin.addEventListener('dragleave', () => bin.classList.remove('drag-over'));
      bin.addEventListener('drop', e => {
        e.preventDefault();
        bin.classList.remove('drag-over');
        placeCard(e.dataTransfer.getData('text/plain'), b.id);
      });
      bin.addEventListener('click', () => {
        if (selectedId) placeCard(selectedId, b.id);
      });

      row.appendChild(bin);
    });
  }

  function renderPool() {
    const pool = $('card-pool');
    pool.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'event-card' + (card.wide ? ' wide' : '');
      el.draggable = true;
      el.dataset.id = card.id;

      const title = document.createElement('strong');
      title.textContent = card.label;
      el.appendChild(title);
      if (card.sub) {
        const sub = document.createElement('span');
        sub.textContent = card.sub;
        el.appendChild(sub);
      }

      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', card.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));

      el.addEventListener('click', () => {
        if (selectedId === card.id) {
          selectedId = null;
          el.classList.remove('selected');
          return;
        }
        document.querySelectorAll('.event-card').forEach(c => c.classList.remove('selected'));
        selectedId = card.id;
        el.classList.add('selected');
      });

      pool.appendChild(el);
    });
  }

  function placeCard(id, binId) {
    const idx = cards.findIndex(c => c.id === id);
    if (idx === -1) return;

    const card = cards[idx];
    cards.splice(idx, 1);

    const isCorrect = card.answer === binId;
    if (isCorrect) correctCount++;
    placedCount++;

    const bin = document.querySelector(`.bin[data-category="${binId}"]`);
    const chip = document.createElement('div');
    chip.className = 'bin-chip ' + (isCorrect ? 'correct' : 'incorrect');
    chip.textContent = isCorrect ? card.label : `${card.label} (belongs in ${binLabel[card.answer]})`;
    bin.appendChild(chip);

    const cardEl = document.querySelector(`.event-card[data-id="${id}"]`);
    if (cardEl) cardEl.remove();

    selectedId = null;
    updateHud();

    if (placedCount >= total) endRound();
  }

  function endRound() {
    clearInterval(timerInterval);
    best = Math.max(best, correctCount);
    const left = total - placedCount;
    $('final-score').textContent =
      `${correctCount} / ${total} correct` +
      (left > 0 ? `, ${left} left on the floor when time ran out` : '') +
      `. Best this visit: ${best}.`;
    showScreen('results');
  }

  function tick() {
    timeLeft--;
    updateHud();
    if (timeLeft <= 0) endRound();
  }

  window.startRound = function startRound() {
    cards = cfg.makeRound();
    total = cards.length;
    placedCount = 0;
    correctCount = 0;
    selectedId = null;
    timeLeft = cfg.seconds;

    buildBins();
    renderPool();
    updateHud();

    clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
    showScreen('game');
  };
}

// Shared helpers for building random rounds
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// n distinct integers from [min, max]
function pickDistinct(n, min, max) {
  const pool = [];
  for (let v = min; v <= max; v++) pool.push(v);
  return shuffleArray(pool).slice(0, n);
}