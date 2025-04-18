// Global variables
let csvData = [];
let cards = [];
let results = [];
let removedCards = [];
let highlightDefinitions = [];

// Cache start button
const startButton = document.getElementById('startButton');
startButton.disabled = true;
startButton.textContent = 'Loading data...';

async function loadData() {
  if (window.location.protocol === 'file:') {
    alert(
      '⚠️ Please serve via HTTP (e.g., `python -m http.server`) so fetch() can load local files.'
    );
    startButton.textContent = 'Serve via HTTP';
    return;
  }

  try {
    const [csvRes, jsonRes] = await Promise.all([
      fetch('data/clean.csv'),
      fetch('data/highlights.json'),
    ]);
    if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
    if (!jsonRes.ok) throw new Error(`JSON fetch failed: ${jsonRes.status}`);

    const [csvText, jsonData] = await Promise.all([
      csvRes.text(),
      jsonRes.json(),
    ]);

    csvData = await new Promise((res, rej) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        complete: p => res(p.data),
        error: err => rej(err),
      });
    });

    highlightDefinitions = jsonData.highlights || jsonData;

    startButton.disabled = false;
    startButton.textContent = 'Start';
  } catch (err) {
    console.error(err);
    startButton.textContent = 'Data load error';
    alert('Error loading data: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', loadData);
startButton.addEventListener('click', () => {
  if (!csvData.length) return alert('CSV not yet loaded.');
  if (!highlightDefinitions.length) return alert('Highlights not yet loaded.');
  startLabeling();
});

function startLabeling() {
  document.getElementById('startSection').style.display = 'none';
  document.getElementById('tinder').style.display = 'flex';

  highlightDefinitions.forEach((def, i) => {
    if (!def.name) def.name = 'Domain Fold 2 – chesscom';
    cards.push({ id: i, data: csvData, highlight: def, name: def.name });
  });

  document.getElementById('progress-bar').max = cards.length;
  generateCards();
}

function generateCards() {
  const container = document.getElementById('tinder--cards');
  container.innerHTML = '';
  for (let i = cards.length - 1; i >= 0; i--) {
    container.appendChild(generateCard(cards[i]));
  }
  updateProgress();
}

function generateCard(card) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'tinder--card';
  cardDiv.id = 'card-' + card.id;
  cardDiv.innerHTML = `
    <div class="table-container">
      <div id="table-${card.id}" style="width:100%; height:100%;"></div>
    </div>
    <div class="info-container">
      <h3 class="card-title">${card.name}</h3>
      <div class="pills-header">Error Detection Strategies:</div>
      <div class="pills-container">
        <span class="pill">Strategy01</span>
        <span class="pill">Strategy02</span>
        <span class="pill">Strategy03</span>
        <span class="pill">Strategy04</span>
        <span class="pill">Strategy05</span>
        <span class="pill">Strategy06</span>
      </div>
    </div>
  `;
  setTimeout(() => initializeTable(card), 0);
  setTimeout(() => randomlyColorPills(cardDiv), 0);
  attachHammer(cardDiv);
  return cardDiv;
}

function initializeTable(card) {
  const el = document.getElementById('table-' + card.id);
  if (!csvData.length) return;

  const headers = Object.keys(csvData[0]);
  const rowIdx  = card.highlight.row;
  const colName = card.highlight.column;

  const cols = headers.map(h => ({
    title: h,
    field: h,
    formatter(cell) {
      const r = cell.getRow().getPosition();
      const c = cell.getColumn().getField();
      if (r === rowIdx && c === colName) {
        return `<div class="highlight-cell">${cell.getValue()}</div>`;
      }
      return cell.getValue();
    },
  }));

  const table = new Tabulator(el, {
    data: card.data,
    layout: 'fitColumns',
    height: '100%',
    columns: cols,
    dataRendered: () => {
  const rows   = table.getRows();
  const target = rows[rowIdx];
  if (!target) return;

  // 1) Try Tabulator’s own centering
  table
    .scrollToRow(target, 'center')
    .then(() => table.scrollToColumn(colName, 'center'))
    .finally(() => {
      // 2) Manual fallback on the internal scroll container
      const holder = table
        .getElement()
        .querySelector('.tabulator-tableHolder');
      const rowEl  = target.getElement();
      const cellEl = rowEl?.querySelector(`[tabulator-field="${colName}"]`);

      if (holder && rowEl) {
        // center vertically
        const top    = rowEl.offsetTop;
        const hH     = holder.clientHeight;
        const rH     = rowEl.clientHeight;
        holder.scrollTop = top - hH/2 + rH/2;
      }

      if (holder && cellEl) {
        // center horizontally
        const left   = cellEl.offsetLeft;
        const hW     = holder.clientWidth;
        const cW     = cellEl.clientWidth;
        holder.scrollLeft = left - hW/2 + cW/2;
      }
    });
},

    
  });
}

  

