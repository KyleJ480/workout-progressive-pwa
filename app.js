(() => {
  'use strict';

  const STORAGE_KEY = 'progress-workout-v1';
  const APP_VERSION = 1;
  const PLATES = [45, 25, 10, 5, 2.5];

  const defaultState = () => ({
    version: APP_VERSION,
    settings: { ezBarWeight: 25 },
    selectedWorkout: suggestedWorkout(),
    currentIndices: { Push: 0, Pull: 0, Legs: 0 },
    sessionCounts: { Push: 0, Pull: 0, Legs: 0 },
    activeSessions: {},
    drafts: {},
    history: [],
    undoRecord: null,
    exercises: {
      bench: { id:'bench', workout:'Push', name:'Barbell Bench Press', kind:'bar', barKind:'barbell', barWeight:45, sideWeight:40, min:8, max:10, increment:5, last:[9,9,8] },
      ezOHP: { id:'ezOHP', workout:'Push', name:'EZ Bar Overhead Press', kind:'bar', barKind:'ez', sideWeight:22.5, min:8, max:10, increment:5, last:[9,9,8] },
      inclineDB: { id:'inclineDB', workout:'Push', name:'Incline Dumbbell Bench', kind:'db', weight:40, min:8, max:12, increment:5, last:[10,10,10] },
      shoulderFly: { id:'shoulderFly', workout:'Push', name:'Dumbbell Shoulder Fly', kind:'db', weight:15, min:8, max:12, increment:5, last:[10,10,10] },
      ski: { id:'ski', workout:'Push', name:'Ski Machine — Triceps', kind:'timer', seconds:[50,50,50], setting:10, pace:580, last:[50,50,50] },

      singleArmRow: { id:'singleArmRow', workout:'Pull', name:'Single-Arm Dumbbell Row', kind:'db', weight:45, min:8, max:12, increment:5, last:[10,10,10] },
      pullover: { id:'pullover', workout:'Pull', name:'Dumbbell Lat Pullover', kind:'dbSingle', weight:45, min:8, max:12, increment:5, last:[10,10,9] },
      ezRow: { id:'ezRow', workout:'Pull', name:'Reverse-Grip EZ Bar Row', kind:'bar', barKind:'ez', sideWeight:37.5, min:8, max:10, increment:5, last:[10,10,10] },
      reverseFly: { id:'reverseFly', workout:'Pull', name:'Reverse Fly', kind:'db', weight:15, min:8, max:12, increment:5, last:[9,9,9], alternating:'pullAlt', variant:'fly' },
      ezShrug: { id:'ezShrug', workout:'Pull', name:'EZ Bar Shrug', kind:'bar', barKind:'ez', sideWeight:37.5, min:8, max:10, increment:5, last:[10,10,10], alternating:'pullAlt', variant:'shrug' },
      curls: { id:'curls', workout:'Pull', name:'Dumbbell Bicep Curl', kind:'db', weight:40, min:8, max:12, increment:5, last:[9,9,9] },

      rdl: { id:'rdl', workout:'Legs', name:'Barbell Romanian Deadlift', kind:'bar', barKind:'barbell', barWeight:45, sideWeight:55, min:6, max:8, increment:5, last:[8,8,8] },
      lunges: { id:'lunges', workout:'Legs', name:'Weighted Lunges', kind:'db', weight:40, min:8, max:12, increment:5, last:[10,10,10] },
      calf: { id:'calf', workout:'Legs', name:'Standing Calf Raise', kind:'bar', barKind:'barbell', barWeight:45, sideWeight:55, min:8, max:10, increment:5, last:[10,10,10] },
      planks: { id:'planks', workout:'Legs', name:'Planks', kind:'timer', seconds:[60,60,60], last:[60,60,60] }
    }
  });

  let state = loadState();
  let activeSheet = null;
  let toastTimer = null;

  const $ = id => document.getElementById(id);
  const els = {
    dateLabel: $('dateLabel'), exerciseCounter: $('exerciseCounter'), exerciseName: $('exerciseName'), loadMain: $('loadMain'), loadSub: $('loadSub'),
    progressLabel: $('progressLabel'), progressSegments: $('progressSegments'), newSessionButton: $('newSessionButton'), exerciseLoggedBadge: $('exerciseLoggedBadge'),
    targetLabel: $('targetLabel'), setsGrid: $('setsGrid'), previousLine: $('previousLine'), completeButton: $('completeButton'),
    prevExerciseButton: $('prevExerciseButton'), nextExerciseButton: $('nextExerciseButton'), undoButton: $('undoButton'),
    historyButton: $('historyButton'), settingsButton: $('settingsButton'), editExerciseButton: $('editExerciseButton'),
    modalBackdrop: $('modalBackdrop'), historySheet: $('historySheet'), settingsSheet: $('settingsSheet'), adjustSheet: $('adjustSheet'),
    historyList: $('historyList'), exportCsvButton: $('exportCsvButton'), ezBarWeight: $('ezBarWeight'), exportBackupButton: $('exportBackupButton'),
    importBackupInput: $('importBackupInput'), resetButton: $('resetButton'), adjustTitle: $('adjustTitle'), weightAdjustFields: $('weightAdjustFields'),
    repRangeFields: $('repRangeFields'), minRepsInput: $('minRepsInput'), maxRepsInput: $('maxRepsInput'), adjustHint: $('adjustHint'),
    saveAdjustButton: $('saveAdjustButton'), toast: $('toast'), completionOverlay: $('completionOverlay'), celebrationTitle: $('celebrationTitle'),
    celebrationDetail: $('celebrationDetail'), reviewWorkoutButton: $('reviewWorkoutButton'), nextSessionButton: $('nextSessionButton')
  };

  function suggestedWorkout() {
    const d = new Date().getDay();
    if (d === 1 || d === 4) return 'Push';
    if (d === 2 || d === 5) return 'Pull';
    if (d === 3 || d === 6) return 'Legs';
    return 'Push';
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        settings: { ...base.settings, ...(parsed.settings || {}) },
        currentIndices: { ...base.currentIndices, ...(parsed.currentIndices || {}) },
        sessionCounts: { ...base.sessionCounts, ...(parsed.sessionCounts || {}) },
        activeSessions: parsed.activeSessions || {},
        drafts: parsed.drafts || {},
        history: Array.isArray(parsed.history) ? parsed.history : [],
        undoRecord: parsed.undoRecord?.exerciseId ? parsed.undoRecord : null,
        exercises: { ...base.exercises, ...(parsed.exercises || {}) }
      };
    } catch (e) {
      console.warn('Could not load saved data; using defaults.', e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function plannedWorkoutIds(workout) {
    if (workout === 'Push') return ['bench','ezOHP','inclineDB','shoulderFly','ski'];
    if (workout === 'Legs') return ['rdl','lunges','calf','planks'];
    const alt = state.sessionCounts.Pull % 2 === 0 ? 'reverseFly' : 'ezShrug';
    return ['singleArmRow','pullover','ezRow',alt,'curls'];
  }

  function getWorkoutIds(workout) {
    return state.activeSessions[workout]?.ids || plannedWorkoutIds(workout);
  }

  function ensureSession(workout) {
    if (!state.activeSessions[workout]) {
      state.activeSessions[workout] = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        ids: plannedWorkoutIds(workout),
        completed: {},
        finishedAt: null
      };
    }
    return state.activeSessions[workout];
  }

  function savedRecordFor(ex) {
    const recordId = state.activeSessions[ex.workout]?.completed?.[ex.id];
    return recordId ? state.history.find(record => record.id === recordId) || null : null;
  }

  function nextIncompleteIndex(session, fromIndex) {
    for (let offset = 1; offset <= session.ids.length; offset++) {
      const index = (fromIndex + offset) % session.ids.length;
      if (!session.completed[session.ids[index]]) return index;
    }
    return fromIndex;
  }

  function currentExercise() {
    const ids = getWorkoutIds(state.selectedWorkout);
    const i = clamp(state.currentIndices[state.selectedWorkout] || 0, 0, ids.length - 1);
    return state.exercises[ids[i]];
  }

  function barWeight(ex) {
    return ex.barKind === 'ez' ? Number(state.settings.ezBarWeight || 0) : Number(ex.barWeight || 45);
  }

  function totalWeight(ex, sideWeight = ex.sideWeight) {
    return barWeight(ex) + (2 * Number(sideWeight || 0));
  }

  function plateText(sideWeight) {
    let remaining = Math.round(Number(sideWeight) * 2) / 2;
    const plates = [];
    for (const p of PLATES) {
      while (remaining + 1e-8 >= p) {
        plates.push(p);
        remaining = Math.round((remaining - p) * 2) / 2;
      }
    }
    if (remaining > 0.01) plates.push(remaining);
    return plates.length ? plates.map(formatNumber).join(' + ') : 'no plates';
  }

  function nextPrescription(ex) {
    if (ex.kind === 'timer') {
      return { values: (ex.last || ex.seconds || [60,60,60]).slice(), advanced: false };
    }
    const reps = (ex.last || [ex.min, ex.min, ex.min]).map(Number);
    const maxTotal = ex.max * 3;
    const actualTotal = reps.reduce((a,b) => a + b, 0);
    const hitTop = reps.every(r => r >= ex.max);
    if (hitTop || actualTotal >= maxTotal) {
      if (ex.kind === 'bar') {
        return { reps: [ex.min,ex.min,ex.min], sideWeight: Number(ex.sideWeight) + Number(ex.increment)/2, advanced: true };
      }
      return { reps: [ex.min,ex.min,ex.min], weight: Number(ex.weight) + Number(ex.increment), advanced: true };
    }
    const desiredTotal = Math.min(maxTotal, Math.max(1, actualTotal + 1));
    return { reps: distributeReps(desiredTotal, ex.max), sideWeight: ex.sideWeight, weight: ex.weight, advanced: false };
  }

  function distributeReps(total, cap) {
    const base = Math.floor(total / 3);
    const remainder = total % 3;
    const out = [base, base, base];
    if (remainder >= 1) out[0] += 1;
    if (remainder >= 2) out[1] += 1;
    // If a very unusual logged set pushes a value over cap, redistribute overflow.
    for (let i = 0; i < 3; i++) {
      if (out[i] > cap) {
        let overflow = out[i] - cap;
        out[i] = cap;
        for (let j = 2; j >= 0 && overflow > 0; j--) {
          if (j !== i && out[j] < cap) { out[j]++; overflow--; }
        }
      }
    }
    return out;
  }

  function targetFor(ex) {
    const saved = savedRecordFor(ex);
    const calculated = saved ? (ex.kind === 'timer'
      ? { values: saved.seconds.slice() }
      : { reps: saved.reps.slice(), weight: saved.weight ?? ex.weight, sideWeight: saved.sideWeight ?? ex.sideWeight })
      : nextPrescription(ex);
    const draft = state.drafts[ex.id];
    if (ex.kind === 'timer') {
      const values = draft?.values || calculated.values;
      return { ...calculated, values };
    }
    const reps = draft?.reps || calculated.reps;
    const weight = draft?.weight ?? calculated.weight ?? ex.weight;
    const sideWeight = draft?.sideWeight ?? calculated.sideWeight ?? ex.sideWeight;
    return { ...calculated, reps, weight, sideWeight };
  }

  function render() {
    const session = ensureSession(state.selectedWorkout);
    const ex = currentExercise();
    const ids = getWorkoutIds(state.selectedWorkout);
    const idx = clamp(state.currentIndices[state.selectedWorkout] || 0, 0, ids.length - 1);
    const saved = savedRecordFor(ex);
    const edited = !!saved && !!state.drafts[ex.id];
    const completedCount = ids.filter(id => !!session.completed[id]).length;
    const target = targetFor(ex);
    const now = new Date();
    els.dateLabel.textContent = now.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }).toUpperCase();
    document.querySelectorAll('.segmented button').forEach(btn => btn.classList.toggle('active', btn.dataset.workout === state.selectedWorkout));
    els.progressLabel.textContent = session.finishedAt ? `${state.selectedWorkout} complete · ${completedCount} of ${ids.length}` : `${completedCount} of ${ids.length} complete`;
    els.progressSegments.setAttribute('aria-valuemax', String(ids.length));
    els.progressSegments.setAttribute('aria-valuenow', String(completedCount));
    els.progressSegments.style.gridTemplateColumns = `repeat(${ids.length}, minmax(0, 1fr))`;
    els.progressSegments.innerHTML = ids.map((id, i) => `<span class="progress-segment${session.completed[id] ? ' done' : ''}${i === idx ? ' current' : ''}" aria-hidden="true"></span>`).join('');
    els.newSessionButton.hidden = !session.finishedAt;
    els.newSessionButton.setAttribute('aria-label', `Start next ${state.selectedWorkout} session`);
    els.exerciseCounter.textContent = `${idx + 1} OF ${ids.length}`;
    els.exerciseName.textContent = ex.name;
    els.exerciseLoggedBadge.hidden = !saved;
    els.exerciseLoggedBadge.textContent = edited ? '✓ LOGGED · EDITING' : '✓ LOGGED';
    document.querySelector('.exercise-card').classList.toggle('is-logged', !!saved);
    els.completeButton.classList.toggle('is-saved', !!saved && !edited);
    els.completeButton.textContent = saved
      ? edited ? (session.finishedAt ? 'Update exercise' : 'Update & Next') : (session.finishedAt ? 'Workout complete ✓' : 'Saved ✓ · Next')
      : completedCount === ids.length - 1 ? 'Finish workout' : 'Save & Next';

    if (ex.kind === 'bar') {
      els.loadMain.textContent = `${formatNumber(totalWeight(ex, target.sideWeight))} lb total`;
      els.loadSub.textContent = `${plateText(target.sideWeight)} lb / side`;
    } else if (ex.kind === 'db') {
      els.loadMain.textContent = `${formatNumber(target.weight)} lb each`;
      els.loadSub.textContent = 'two dumbbells';
    } else if (ex.kind === 'dbSingle') {
      els.loadMain.textContent = `${formatNumber(target.weight)} lb dumbbell`;
      els.loadSub.textContent = 'one dumbbell total';
    } else if (ex.id === 'ski') {
      els.loadMain.textContent = `Setting ${ex.setting}`;
      els.loadSub.textContent = `Target ≥ ${ex.pace} cal/hr`;
    } else {
      els.loadMain.textContent = 'Timed sets';
      els.loadSub.textContent = 'adjust seconds as needed';
    }

    const values = ex.kind === 'timer' ? target.values : target.reps;
    const targetValues = saved?.targetValues || values;
    els.targetLabel.textContent = targetValues.map(v => ex.kind === 'timer' ? `${v}s` : v).join(' / ');
    renderSetControls(ex, values);
    els.previousLine.textContent = saved?.previousText || previousText(ex);
    els.undoButton.disabled = !state.undoRecord;
    saveState();
  }

  function renderSetControls(ex, values) {
    els.setsGrid.innerHTML = '';
    values.forEach((value, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'set-control';
      wrap.innerHTML = `
        <div class="set-label">SET ${i+1}</div>
        <div class="set-value"><strong>${value}</strong>${ex.kind === 'timer' ? '<span>SEC</span>' : ''}</div>
        <div class="step-row">
          <button class="step-button" data-step="-1" data-index="${i}" aria-label="Decrease set ${i+1}">−</button>
          <button class="step-button" data-step="1" data-index="${i}" aria-label="Increase set ${i+1}">+</button>
        </div>`;
      els.setsGrid.appendChild(wrap);
    });
    els.setsGrid.querySelectorAll('.step-button').forEach(btn => btn.addEventListener('click', () => adjustSet(Number(btn.dataset.index), Number(btn.dataset.step))));
  }

  function adjustSet(index, delta) {
    const ex = currentExercise();
    const target = targetFor(ex);
    const step = ex.kind === 'timer' ? 5 : 1;
    if (ex.kind === 'timer') {
      const values = target.values.slice();
      values[index] = Math.max(0, values[index] + delta * step);
      state.drafts[ex.id] = { ...(state.drafts[ex.id] || {}), values };
    } else {
      const reps = target.reps.slice();
      reps[index] = Math.max(0, reps[index] + delta);
      state.drafts[ex.id] = { ...(state.drafts[ex.id] || {}), reps, weight: target.weight, sideWeight: target.sideWeight };
    }
    saveState();
    render();
  }

  function previousText(ex) {
    const last = (ex.last || []).join(' / ');
    if (ex.kind === 'bar') return `Previous: ${formatNumber(totalWeight(ex, ex.sideWeight))} lb · ${last}`;
    if (ex.kind === 'db') return `Previous: ${formatNumber(ex.weight)} lb each · ${last}`;
    if (ex.kind === 'dbSingle') return `Previous: ${formatNumber(ex.weight)} lb · ${last}`;
    if (ex.id === 'ski') return `Previous: ${last}s · setting ${ex.setting}`;
    return `Previous: ${last}s`;
  }

  function completeExercise() {
    const session = ensureSession(state.selectedWorkout);
    const ex = currentExercise();
    const saved = savedRecordFor(ex);
    const ids = session.ids;
    const idx = state.currentIndices[state.selectedWorkout] || 0;
    if (saved && !state.drafts[ex.id]) {
      if (session.finishedAt) showCelebration();
      else {
        state.currentIndices[state.selectedWorkout] = nextIncompleteIndex(session, idx);
        render();
        showToast('Already logged');
      }
      return;
    }
    const target = targetFor(ex);
    const prescribed = nextPrescription(ex);
    const before = JSON.parse(JSON.stringify({
      workout: state.selectedWorkout,
      exerciseId: ex.id,
      ex,
      historyLength: state.history.length,
      historyIndex: saved ? state.history.findIndex(record => record.id === saved.id) : -1,
      previousRecord: saved,
      currentIndices: state.currentIndices,
      sessionCounts: state.sessionCounts,
      session,
      draft: state.drafts[ex.id] || null
    }));
    const record = {
      id: saved?.id || `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      timestamp: saved?.timestamp || new Date().toISOString(),
      sessionId: session.id,
      workout: state.selectedWorkout,
      exerciseId: ex.id,
      exerciseName: ex.name,
      kind: ex.kind,
      targetValues: saved?.targetValues || (ex.kind === 'timer' ? prescribed.values : prescribed.reps).slice(),
      previousText: saved?.previousText || previousText(ex),
      reps: ex.kind === 'timer' ? null : target.reps.slice(),
      seconds: ex.kind === 'timer' ? target.values.slice() : null,
      weight: ex.kind.startsWith('db') ? Number(target.weight) : null,
      sideWeight: ex.kind === 'bar' ? Number(target.sideWeight) : null,
      totalWeight: ex.kind === 'bar' ? totalWeight(ex, target.sideWeight) : null,
      barWeight: ex.kind === 'bar' ? barWeight(ex) : null,
      setting: ex.setting || null,
      pace: ex.pace || null
    };
    if (saved) state.history[before.historyIndex] = record;
    else {
      state.history.push(record);
      session.completed[ex.id] = record.id;
    }
    if (ex.kind === 'timer') {
      ex.last = target.values.slice();
      ex.seconds = target.values.slice();
    } else {
      ex.last = target.reps.slice();
      if (ex.kind === 'bar') ex.sideWeight = Number(target.sideWeight);
      else ex.weight = Number(target.weight);
    }
    delete state.drafts[ex.id];
    state.undoRecord = before;

    const justFinished = ids.every(id => !!session.completed[id]) && !session.finishedAt;
    if (justFinished) {
      session.finishedAt = new Date().toISOString();
      state.sessionCounts[state.selectedWorkout] = (state.sessionCounts[state.selectedWorkout] || 0) + 1;
    }
    if (!session.finishedAt) state.currentIndices[state.selectedWorkout] = nextIncompleteIndex(session, idx);
    saveState();
    render();
    if (justFinished) showCelebration();
    else showToast(saved ? 'Exercise updated' : 'Exercise logged');
  }

  function undoLast() {
    const u = state.undoRecord;
    if (!u) return;
    closeCelebration();
    state.exercises[u.exerciseId] = u.ex;
    if (u.historyIndex >= 0) state.history[u.historyIndex] = u.previousRecord;
    else state.history = state.history.slice(0, u.historyLength);
    state.currentIndices = u.currentIndices;
    state.sessionCounts = u.sessionCounts;
    state.activeSessions[u.workout] = u.session;
    if (u.draft) state.drafts[u.exerciseId] = u.draft;
    else delete state.drafts[u.exerciseId];
    state.undoRecord = null;
    saveState();
    render();
    showToast('Last save undone');
  }

  function showCelebration() {
    const session = ensureSession(state.selectedWorkout);
    els.celebrationTitle.textContent = `${state.selectedWorkout} complete!`;
    els.celebrationDetail.textContent = `${session.ids.length} exercises logged. You can still review and edit them.`;
    els.nextSessionButton.textContent = `Start next ${state.selectedWorkout} session`;
    els.completionOverlay.hidden = false;
    els.reviewWorkoutButton.focus();
  }

  function closeCelebration() {
    els.completionOverlay.hidden = true;
  }

  function startNextSession() {
    const workout = state.selectedWorkout;
    const session = ensureSession(workout);
    if (!session.finishedAt) return;
    const editedId = session.ids.find(id => !!state.drafts[id]);
    if (editedId) {
      state.currentIndices[workout] = session.ids.indexOf(editedId);
      closeCelebration();
      render();
      showToast('Update your edited exercise first');
      return;
    }
    state.activeSessions[workout] = null;
    state.currentIndices[workout] = 0;
    state.undoRecord = null;
    closeCelebration();
    render();
    showToast('Next session ready');
  }

  function moveExercise(delta) {
    const ids = getWorkoutIds(state.selectedWorkout);
    const current = state.currentIndices[state.selectedWorkout] || 0;
    state.currentIndices[state.selectedWorkout] = (current + delta + ids.length) % ids.length;
    saveState(); render();
  }

  function openSheet(sheet) {
    closeSheet();
    activeSheet = sheet;
    els.modalBackdrop.hidden = false;
    sheet.hidden = false;
    if (sheet === els.historySheet) renderHistory();
    if (sheet === els.settingsSheet) els.ezBarWeight.value = state.settings.ezBarWeight;
  }

  function closeSheet() {
    if (activeSheet) activeSheet.hidden = true;
    activeSheet = null;
    els.modalBackdrop.hidden = true;
  }

  function renderHistory() {
    const rows = state.history.slice().reverse();
    if (!rows.length) {
      els.historyList.innerHTML = '<div class="empty-state">No completed exercises yet.<br>Your first saved set will appear here.</div>';
      return;
    }
    els.historyList.innerHTML = rows.map(r => {
      const dt = new Date(r.timestamp);
      const date = dt.toLocaleDateString(undefined,{month:'short',day:'numeric'});
      const sets = r.kind === 'timer' ? r.seconds.map(x => `${x}s`).join(' / ') : r.reps.join(' / ');
      let load = '';
      if (r.kind === 'bar') load = `${formatNumber(r.totalWeight)} lb`;
      else if (r.kind === 'db') load = `${formatNumber(r.weight)} ea`;
      else if (r.kind === 'dbSingle') load = `${formatNumber(r.weight)} lb`;
      else if (r.setting) load = `S${r.setting}`;
      return `<div class="history-item"><div><strong>${escapeHtml(r.exerciseName)}</strong><div class="history-sub">${date} · ${escapeHtml(r.workout)}</div></div><div class="history-value">${escapeHtml(load)}<div class="history-sub">${escapeHtml(sets)}</div></div></div>`;
    }).join('');
  }

  function openAdjust() {
    const ex = currentExercise();
    const target = targetFor(ex);
    els.adjustTitle.textContent = ex.name;
    els.weightAdjustFields.innerHTML = '';
    if (ex.kind === 'bar') {
      els.weightAdjustFields.innerHTML = `<div class="adjust-row"><label class="field-label" for="adjustWeightInput">Total weight for this workout</label><div class="field-with-unit"><input id="adjustWeightInput" type="number" min="0" step="5" inputmode="decimal" value="${formatNumber(totalWeight(ex,target.sideWeight))}"><span>lb</span></div></div>`;
      els.adjustHint.textContent = `The app converts total weight into plates automatically. Current bar weight: ${formatNumber(barWeight(ex))} lb.`;
    } else if (ex.kind === 'db' || ex.kind === 'dbSingle') {
      els.weightAdjustFields.innerHTML = `<div class="adjust-row"><label class="field-label" for="adjustWeightInput">Dumbbell weight</label><div class="field-with-unit"><input id="adjustWeightInput" type="number" min="0" step="5" inputmode="decimal" value="${formatNumber(target.weight)}"><span>lb</span></div></div>`;
      els.adjustHint.textContent = ex.kind === 'db' ? 'Enter the weight of one dumbbell.' : 'Enter the weight of the single dumbbell.';
    } else {
      els.adjustHint.textContent = 'Timed exercises are adjusted directly with the set controls.';
    }
    const repBased = ex.kind !== 'timer';
    els.repRangeFields.style.display = repBased ? 'grid' : 'none';
    if (repBased) { els.minRepsInput.value = ex.min; els.maxRepsInput.value = ex.max; }
    openSheet(els.adjustSheet);
  }

  function saveAdjust() {
    const ex = currentExercise();
    const target = targetFor(ex);
    if (ex.kind !== 'timer') {
      const min = Math.max(1, Number(els.minRepsInput.value || ex.min));
      const max = Math.max(min, Number(els.maxRepsInput.value || ex.max));
      ex.min = min; ex.max = max;
      const input = document.getElementById('adjustWeightInput');
      if (input) {
        const w = Math.max(0, Number(input.value || 0));
        if (ex.kind === 'bar') {
          const sideWeight = Math.max(0, (w - barWeight(ex)) / 2);
          state.drafts[ex.id] = { ...(state.drafts[ex.id] || {}), reps: target.reps, sideWeight };
        } else {
          state.drafts[ex.id] = { ...(state.drafts[ex.id] || {}), reps: target.reps, weight: w };
        }
      }
    }
    saveState(); closeSheet(); render(); showToast('Exercise updated');
  }

  function saveEzBarWeight() {
    const val = Number(els.ezBarWeight.value);
    if (Number.isFinite(val) && val >= 0) {
      state.settings.ezBarWeight = val;
      saveState(); render();
    }
  }

  function exportBackup() {
    downloadFile(`progress-backup-${isoDate()}.json`, JSON.stringify(state, null, 2), 'application/json');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !parsed.exercises || !parsed.settings) throw new Error('Invalid backup');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        state = loadState();
        closeSheet(); render(); showToast('Backup restored');
      } catch (e) { alert('That file does not look like a valid Progress backup.'); }
    };
    reader.readAsText(file);
  }

  function exportCsv() {
    const headers = ['Date','Workout','Exercise','Type','Total Weight','Dumbbell Weight','Plate Weight Per Side','Set 1','Set 2','Set 3','Setting','Pace'];
    const rows = state.history.map(r => {
      const vals = r.kind === 'timer' ? r.seconds : r.reps;
      return [new Date(r.timestamp).toLocaleString(), r.workout, r.exerciseName, r.kind, r.totalWeight ?? '', r.weight ?? '', r.sideWeight ?? '', vals?.[0] ?? '', vals?.[1] ?? '', vals?.[2] ?? '', r.setting ?? '', r.pace ?? ''];
    });
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
    downloadFile(`progress-history-${isoDate()}.csv`, csv, 'text/csv');
  }

  function resetAll() {
    if (!confirm('Reset all workout history and settings? This cannot be undone unless you exported a backup.')) return;
    state = defaultState();
    saveState(); closeSheet(); render(); showToast('App reset');
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatNumber(n) { return Number(n) % 1 === 0 ? String(Number(n)) : Number(n).toFixed(1).replace(/\.0$/, ''); }
  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function csvEscape(v){ const s=String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
  function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function isoDate(){ return new Date().toISOString().slice(0,10); }

  function showToast(message) {
    els.toast.textContent = message; els.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1400);
  }

  document.querySelectorAll('.segmented button').forEach(btn => btn.addEventListener('click', () => {
    state.selectedWorkout = btn.dataset.workout; saveState(); render();
  }));
  els.prevExerciseButton.addEventListener('click', () => moveExercise(-1));
  els.nextExerciseButton.addEventListener('click', () => moveExercise(1));
  els.completeButton.addEventListener('click', completeExercise);
  els.newSessionButton.addEventListener('click', startNextSession);
  els.nextSessionButton.addEventListener('click', startNextSession);
  els.reviewWorkoutButton.addEventListener('click', closeCelebration);
  els.undoButton.addEventListener('click', undoLast);
  els.historyButton.addEventListener('click', () => openSheet(els.historySheet));
  els.settingsButton.addEventListener('click', () => openSheet(els.settingsSheet));
  els.editExerciseButton.addEventListener('click', openAdjust);
  els.modalBackdrop.addEventListener('click', closeSheet);
  document.querySelectorAll('.close-sheet').forEach(btn => btn.addEventListener('click', closeSheet));
  els.ezBarWeight.addEventListener('change', saveEzBarWeight);
  els.exportBackupButton.addEventListener('click', exportBackup);
  els.importBackupInput.addEventListener('change', e => { if (e.target.files?.[0]) importBackup(e.target.files[0]); e.target.value=''; });
  els.exportCsvButton.addEventListener('click', exportCsv);
  els.resetButton.addEventListener('click', resetAll);
  els.saveAdjustButton.addEventListener('click', saveAdjust);
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && !els.completionOverlay.hidden) closeCelebration(); });
  window.addEventListener('beforeunload', saveState);

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  render();
})();
