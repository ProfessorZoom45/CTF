const STORAGE_KEY = 'ctf:learn-zf1:v1';
const LESSONS = [
  {
    title: 'Begin a turn', badge: 'Draw & Spawn', cards: [25, 19],
    intro: 'Dr Zoom and Newz The Watcher show the first safe plays in a CTF battle.',
    points: [
      'Draw one card during Draw Phase.',
      'A Rank 1–4 Catalyst can be Normal Spawned without a Tribute.',
      'Use Action Phase to place a Catalyst, then follow Battle, Resolution, and End.'
    ],
    note: 'Dr Zoom is Rank 1; Newz The Watcher is Rank 3. Read their printed values before choosing a position.',
    question: 'Which ZF1 Catalyst can be Normal Spawned without a Tribute?',
    choices: ['Dr Zoom', 'Ace The Goat', 'Destin The Great Warlord'], answer: 0,
    explanation: 'Dr Zoom is Rank 1. Rank 1–4 Catalysts do not need a Tribute for a Normal Spawn.'
  },
  {
    title: 'Read battle values', badge: 'Pressure & Counter Pressure', cards: [19, 10],
    intro: 'The printed numbers tell you whether a Catalyst is stronger on attack or defense.',
    points: [
      'Pressure is the value used to attack.',
      'Counter Pressure protects a Catalyst in defending position.',
      'Newz The Watcher has 1,100 Pressure and 1,800 Counter Pressure; Reaper — Master Swordsman has 2,000 Pressure and 1,100 Counter Pressure.'
    ],
    note: 'Compare the attacker’s Pressure with the defender’s active battle value before declaring an attack.',
    question: 'If Newz The Watcher is defending, which printed value protects it?',
    choices: ['1,100 Pressure', '1,800 Counter Pressure', '2,000 Pressure'], answer: 1,
    explanation: 'A defending Newz The Watcher uses its printed 1,800 Counter Pressure.'
  },
  {
    title: 'Plan a Tribute', badge: 'High-Rank Catalysts', cards: [22, 20],
    intro: 'Ace The Goat and Newz The Great Watcher are stronger ZF1 Catalysts that need a field plan.',
    points: [
      'Both example cards are Rank 6.',
      'A Rank 6 Normal Spawn requires one Tribute from your field.',
      'Keep a low-Rank Catalyst available before you commit to a high-Rank play.'
    ],
    note: 'Ace The Goat is a Rank 6 Normal Catalyst with 2,500 Pressure and 2,000 Counter Pressure.',
    question: 'What does a Rank 6 Normal Spawn require?',
    choices: ['No Tribute', 'One Tribute', 'Two Tributes'], answer: 1,
    explanation: 'A Rank 6 Normal Spawn needs one Tribute.'
  },
  {
    title: 'Follow Fusion materials', badge: 'Fusion', cards: [21, 20, 23, 26],
    intro: 'Read Destin The Great Warlord’s exact material requirement, then use Fusion Zone’s printed effect.',
    points: [
      'Destin The Great Warlord belongs in the Fusion Deck.',
      'Its materials are Newz The Great Watcher plus a distinct Level 5 or higher Warrior-Type Catalyst.',
      'Ace The Great is a ZF1 example of the second material. Fusion Zone describes how to use one field card and one hand card.'
    ],
    note: 'Check the printed materials and the Fusion Zone effect before attempting a Fusion Spawn.',
    question: 'Which pair meets Destin The Great Warlord’s printed materials?',
    choices: ['Newz The Great Watcher + Ace The Great', 'Dr Zoom + Newz The Watcher', 'Reaper — Master Swordsman + Dr Zoom'], answer: 0,
    explanation: 'Newz The Great Watcher is named exactly, and Ace The Great is a distinct Level 5 Warrior.'
  },
  {
    title: 'Time your Tricks', badge: 'Palm & Concealed Tricks', cards: [11, 12, 6],
    intro: 'Tricks change a turn when their timing, cost, and condition are met.',
    points: [
      'Rapier is an Equip Palm Trick that grants 800 Pressure to its equipped Catalyst.',
      'The Great One is a Concealed Trick with a 1,500 Chi cost and an empty-Catalyst condition.',
      'Zero Degrees blocks both players from playing or Setting Palm and Concealed Tricks for two completed player turns.'
    ],
    note: 'Read each ZF1 Trick’s printed text before playing it; the name alone does not tell you its timing.',
    question: 'Which ZF1 Trick grants 800 Pressure to an equipped Catalyst?',
    choices: ['Rapier', 'The Great One', 'Zero Degrees'], answer: 0,
    explanation: 'Rapier is the Equip Palm Trick that grants 800 Pressure.'
  },
  {
    title: 'Connect the full turn', badge: 'Review & Battle', cards: [1, 2, 18],
    intro: 'Link a Catalyst effect to a Trick, then take the rules into a guided ZF1 battle.',
    points: [
      'When ReEsE The Great is Spawned, its printed effect can add Road To Greatness from the deck to your hand.',
      'A Phoenix’s Soul offers a Fire Catalyst return or a temporary Pressure increase at a Chi cost.',
      'Win by reducing opposing Chi to zero, reaching seven Kills, or reaching seven Extractions.'
    ],
    note: 'These are ZF1 examples of a Catalyst, a Field Trick, and a Palm Trick working inside the turn loop.',
    question: 'Which list gives all three CTF win paths?',
    choices: ['Chi at zero; seven Kills; seven Extractions', 'Five Captures; any Fusion; empty hand', 'Three Tricks; 10,000 Pressure; one Tribute'], answer: 0,
    explanation: 'The three win paths are Chi at zero, seven Kills, and seven Extractions.'
  }
];

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const sourceCards = window.CTF_ZF1_TUTORIAL_CARDS || [];
let step = 0;
let completed = LESSONS.map(() => false);
let selected = LESSONS.map(() => -1);

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.version !== 1 || !Array.isArray(saved.completed) || saved.completed.length !== LESSONS.length) return;
    completed = saved.completed.map(Boolean);
    selected = completed.map((done, index) => done ? LESSONS[index].answer : -1);
    const requested = Math.max(0, Math.min(LESSONS.length - 1, Number(saved.step) || 0));
    step = completed.slice(0, requested).every(Boolean) ? requested : completed.findIndex(done => !done);
    if (step < 0) step = LESSONS.length - 1;
  } catch { /* A new lesson path starts at Lesson 1. */ }
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1, step, completed})); }
  catch { /* Lessons still work when browser storage is unavailable. */ }
}

