// script.js - operators on right column, numbers left (logic unchanged)

// State
let currentExpression = '';
let lastResult = '';
let history = JSON.parse(localStorage.getItem('calc_history') || '[]');
const maxHistoryLength = 5;

// DOM
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const signature = document.getElementById('signature');

// init
document.addEventListener('DOMContentLoaded', () => {
  signature.innerHTML = 'Built by <strong>KHAN HABIB RAFIQUE</strong>';
  document.querySelectorAll('.btn').forEach(b => b.addEventListener('click', onBtn));
  window.addEventListener('keydown', onKey);
  applyThemeFromStorage();
  render();
});

// render
function render() {
  expressionEl.textContent = currentExpression || '';
  resultEl.textContent = lastResult || '0';
  renderHistory();
}
function renderHistory(){
  historyList.innerHTML = '';
  history.forEach(it => {
    const li = document.createElement('li');
    li.textContent = it;
    li.addEventListener('click', () => {
      const parts = it.split('=');
      currentExpression = (parts[0] || '').trim();
      lastResult = (parts[1] || '').trim();
      render();
    });
    historyList.appendChild(li);
  });
}

// button handler
function onBtn(e){
  const action = e.currentTarget.dataset.action;
  handleAction(action);
}

// keyboard
function onKey(e){
  const k = e.key;
  if (k >= '0' && k <= '9') return handleAction(k);
  if (k === '.') return handleAction('decimal');
  if (k === '+') return handleAction('add');
  if (k === '-') return handleAction('subtract');
  if (k === '*') return handleAction('multiply');
  if (k === '/') return handleAction('divide');
  if (k === 'Enter') return handleAction('equals');
  if (k === 'Backspace') return handleAction('backspace');
  if (k.toLowerCase() === 'c') return handleAction('clear');
}

// actions
function handleAction(action) {
  if (!action) return;

  // digits
  if (/^\d$/.test(action)) {
    // append digit
    if (currentExpression === '0') currentExpression = action;
    else currentExpression += action;
    render();
    return;
  }

  if (action === 'clear') {
    currentExpression = '';
    lastResult = '';
    render();
    return;
  }

  if (action === 'backspace') {
    currentExpression = currentExpression.slice(0, -1);
    render();
    return;
  }

  if (action === 'decimal') {
    const chunks = currentExpression.split(/[\+\-×÷\*\/\−\s]/).filter(Boolean);
    const last = chunks.length ? chunks[chunks.length-1] : '';
    if (!last.includes('.')) {
      currentExpression += (last === '' ? '0.' : '.');
    }
    render();
    return;
  }

  if (['add','subtract','multiply','divide'].includes(action)) {
    const glyph = { add: '+', subtract: '−', multiply: '×', divide: '÷' }[action];
    if (currentExpression === '' && lastResult) currentExpression = String(lastResult);
    if (!/[\+\-×÷\*\/\−\s]$/.test(currentExpression) && currentExpression !== '') {
      currentExpression += glyph;
    } else if (currentExpression !== '') {
      currentExpression = currentExpression.replace(/[\+\-×÷\*\/\−\s]+$/, glyph);
    }
    render();
    return;
  }

  if (action === 'equals') {
    if (!currentExpression) return;
    const out = safeEvaluate(currentExpression);
    if (out === 'Error') {
      lastResult = 'Error';
    } else {
      lastResult = out;
      pushHistory(`${currentExpression} = ${out}`);
      currentExpression = out;
    }
    render();
    return;
  }
}

// safe eval
function safeEvaluate(expr) {
  const js = expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').trim();
  if (!/^[0-9+\-*/().\s]+$/.test(js)) return 'Error';
  try {
    const val = Function(`"use strict"; return (${js});`)();
    if (typeof val !== 'number' || !isFinite(val)) return 'Error';
    const rounded = Number(parseFloat(val.toFixed(10)));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  } catch {
    return 'Error';
  }
}

// history
function pushHistory(entry) {
  history.unshift(entry);
  if (history.length > maxHistoryLength) history.pop();
  localStorage.setItem('calc_history', JSON.stringify(history));
}

// theme
function applyThemeFromStorage(){
  const t = localStorage.getItem('calc_theme');
  if (t === 'dark') {
    document.documentElement.setAttribute('data-theme','dark');
    themeToggle.textContent = '☀️';
  } else {
    themeToggle.textContent = '🌙';
  }
}
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('calc_theme','light');
    themeToggle.textContent = '🌙';
  } else {
    document.documentElement.setAttribute('data-theme','dark');
    localStorage.setItem('calc_theme','dark');
    themeToggle.textContent = '☀️';
  }
});
