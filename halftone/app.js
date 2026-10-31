'use strict';
const states = {
  main: {
    dpi: 600,
    lpi: 60,
    tone: 40,
    screen: true,
    device: true
  },
  a: {
    dpi: 300,
    lpi: 60,
    tone: 40,
    screen: true,
    device: true
  },
  b: {
    dpi: 1200,
    lpi: 60,
    tone: 40,
    screen: true,
    device: true
  }
};
const ui = {
  dpi: 'Printer resolution',
  lpi: 'Screen frequency',
  tone: 'Ink coverage',
  dpiHelp: 'More printer dot positions as DPI increases.',
  lpiHelp: 'More, smaller screen cells as LPI increases.',
  toneHelp: 'More ink grows each halftone dot.',
  screen: 'Screen cells',
  device: 'Printer dots',
  edge: 'printer positions / cell edge',
  levels: 'estimated theoretical tone levels',
  fractional: 'Fractional ratio: grid alignment and rounded fill counts can change dot shapes. See “Why can fractional settings look uneven?” below.',
  sparse: 'Fewer than 2 printer positions per cell edge: the screen is poorly resolved.'
};
const cache = {};

function controls(id) {
  const host = document.getElementById('controls-' + id);
  host.innerHTML = ['dpi', 'lpi', 'tone'].map(k => {
      const [min, max, step, unit] = k === 'dpi' ? [120, 2400, 30, 'DPI'] : k === 'lpi' ? [30,
        240, 10, 'LPI'
      ] : [0, 100, 1, '%'];
      return `<div class="control"><label for="${id}-${k}"><span>${ui[k]}</span><output id="out-${id}-${k}"></output></label><input id="${id}-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${states[id][k]}" data-key="${k}" aria-label="${ui[k]}"><div class="range-ends"><span>${min} ${unit}</span><span>${max} ${unit}</span></div><p>${ui[k+'Help']}</p></div>`
    }).join('') +
    `<div class="toggles"><label><input type="checkbox" data-key="screen" ${states[id].screen?'checked':''}>${ui.screen}</label><label><input type="checkbox" data-key="device" ${states[id].device?'checked':''}>${ui.device}</label></div><div class="metrics"><div class="metric"><strong id="ratio-${id}"></strong><span>${ui.edge}</span></div><div class="metric"><strong id="levels-${id}"></strong><span>${ui.levels}</span></div></div><p id="warning-${id}" class="warning" hidden></p>`;
  host.addEventListener('input', e => {
    const k = e.target.dataset.key;
    if (!k) return;
    states[id][k] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
    refresh(id, k !== 'tone')
  });
  refresh(id, false)
}

function geometry(s) {
  const key = s.dpi + '/' + s.lpi;
  if (cache[key]) return cache[key];
  // Complete edge cells before clipping; otherwise cropped dots would grow too large.
  const n = s.dpi / 10,
    r = s.dpi / s.lpi,
    count = Math.ceil(s.lpi / 10),
    groups = new Map();
  for (let y = 0; y < Math.ceil(count * r); y++)
    for (let x = 0; x < Math.ceil(count * r); x++) {
      const cx = Math.floor((x + .5) / r),
        cy = Math.floor((y + .5) / r);
      if (cx >= count || cy >= count) continue;
      const k = cx + ',' + cy;
      const dx = x + .5 - (cx + .5) * r,
        dy = y + .5 - (cy + .5) * r;
      const a = groups.get(k) || [];
      a.push({
        x,
        y,
        d: dx * dx + dy * dy
      });
      groups.set(k, a)
    }
  const cells = [...groups.values()];
  // Distance ranks illustrate clustered-dot screening, not Bouman's specific 8 × 8 matrix (see page reference).
  cells.forEach(c => c.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x));
  const value = {
    n,
    r,
    cells
  };
  if (Object.keys(cache).length > 20) delete cache[Object.keys(cache)[0]];
  cache[key] = value;
  return value
}

