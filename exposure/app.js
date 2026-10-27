// Drawing helpers (SVG.js).
/* SVG.js 3.2.5 draws and updates the experiment's SVG elements. */
const ExposureDrawing = (() => {
  const svg = selector => SVG(selector);
  const animations = new Map();

  function animate(selector, duration, draw) {
    animations.get(selector)?.unschedule();
    draw(0);
    const runner = svg(selector).animate(duration).ease('<>').during(draw);
    animations.set(selector, runner);
    runner.after(() => animations.delete(selector));
  }

  function stopAnimations() {
    animations.forEach(runner => { runner.finish(); runner.unschedule(); });
    animations.clear();
  }

  function drawFrame(selector, { bounds, inset, depth, project = ([x, y]) => [x, y] }) {
    const frame = svg(selector).clear();
    const [left, top, right, bottom] = bounds;
    const outer = [[left, top], [right, top], [right, bottom], [left, bottom]].map(project);
    const inner = [[left + inset, top + inset], [right - inset, top + inset], [right - inset, bottom - inset], [left + inset, bottom - inset]].map(project);
    const raised = points => points.map(([x, y]) => [x + depth[0], y + depth[1]]);
    const upperOuter = raised(outer);
    const upperInner = raised(inner);
    const outline = points => `M${points.map(point => point.join(' ')).join('L')}Z`;
    const wall = (points, color) => frame.polygon(points).fill(color).stroke({ color: '#7f99ad', width: 1.2 });
    // Draw the far inner walls first and the near outer walls last.
    for (const edge of [0, 3]) {
      const next = (edge + 1) % 4;
      wall([upperInner[edge], upperInner[next], inner[next], inner[edge]], edge === 0 ? '#9eb5c8' : '#b4c8d7');
    }
    frame.path(`${outline(upperOuter)} ${outline(upperInner)}`)
      .fill('url(#metal)').attr('fill-rule', 'evenodd').stroke({ color: '#7893a8', width: 1.5 });
    for (const edge of [1, 2]) {
      const next = (edge + 1) % 4;
      wall([upperOuter[edge], upperOuter[next], outer[next], outer[edge]], edge === 1 ? '#8ea9be' : '#bdcedb');
    }
  }

  function drawWashTool() {
    const tool = svg('#wash-tool').clear();
    const hose = 'M787 209C837 238 815 294 844 331S831 409 806 433S827 491 779 518';
    tool.path(hose).fill('none').stroke({ color: '#334d61', width: 12, linecap: 'round' });
    tool.path(hose).fill('none').stroke({ color: '#688093', width: 4, linecap: 'round' });
    const water = tool.group().id('wash-streams').opacity(.7);
    water.path('M699 234L515 248L602 319Z').fill('#b5def4').attr('fill-opacity', .3);
    for (const [x, y] of [[515, 248], [537, 266], [559, 283], [580, 301], [602, 319]]) {
      water.line(699, 234, x, y).stroke({ color: '#8ec8e9', width: 2.5, dasharray: '5 9' });
    }
    water.ellipse(60, 26).center(560, 283).rotate(28, 560, 283).fill('#d5edf9').attr('fill-opacity', .5);
    tool.line(790, 163, 724, 213).stroke({ color: '#3f586d', width: 14, linecap: 'round' });
    tool.line(726, 212, 704, 230).stroke({ color: '#a5bdcc', width: 8 });
    tool.line(707, 227, 699, 234).stroke({ color: '#36576c', width: 8, linecap: 'round' });
    tool.path('M776 177L798 187L788 213L774 207L777 190L766 187Z').fill('#506d83').stroke({ color: '#344f64', width: 2 });
    tool.path('M776 185Q791 187 781 201').fill('none').stroke({ color: '#c2d4df', width: 3 });
    tool.line(785, 210, 792, 217).stroke({ color: '#bfab8a', width: 10 });
  }

  function drawContact(inkUp, topLit = false) {
    const contact = svg('#contact-svg').clear();
    const inkY = inkUp ? 68 : 91;
    const geometry = contact.group().attr('transform', topLit ? 'translate(0 148) scale(1 -1)' : '');
    geometry.rect(142, 14).move(12, 40).radius(2).fill('#b6c6d3');
    geometry.line(12, 57, 154, 57).stroke({ color: '#71899d', dasharray: '2 2' });
    geometry.rect(142, 10).move(12, 58).fill('#88afcd');
    geometry.rect(142, 20).move(12, 72).fill('#e1f0fa').stroke('#9cbbd0');
    geometry.rect(40, 4).move(69, inkY).fill('#243c54');
    geometry.rect(142, 12).move(12, 96).fill('#ecf6fc').stroke('#cadfe9');
    geometry.path(`M30 148V115M30 115L26 122M30 115L34 122M125 148L${inkUp ? '110 115' : '109 73'}`)
      .fill('none').stroke({ color: '#af8aca', width: 2 });
    geometry.path(`M154 62H169M109 ${inkY + 2}L169 84M154 102L169 106`).fill('none').stroke('#a7bdce');
    const labels = contact.group().font({ family: 'system-ui,sans-serif', size: 10 }).fill('#69889f');
    for (const [text, x, y] of [['Emulsion', 176, 65], ['Film ink', 176, 87], ['Glass', 176, 109], [inkUp ? 'Ink sits against the emulsion.' : 'Plastic separates ink from emulsion.', 13, 170], [topLit ? 'UV light ↓' : 'UV light ↑', 176, 145]]) {
      labels.plain(text).attr({ x, y: topLit && y !== 170 ? 153 - y : y });
    }
  }

  function drawTopMachine() {
    const unit = svg('#top-unit-scene');
    unit.path('M128 438L628 543L788 399V438L628 582L128 477Z').fill('#a4b6c5').stroke('#7893a8');
    unit.path('M288 294L788 399L628 543L128 438Z').fill('#425e73').stroke('#7893a8');
    unit.path('M760 449C825 454 829 522 771 552').fill('none').stroke({ color: '#334d61', width: 10 });
    unit.plain('Vacuum bed').attr({ x: 620, y: 578, 'font-size': 14, fill: '#607e96' });
    const screen = unit.group().id('top-screen-layer');
    screen.group().id('top-frame');
    drawFrame('#top-frame', { bounds: [0, 0, 500, 320], inset: 20, depth: [0, 44], project: ([x,y]) => [288+x-.5*y, 294+.21*x+.45*y] });
    const plane = screen.group().attr('transform', 'matrix(1 .21 -.5 .45 288 294)');
    plane.path('M0 0H500V320H0Z M20 20V300H480V20Z').fill('url(#metal)').attr('fill-rule','evenodd').stroke('#7893a8');
    plane.rect(460,280).move(20,20).fill('#88afcd').id('top-emulsion');
    plane.rect(460,280).move(20,20).fill('url(#mesh)');
    screen.line(809,399,809,443).stroke('#86a6bd');
    screen.path('M803 435L809 443L815 435').fill('none').stroke('#86a6bd');
    screen.plain('Frame').attr({x:822,y:428,'font-size':15,fill:'#607e96'});
    const film = unit.group().id('top-film-layer');
    const sheet = film.group().attr('transform','matrix(1 .21 -.5 .45 288 294)');
    sheet.rect(458,282).move(21,19).radius(4).fill('#f2f9ff').attr('fill-opacity',.85).stroke('#93bad5');
    sheet.group().id('top-film-art').attr('color','#233542').use(svg('#artwork')).size(500,320);
    sheet.plain('FILM POSITIVE').attr({x:36,y:287,'font-size':12,fill:'#6b8da7'});
    const lamp = unit.group();
    lamp.rect(270,38).move(315,20).radius(12).fill('#526e84');
    lamp.rect(234,10).move(333,58).radius(4).fill('#b6a6dd').id('top-lamp');
    lamp.plain('UV ↓').attr({x:450,y:94,'text-anchor':'middle','font-size':16,fill:'#8e77ad'});
    const rays = unit.group().id('top-rays').attr({stroke:'#a986da','stroke-width':3,'stroke-dasharray':'6 10'});
    for(const x of [290,395,500,605,710]) rays.path(`M450 108L${x} 315M${x-5} 303L${x} 315L${x+6} 304`).fill('none');
    const labels = unit.group().id('top-layer-labels').attr({fill:'#627e96','font-size':15});
    labels.plain('Film positive').attr({x:36,y:185});
    labels.path('M45 196H150L240 211').fill('none').stroke('#a7bed0');
    labels.plain('Mesh ready for exposure').attr({x:36,y:315});
    labels.path('M45 326H140L215 345').fill('none').stroke('#a7bed0');
  }

  function setup() {
    drawFrame('#exposure-rim', { bounds: [0, 0, 500, 320], inset: 20, depth: [0, -44], project: ([x, y]) => [288 + x - .5 * y, 294 + .21 * x + .45 * y] });
    drawFrame('#wash-front-frame', { bounds: [-16, -16, 516, 336], inset: 16, depth: [-29, -19] });
    drawFrame('#wash-rear-frame', { bounds: [-16, -16, 516, 336], inset: 16, depth: [29, 19] });
    drawWashTool();
    drawTopMachine();
    // Filter primitives are part of SVG itself; no filter plugin is needed.
    const loss = svg('#process').defs().element('filter').id('detail-loss');
    loss.element('feMorphology').attr({ operator: 'erode', radius: 1.3 });
    loss.element('feGaussianBlur').attr({ stdDeviation: .35 });
  }

  return { svg, setup, drawContact, animate, stopAnimations };
})();