function renderCards(numbers) {
  $('zf1-reference-cards').innerHTML = numbers.map(number => {
    const card = sourceCards.find(item => item.sourceCardNo === number);
    if (!card) return `<p class="form-error">ZF1 card ${number} is unavailable.</p>`;
    const isCatalyst = card.cardType === 'Catalyst' || card.cardType === 'Fusion';
    const stats = isCatalyst ? `<div class="zf1-card-stats">Rank ${card.level} · ${card.pr.toLocaleString()} Pressure · ${card.cp.toLocaleString()} Counter Pressure</div>` : '';
    const type = card.sub === 'Equip' ? `Equip ${card.cardType}` : card.cardType;
    return `<article class="zf1-card"><div class="zf1-card-top"><span>ZF1 · ${String(number).padStart(2,'0')}</span><span>${esc(type)}</span></div><h4>${esc(card.name)}</h4>${stats}<p>${esc(card.desc)}</p></article>`;
  }).join('');
}

function renderRail() {
  $('step-rail').innerHTML = LESSONS.map((lesson, index) => {
    const locked = index > 0 && !completed.slice(0, index).every(Boolean);
    const done = completed[index];
    return `<li><button class="step-button${index === step ? ' active' : ''}${done ? ' done' : ''}" type="button" data-step="${index}" aria-current="${index === step ? 'step' : 'false'}" ${locked ? 'disabled' : ''}><span>${index + 1}</span>${esc(lesson.title)}</button></li>`;
  }).join('');
  $('progress-status').textContent = `${completed.filter(Boolean).length} of ${LESSONS.length} lesson checks complete`;
}

function render() {
  const lesson = LESSONS[step];
  $('step-count').textContent = `Lesson ${step + 1} of ${LESSONS.length}`;
  $('step-title').textContent = lesson.title;
  $('step-intro').textContent = lesson.intro;
  $('class-badge').textContent = lesson.badge;
  $('lesson-points').innerHTML = lesson.points.map(point => `<li>${esc(point)}</li>`).join('');
  $('zf1-reference-note').textContent = lesson.note;
  renderCards(lesson.cards);
  $('checkpoint-question').textContent = lesson.question;
  $('checkpoint-choices').innerHTML = lesson.choices.map((choice, index) => `<button type="button" class="choice${selected[step] === index ? ' selected' : ''}${selected[step] === index && completed[step] ? ' correct' : ''}" data-choice="${index}" aria-pressed="${selected[step] === index}">${esc(choice)}</button>`).join('');
  $('checkpoint-feedback').textContent = selected[step] < 0 ? 'Choose an answer to continue.' : completed[step] ? `Correct. ${lesson.explanation}` : 'Try again. Revisit the card text and lesson points.';
  $('checkpoint-feedback').classList.toggle('correct', completed[step]);
  $('back-step').disabled = step === 0;
  $('next-step').disabled = !completed[step];
  $('next-step').textContent = step === LESSONS.length - 1 ? 'Start guided battle →' : 'Next lesson →';
  $('complete-panel').hidden = !completed.every(Boolean);
  renderRail();
}

function choose(index) {
  selected[step] = index;
  completed[step] = index === LESSONS[step].answer;
  saveProgress();
  render();
}

function wire() {
  $('checkpoint-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-choice]');
    if (button) choose(Number(button.dataset.choice));
  });
  $('step-rail').addEventListener('click', event => {
    const button = event.target.closest('[data-step]');
    if (!button || button.disabled) return;
    step = Number(button.dataset.step);
    saveProgress(); render();
    $('lesson-main').scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('back-step').addEventListener('click', () => {
    if (step === 0) return;
    step -= 1; saveProgress(); render();
    $('lesson-main').scrollIntoView({behavior:'smooth', block:'start'});
  });
  $('next-step').addEventListener('click', () => {
    if (!completed[step]) return;
    if (step === LESSONS.length - 1) { location.href = 'play.html?onboarding=1'; return; }
    step += 1; saveProgress(); render();
    $('lesson-main').scrollIntoView({behavior:'smooth', block:'start'});
  });
}

if (sourceCards.length !== 26 || sourceCards.some(card => card.set !== 'ZF1')) {
  $('lesson-main').innerHTML = '<p class="form-error">ZF1 lesson cards could not be loaded. Reload this page to try again.</p>';
} else {
  loadProgress(); wire(); render();
}