function paint(id) {
  const s = states[id],
    c = document.getElementById('canvas-' + id),
    ctx = c.getContext('2d'),
    {
      n,
      r,
      cells
    } = geometry(s),
    w = c.width,
    px = w / n;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, w);
  ctx.fillStyle = '#182039';
  for (const cell of cells) {
    // One rank per position gives implicit thresholds at (rank + 0.5) / cell.length.
    const filled = Math.round(cell.length * s.tone / 100);
    for (let i = 0; i < filled; i++) {
      const p = cell[i];
      ctx.fillRect(p.x * px, p.y * px, px + .04, px + .04)
    }
  }
  if (s.device) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(110,125,157,.38)';
    ctx.lineWidth = .65;
    for (let i = 1; i < n; i++) {
      ctx.moveTo(i * px, 0);
      ctx.lineTo(i * px, w);
      ctx.moveTo(0, i * px);
      ctx.lineTo(w, i * px)
    }
    ctx.stroke()
  }
  if (s.screen) {
    ctx.beginPath();
    ctx.strokeStyle = '#4774fa';
    ctx.lineWidth = 1.8;
    for (let i = 1; i < s.lpi / 10; i++) {
      const p = i * r * px;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, w);
      ctx.moveTo(0, p);
      ctx.lineTo(w, p)
    }
    ctx.stroke()
  }
}
const frames = {};

function refresh(id, animate = true) {
  const s = states[id],
    r = s.dpi / s.lpi;
  ['dpi', 'lpi', 'tone'].forEach(k => {
    document.getElementById('out-' + id + '-' + k).innerHTML =
      `${s[k]}<small>${k==='tone'?'%':k.toUpperCase()}</small>`;
    const input = document.getElementById(id + '-' + k);
    input.value = s[k];
    input.setAttribute('aria-valuetext', s[k] + ' ' + (k === 'tone' ? 'percent' : k
    .toUpperCase()))
  });
  ['screen', 'device'].forEach(k => document.querySelector('#controls-' + id + ' [data-key=' + k +
    ']').checked = s[k]);
  document.getElementById('ratio-' + id).textContent = Number.isInteger(r) ? r : r.toFixed(2);
  document.getElementById('levels-' + id).textContent = (Number.isInteger(r) ? '' : '≈ ') + Math
    .round(r * r + 1);
  const warning = document.getElementById('warning-' + id);
  warning.hidden = Number.isInteger(r) && r >= 2;
  warning.textContent = r < 2 ? ui.sparse : ui.fractional;
  cancelAnimationFrame(frames[id]);
  frames[id] = requestAnimationFrame(() => {
    paint(id);
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) document
      .getElementById('canvas-' + id).animate([{
        opacity: .7
      }, {
        opacity: 1
      }], {
        duration: 130
      })
  })
}

function selectTab(name) {
  document.querySelectorAll('[data-tab]').forEach(b => {
    const yes = b.dataset.tab === name;
    b.setAttribute('aria-selected', yes);
    b.tabIndex = yes ? 0 : -1;
    document.getElementById(b.dataset.tab).hidden = !yes
  });
  if (name === 'compare') {
    paint('a');
    paint('b')
  }
}
document.querySelectorAll('[data-tab]').forEach((b, i) => {
  b.addEventListener('click', () => selectTab(b.dataset.tab));
  b.addEventListener('keydown', e => {
    const tabs = [...document.querySelectorAll('[data-tab]')];
    let n;
    if (e.key === 'ArrowRight') n = (i + 1) % 3;
    if (e.key === 'ArrowLeft') n = (i + 2) % 3;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = 2;
    if (n !== undefined) {
      e.preventDefault();
      tabs[n].focus();
      selectTab(tabs[n].dataset.tab)
    }
  })
});
document.getElementById('experiment').onclick = () => {
  Object.assign(states.main, {
    dpi: 300,
    lpi: 60,
    tone: 40,
    screen: true,
    device: true
  });
  refresh('main')
};
document.getElementById('copy').onclick = () => {
  Object.assign(states.b, states.a);
  refresh('b')
};
Object.keys(states).forEach(controls);