// Simulation state, playback and controls.
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const durations = [2800, 4800, 7800, 4500];
  const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, duration) => sum + duration, 0));
  const total = durations.reduce((sum, value) => sum + value, 0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { machine: 'below', mirrored: false, inkUp: true, edgeLoss: false, separated: true, view: 'unit', side: 'squeegee', washInspection: null, time: 0, playing: false, speed: 1, recorded: false };
  let previousTime = 0;
  let frame = 0;
  let lastPhase = -1;
  let trials = [];
  const storageKey = 'printlab-exposure-trials-v1';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) trials = saved.filter(item => typeof item.mirrored === 'boolean' && typeof item.inkUp === 'boolean').slice(-4);
  } catch { /* Trials also work when browser storage is unavailable. */ }

  const mirroredResult = (settings = state) => settings.mirrored !== !settings.inkUp;
  const showDetailLoss = (settings = state) => !settings.inkUp && settings.edgeLoss === true;
  const mirrorTransform = mirrored => mirrored ? 'translate(500 0) scale(-1 1)' : 'translate(0 0)';
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const v = clamp(value); return v * v * (3 - 2 * v); };
  const { svg, setup, drawContact, animate, stopAnimations } = ExposureDrawing;
  const set = (selector, attribute, value) => svg(selector).attr(attribute, value);
  const showGroup = (selector, visible) => { set(selector, 'opacity', visible ? 1 : 0); set(selector, 'visibility', visible ? 'visible' : 'hidden'); };

  setup();

  function phaseAt(time = state.time) {
    if (time >= total) return { index: 3, progress: 1 };
    const index = starts.findLastIndex(start => time >= start);
    return { index, progress: clamp((time - starts[index]) / durations[index]) };
  }

  function renderContact() {
    drawContact(state.inkUp, state.machine === 'above');
    $('#machine-type').disabled = state.playing;
    $('#show-edge-loss').disabled = state.inkUp || state.playing;
    $('#show-edge-loss').checked = state.edgeLoss;
  }

  function renderModel(animateFlip = false) {
    const result = mirroredResult();
    const transform = mirrorTransform(result);
    ['#film-image', '#paper-image', '#stencil-hole'].forEach(selector => set(selector, 'transform', transform));
    set('#wash-hole', 'transform', mirrorTransform(!result));
    set('#ink-face-art', 'transform', mirrorTransform(state.mirrored));
    set('#plastic-face-art', 'transform', mirrorTransform(!state.mirrored));
    $('#ink-surface').classList.toggle('is-top', state.inkUp);
    $('#plastic-surface').classList.toggle('is-top', !state.inkUp);
    all('[data-contact]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.contact === 'ink') === state.inkUp)));
    $('#ink-surface-direction').textContent = state.inkUp ? (state.machine === 'above' ? '↓ Touching mesh' : '↑ Touching mesh') : (state.machine === 'above' ? '↑ Toward light' : '↓ Toward glass');
    $('#plastic-surface-direction').textContent = state.inkUp ? (state.machine === 'above' ? '↑ Toward light' : '↓ Toward glass') : (state.machine === 'above' ? '↓ Touching mesh' : '↑ Touching mesh');
    $('#film-top-label').textContent = state.inkUp ? 'INK FACE ↑' : 'CLEAR BACK ↑';
    set('#film-face-tab', 'fill', state.inkUp ? '#f5e6c8' : '#d2eafa');
    set('#film-top-label', 'fill', state.inkUp ? '#806944' : '#4b799c');
    set('#film-ink-edge', 'd', `M205 ${state.inkUp ? 301 : 314}H305`);
    ['#paper-image', '#stencil-hole', '#wash-hole'].forEach(selector => {
      if (showDetailLoss()) set(selector, 'filter', 'url(#detail-loss)');
      else svg(selector).attr('filter', null);
    });
    all('[data-art]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.art === 'mirrored') === state.mirrored)));
    renderContact();
    render();
    if (animateFlip && !reducedMotion) {
      animate('#film-image', 550, progress => {
        const scale = .02 + .98 * progress;
        const direction = result ? -1 : 1;
        svg('#film-image').attr({ transform: `translate(${250 - direction * 250 * scale} 0) scale(${direction * scale} 1)`, opacity: .35 + .65 * progress });
      });
    }
  }

  function story(index, progress) {
    const result = mirroredResult();
    if (index === 0) return ['Ready for exposure.', state.machine === 'above' ? 'The frame faces down onto the vacuum bed. Film sits on the flat mesh face above it; the light comes from above.' : 'The frame faces upward. The flat mesh face rests against the film; the light comes from below.'];
    if (index === 1) return ['Light hardens the areas it can reach.', 'UV hardens the exposed emulsion. The film protects the image areas, which become open mesh during washout.'];
    if (index === 2) {
      if (state.washInspection || progress >= .58) return ['Check the washed screen from both sides.', 'The screen turns so you can inspect the open mesh. Use the side buttons to hold either view.'];
      if (progress < .2) return ['Wet both sides of the screen.', 'First the squeegee side is wetted. The screen then turns to the flat substrate side.'];
      return ['Develop from the flat substrate side.', 'Water removes the unexposed emulsion, opening the image areas. The label shows which face is toward you.'];
    }
    if (progress < .78) return ['A squeegee stroke makes the test print.', 'The screen is now in printing position: squeegee side up, substrate side down. Ink passes through the open mesh onto paper.'];
    return [result ? 'The print reverses the reading sequence.' : 'The print follows the reading sequence.', state.inkUp ? 'Image direction and film contact are separate checks. Here the film’s ink face was in direct contact with the emulsion.' : 'Check the contact too: this trial placed the plastic back against the emulsion. Readable artwork alone does not prove good contact.'];
  }

  function renderFace(index, progress) {
    const reversed = mirroredResult() !== (state.side === 'substrate');
    set('#face-hole', 'transform', mirrorTransform(reversed));
    set('#face-film', 'transform', mirrorTransform(reversed));
    set('#face-hole', 'opacity', index < 2 ? 0 : index === 2 ? washPose(progress).developed : 1);
    set('#face-film', 'opacity', index === 0 ? .95 : 0);
    set('#face-emulsion', 'opacity', index < 2 ? .3 : 1);
    if (showDetailLoss()) set('#face-hole', 'filter', 'url(#detail-loss)');
    else svg('#face-hole').attr('filter', null);
    $('#face-caption').textContent = state.side === 'squeegee' ? 'Looking from the squeegee side, toward the printing surface.' : 'Looking directly at the substrate side. The same image appears reversed.';
  }

  function washPose(progress) {
    if (state.washInspection) return { side: state.washInspection, scale: 1, spraying: false, developed: 1 };
    let side = progress < .12 ? 'squeegee' : progress < .58 ? 'substrate' : progress < .78 ? 'squeegee' : 'substrate';
    let scale = 1;
    for (const [start, end, from, to] of [[.12, .2, 'squeegee', 'substrate'], [.58, .66, 'substrate', 'squeegee'], [.78, .86, 'squeegee', 'substrate']]) {
      if (progress >= start && progress < end) {
        const turn = (progress - start) / (end - start);
        side = turn < .5 ? from : to;
        scale = reducedMotion ? 1 : Math.max(.025, Math.abs(Math.cos(turn * Math.PI)));
      }
    }
    return { side, scale, spraying: progress < .12 || (progress >= .2 && progress < .58), developed: smooth((progress - .2) / .35) };
  }

  function render() {
    const { index, progress } = phaseAt();
    const ended = state.time >= total;
    const grouped = index === 1 ? smooth(progress / .16) : 0;
    const exposing = index === 1;
    const exposureProgress = progress;
    const screenY = state.separated ? -161 + 153 * grouped : -8;
    const filmY = state.separated ? -83 + 80 * grouped : -3;
    set('#screen-layer', 'transform', `translate(0 ${screenY})`);
    set('#film-layer', 'transform', `translate(0 ${filmY})`);
    const topLit = state.machine === 'above';
    showGroup('#unit-scene', index < 2 && !topLit);
    showGroup('#top-unit-scene', index < 2 && topLit);
    const spread = state.separated ? 1 - grouped : 0;
    set('#top-screen-layer', 'transform', `translate(0 ${-52 - spread * 25})`);
    set('#top-film-layer', 'transform', `translate(0 ${-57 - spread * 130})`);
    set('#top-film-art', 'transform', mirrorTransform(!mirroredResult()));
    set('#top-layer-labels', 'opacity', index === 0 && state.separated ? 1 : 0);
    set('#top-rays', 'opacity', exposing ? .7 : 0);
    $('#top-rays').classList.toggle('active', state.playing && exposing && !reducedMotion);
    set('#top-lamp', 'fill', exposing ? '#d1b6f3' : '#b6a6dd');
    set('#top-emulsion', 'fill', exposing ? '#6f97bb' : '#88afcd');
    showGroup('#wash-scene', index === 2);
    showGroup('#print-scene', index === 3);
    set('#layer-labels', 'opacity', state.separated && index === 0 ? 1 : 0);
    set('#uv-rays', 'opacity', 0);
    $('#uv-rays').classList.toggle('active', state.playing && exposing && !reducedMotion);
    set('#bulb-glow', 'opacity', exposing ? .75 : 0);
    set('#bulbs', 'stroke', exposing ? '#b394dd' : '#b6a6dd');
    set('#power-light', 'fill', exposing ? '#c4a5ef' : '#a1b2c1');
    set('#unit-emulsion', 'fill', exposing ? '#c9dfef' : '#88afcd');
    set('#unit-emulsion', 'opacity', exposing ? 1 : .48);
    set('#hardened-emulsion', 'opacity', exposing ? .95 * smooth(exposureProgress) : 0);
    $('#exposure-key').hidden = index !== 1 || state.view !== 'unit';
    $('#exposure-progress').style.width = `${Math.round(progress * 100)}%`;
    $('.exposure-meter').setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    $('#scene').classList.toggle('exposing', exposing);
    const wash = washPose(progress);
    set('#wash-hole', 'opacity', wash.developed);
    set('#wash-hole', 'transform', mirrorTransform(mirroredResult() !== (wash.side === 'substrate')));
    const washA = .92 * wash.scale;
    const washB = .11 * wash.scale;
    set('#wash-screen', 'transform', `matrix(${washA} ${washB} 0 1 ${440 - washA * 250} ${310 - washB * 250 - 160})`);
    set('#wash-front-frame', 'opacity', wash.side === 'squeegee' ? 1 : 0);
    set('#wash-rear-frame', 'opacity', wash.side === 'substrate' ? 1 : 0);
    $('#wash-streams').classList.toggle('active', state.playing && index === 2 && wash.spraying && !reducedMotion);
    set('#wash-streams', 'opacity', index === 2 && wash.spraying ? .7 : 0);
    showGroup('#wash-tool', index === 2 && wash.spraying);
    set('#wash-tool', 'transform', `translate(0 ${wash.spraying && !reducedMotion ? Math.sin(progress * 20) * 9 : 0})`);
    const inspecting = state.washInspection || progress >= .58;
    const sideName = wash.side === 'substrate' ? 'flat substrate side' : 'squeegee side';
    $('#wash-side-label').textContent = `${inspecting ? 'Inspect' : progress < .2 ? 'Wetting' : 'Washout'} · ${sideName}`;
    $('#wash-profile-label').textContent = wash.side === 'squeegee' ? 'Frame toward you · mesh recessed inside it' : 'Flat mesh face toward you · frame behind the screen';
    $('#wash-action-label').textContent = inspecting ? 'The same open mesh, viewed from the other face.' : progress < .2 ? 'Wet both sides before developing the stencil.' : 'Unexposed emulsion washes away. Open mesh stays.';
    $('#wash-inspection').hidden = index !== 2 || !inspecting || state.view !== 'unit';
    set('#wash-side-label', 'visibility', inspecting ? 'hidden' : 'visible');
    all('[data-wash-side]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.washSide === wash.side)));
    const stroke = smooth(progress / .67);
    const lift = smooth((progress - .7) / .3);
    set('#squeegee', 'transform', `translate(0 ${20 + stroke * 285})`);
    set('#print-reveal', 'height', stroke * 320);
    set('#printing-screen', 'transform', `translate(0 ${-190 * lift})`);
    set('#printing-screen', 'opacity', 1 - lift);
    $('#print-stage-label').textContent = lift > .6 ? 'Lift the screen. Check the print.' : 'The squeegee pushes ink through the openings.';
    $('#process').hidden = state.view !== 'unit';
    $('#process').style.display = state.view === 'unit' ? 'block' : 'none';
    $('#face-view').hidden = state.view !== 'face';
    $('#layers').disabled = index > 0 || state.view !== 'unit';
    $('#layers').setAttribute('aria-pressed', String(state.separated));
    $('#layers').innerHTML = `${state.separated ? 'Bring layers together' : 'Separate layers'} <span aria-hidden="true">↕</span>`;
    renderFace(index, progress);
    const locations = ['EXPOSURE UNIT', 'UV EXPOSURE', 'WASHOUT BOOTH', 'PRINTING TABLE'];
    const titles = ['A small decision, a different print.', 'Follow the light through the layers.', 'The image becomes open mesh.', 'Now, see what lands on paper.'];
    const [title, text] = story(index, progress);
    $('#location').textContent = locations[index];
    $('#scene-title').textContent = titles[index];
    $('#story-number').textContent = String(index + 1).padStart(2, '0');
    $('#story-title').textContent = title;
    $('#story-text').textContent = text;
    $('#status').textContent = ended ? 'Trial complete' : state.playing ? 'In progress' : state.time > 0 ? 'Paused' : 'Ready to try';
    $('#status').classList.toggle('running', state.playing);
    $('#run-label').textContent = state.playing ? 'Pause' : ended ? 'Run again' : state.time > 0 ? 'Resume' : 'Run trial';
    $('#play-icon').textContent = state.playing ? 'Ⅱ' : '▶';
    $('#timeline').value = String(Math.round(state.time / total * 1000));
    $('#progress-label').textContent = ended ? 'Complete' : state.time > 0 ? `${Math.round(state.time / total * 100)}%` : 'Ready';
    all('[data-step]').forEach(button => button.classList.toggle('active', Number(button.dataset.step) === index));
    all('[data-art],[data-contact]').forEach(button => { button.disabled = state.playing; });
    $('#machine-type').disabled = state.playing;
    $('#show-edge-loss').disabled = state.inkUp || state.playing;
    $('#outcome').hidden = !ended;
    if (ended) renderOutcome();
    if (lastPhase !== index) {
      lastPhase = index;
      $('#process-title').textContent = titles[index];
      $('#process-desc').textContent = text;
    }
  }

  function renderOutcome() {
    const mirrored = mirroredResult();
    $('#direction-result').textContent = mirrored ? 'Reversed · mirrored' : 'Followed · right-reading';
    $('#contact-result').textContent = state.inkUp ? 'Ink to emulsion' : 'Plastic to emulsion';
    $('#outcome-title').textContent = !mirrored && state.inkUp ? 'The intended print. Good contact.' : !mirrored ? 'Readable, but check the contact.' : state.inkUp ? 'Good contact. Mirrored artwork.' : 'The film flip reversed the print.';
    $('#outcome-description').textContent = !mirrored && state.inkUp ? 'The ink face touched the emulsion, and the artwork reads correctly from the squeegee side.' : !mirrored ? 'Mirrored artwork and a flipped film cancel the reversal. The plastic still separates ink from emulsion; fine details can suffer.' : state.inkUp ? 'Contact is correct, but the artwork on the film’s ink face was already mirrored. Contact and image direction need separate checks.' : 'Turning the film over mirrored the image and put its clear plastic back against the emulsion. Fine detail may also be lost.';
    $('#compare-next').innerHTML = state.inkUp ? 'Try the flipped film <span aria-hidden="true">→</span>' : 'Try ink-to-emulsion contact <span aria-hidden="true">→</span>';
  }

  function renderTrials() {
    $('#clear-trials').hidden = !trials.length;
    if (!trials.length) {
      $('#trial-list').innerHTML = '<div class="empty-trials"><span aria-hidden="true">↗</span><p>Run your first trial. Its print will appear here.<small>Then change the film and see what happens.</small></p></div>';
      return;
    }
    $('#trial-list').innerHTML = trials.map((trial, index) => `<article class="trial-card"><div class="trial-title">Trial ${index + 1}<span>${trial.mirrored ? 'Mirrored art' : 'Right-reading art'}</span></div><svg viewBox="0 0 500 320" role="img" aria-label="${mirroredResult(trial) ? 'Mirrored' : 'Right-reading'} test print"></svg><div class="trial-meta"><b>${mirroredResult(trial) ? 'Mirrored print' : 'Right-reading print'}</b><br>${trial.machine === 'above' ? 'Light from above' : 'Light from below'}<br>${trial.inkUp ? 'Ink → emulsion' : 'Plastic → emulsion'}${showDetailLoss(trial) ? '<br>Detail loss illustration on' : ''}</div><button type="button" data-load="${index}">Load this setup ↗</button></article>`).join('');
    all('.trial-card svg').forEach((element, index) => {
      const trial = trials[index];
      const print = SVG(element).group().attr({ color: '#347db7', transform: mirrorTransform(mirroredResult(trial)) });
      print.use(svg('#artwork')).size(500, 320);
      if (showDetailLoss(trial)) print.attr('filter', 'url(#detail-loss)');
    });
    all('[data-load]').forEach(button => button.addEventListener('click', () => {
      if (state.playing) return;
      const trial = trials[Number(button.dataset.load)];
      state.machine = trial.machine === 'above' ? 'above' : 'below';
      $('#machine-type').value = state.machine;
      configure(trial.mirrored, trial.inkUp);
      state.edgeLoss = trial.edgeLoss === true;
      renderModel();
      $('.workspace').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    }));
  }

  function saveTrial() {
    if (state.recorded) return;
    state.recorded = true;
    trials.push({ machine: state.machine, mirrored: state.mirrored, inkUp: state.inkUp, edgeLoss: state.edgeLoss });
    trials = trials.slice(-4);
    try { localStorage.setItem(storageKey, JSON.stringify(trials)); } catch { /* Keep trials in memory. */ }
    renderTrials();
  }

  function pause() { stopAnimations(); state.playing = false; cancelAnimationFrame(frame); render(); }
  function reset() { pause(); state.time = 0; state.washInspection = null; state.recorded = false; lastPhase = -1; render(); }
  function configure(mirrored, inkUp) { reset(); state.mirrored = mirrored; state.inkUp = inkUp; state.edgeLoss = false; renderModel(true); }
  function tick(now) {
    if (!state.playing) return;
    const dt = Math.max(0, now - previousTime);
    previousTime = now;
    state.time = Math.min(total, state.time + dt * state.speed);
    if (state.time >= total) { state.playing = false; saveTrial(); }
    render();
    if (state.playing) frame = requestAnimationFrame(tick);
  }
  $('#run').addEventListener('click', () => {
    if (state.playing) { pause(); return; }
    if (state.time >= total) reset();
    state.washInspection = null;
    state.view = 'unit';
    all('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === 'unit')));
    stopAnimations();
    state.playing = true;
    previousTime = performance.now();
    render();
    frame = requestAnimationFrame(tick);
  });
  $('#machine-type').addEventListener('change', event => { state.machine = event.target.value; reset(); renderModel(); });
  $('#restart').addEventListener('click', reset);
  $('#speed').addEventListener('change', event => { state.speed = Number(event.target.value); });
  $('#timeline').addEventListener('input', event => { const value = Number(event.target.value); pause(); state.washInspection = null; state.time = value / 1000 * total; render(); });
  all('[data-step]').forEach(button => button.addEventListener('click', () => { pause(); state.washInspection = null; state.time = starts[Number(button.dataset.step)]; render(); }));
  all('[data-art]').forEach(button => button.addEventListener('click', () => configure(button.dataset.art === 'mirrored', state.inkUp)));
  all('[data-contact]').forEach(button => button.addEventListener('click', () => configure(state.mirrored, button.dataset.contact === 'ink')));
  $('#show-edge-loss').addEventListener('change', event => { const checked = event.target.checked; reset(); state.edgeLoss = checked; renderModel(); });
  all('[data-wash-side]').forEach(button => button.addEventListener('click', () => {
    pause();
    state.washInspection = button.dataset.washSide;
    state.time = starts[2] + durations[2] * .92;
    render();
  }));
  $('#compare-next').addEventListener('click', () => { configure(state.mirrored, !state.inkUp); $('.workspace').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); });
  all('[data-view]').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    all('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  all('[data-side]').forEach(button => button.addEventListener('click', () => {
    state.side = button.dataset.side;
    all('[data-side]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  $('#layers').addEventListener('click', () => {
    const wasSeparated = state.separated;
    state.separated = !state.separated;
    render();
    if (!reducedMotion) {
      (state.machine === 'above' ? [['#top-screen-layer', -77, -52], ['#top-film-layer', -187, -57]] : [['#screen-layer', -161, -8], ['#film-layer', -83, -3]]).forEach(([selector, apart, together]) => {
        const startY = wasSeparated ? apart : together;
        const endY = wasSeparated ? together : apart;
        animate(selector, 650, progress => svg(selector).attr('transform', `translate(0 ${startY + (endY - startY) * progress})`));
      });
    }
  });
  $('#clear-trials').addEventListener('click', () => { trials = []; try { localStorage.removeItem(storageKey); } catch {} renderTrials(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) pause(); });
  renderModel();
  renderTrials();
})();