function randomlyColorPills(cardDiv) {
  let pills = cardDiv.querySelectorAll('.pill');
  let highlighted = 0;
  pills.forEach(pill => {
    if (Math.random() < 0.3) {
      pill.style.backgroundColor = '#3b82f6';
      pill.style.color = '#fff';
      highlighted++;
    }
  });
  if (highlighted === 0 && pills.length) {
    const r = Math.floor(Math.random() * pills.length);
    pills[r].style.backgroundColor = '#3b82f6';
    pills[r].style.color = '#fff';
  }
}

function updateProgress() {
  const bar = document.getElementById('progress-bar');
  const txt = document.getElementById('progress-text');
  const done = results.length;
  bar.value = done;
  const pct = Math.round((done / cards.length) * 100);
  txt.innerHTML = `${pct}% (${done}/${cards.length})`;
  if (done === cards.length) showResult();
}



function showResult() {
  document.getElementById('tinder').style.display = 'none';
  const correct = results.filter(r => r.userSwipe === r.correct).length;
  const name = cards[0]?.name || '';
  const res = document.getElementById('result');
  res.style.display = 'block';
  res.innerHTML = `
    <h2>Results for ${name}</h2>
    <h3>You got ${correct} out of ${cards.length} correct!</h3>
    <button id="tryAgainBtn">Try Again</button>
  `;
  document.getElementById('tryAgainBtn').addEventListener('click', () => location.reload());
}

function recordSwipe(cardId, dir) {
  const def = highlightDefinitions.find(d => d.cardId === cardId);
  if (!def) return;
  results.push({ cardId, userSwipe: dir === 'right', correct: def.correct });
  updateProgress();
}

function getTopCard() {
  return document.querySelector('.tinder--card:not(.swiped)');
}

function removeCard(like) {
  const card = getTopCard();
  if (!card) return;
  const toX = like ? 100 : -100, ang = like ? 15 : -15;
  card.style.transition = 'transform 0.3s, opacity 0.3s';
  card.style.transform = `translate(${toX}vw, -10vh) rotate(${ang}deg)`;
  card.style.opacity = 0.5;
  card.classList.add('swiped');
  const id = +card.id.split('-')[1];
  recordSwipe(id, like ? 'right' : 'left');
  removedCards.push(card);
  updateCards();
}

function updateCards() {
  document
    .querySelectorAll('.tinder--card:not(.swiped)')
    .forEach((c, i, a) => {
      c.style.zIndex = 100 + (a.length - i);
      c.style.transform = '';
      c.style.opacity = '1';
    });
}

function attachHammer(el) {
  const hammer = new Hammer(el);
  hammer.on('pan', e => {
    el.classList.add('moving');
    if (!e.deltaX) return;
    const xM = e.deltaX * 0.03, yM = e.deltaY / 80, rot = xM * yM;
    el.style.transform = `translate(${e.deltaX}px, ${e.deltaY}px) rotate(${rot}deg)`;
  });
  hammer.on('panend', e => {
    el.classList.remove('moving');
    const w = document.body.clientWidth;
    const keep = Math.abs(e.deltaX) < 80 && Math.abs(e.velocityX) < 0.5;
    if (keep) {
      el.style.transition = 'transform 0.3s';
      el.style.transform = '';
    } else {
      const endX = Math.max(Math.abs(e.velocityX) * w, w);
      const toX = e.deltaX > 0 ? endX : -endX;
      const endY = Math.abs(e.velocityY) * w;
      const toY = e.deltaY > 0 ? endY : -endY;
      const xM = e.deltaX * 0.03, yM = e.deltaY / 80, rot = xM * yM;
      el.style.transition = 'transform 0.3s, opacity 0.3s';
      el.style.transform = `translate(${toX}px, ${toY + e.deltaY}px) rotate(${rot}deg)`;
      el.style.opacity = '0.5';
      const id = +el.id.split('-')[1];
      recordSwipe(id, e.deltaX > 0 ? 'right' : 'left');
      el.classList.add('swiped');
      removedCards.push(el);
      updateCards();
    }
  });
}

// Button controls
document.querySelector('.btn-no').addEventListener('click', () => removeCard(false));
document.querySelector('.btn-yes').addEventListener('click', () => removeCard(true));
document.querySelector('.btn-back').addEventListener('click', () => {
  if (!removedCards.length) return alert('No swiped card to undo.');
  const card = removedCards.pop();
  card.classList.remove('swiped');
  card.style.transition = 'transform 0.3s, opacity 0.3s';
  card.style.transform = '';
  card.style.opacity = '1';
  const id = +card.id.split('-')[1];
  results = results.filter(r => r.cardId !== id);
  updateCards();
  updateProgress();
});
