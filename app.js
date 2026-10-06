(() => {
  'use strict';

  const STORAGE_KEY = 'progress-workout-v1';
  const APP_VERSION = 1;
  const DEFAULT_BACKFILL_UPDATES_TARGET = true;
  const PLATES = [45, 25, 10, 5, 2.5];
  const EXERCISE_IMAGES = {
    bench: 'barbell-bench-press.png',
    ezOHP: 'ez-bar-overhead-press.png',
    inclineDB: 'incline-dumbbell-bench-press.png',
    shoulderFly: 'dumbbell-shoulder-fly.png',
    ski: 'ski-machine-triceps.png',
    singleArmRow: 'single-arm-dumbbell-row.png',
    pullover: 'dumbbell-lat-pullover.png',
    ezRow: 'reverse-grip-ez-bar-row.png',
    reverseFly: 'reverse-fly.png',
    ezShrug: 'ez-bar-barbell-shrug.png',
    curls: 'dumbbell-bicep-curl.png',
    rdl: 'romanian-deadlift.png',
    lunges: 'weighted-lunge.png',
    calf: 'standing-calf-raise.png',
    planks: 'plank.png'
  };

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
  let insightsExerciseId = null;
  let insightsMetric = 'load';
  let consistencyRange = '30';
  let editingPastRecordId = null;
  let lastPastDate = '';

  const $ = id => document.getElementById(id);
  const els = {
    dateLabel: $('dateLabel'), exerciseCounter: $('exerciseCounter'), exerciseName: $('exerciseName'), exerciseImage: $('exerciseImage'), exerciseImageButton: $('exerciseImageButton'), loadMain: $('loadMain'), loadSub: $('loadSub'),
    exerciseImageOverlay: $('exerciseImageOverlay'), exerciseImageTitle: $('exerciseImageTitle'), exerciseImageLarge: $('exerciseImageLarge'), closeExerciseImageButton: $('closeExerciseImageButton'),
    progressLabel: $('progressLabel'), progressSegments: $('progressSegments'), newSessionButton: $('newSessionButton'), exerciseLoggedBadge: $('exerciseLoggedBadge'),
    targetLabel: $('targetLabel'), setsGrid: $('setsGrid'), previousLine: $('previousLine'), completeButton: $('completeButton'),
    prevExerciseButton: $('prevExerciseButton'), nextExerciseButton: $('nextExerciseButton'), undoButton: $('undoButton'),
    insightsButton: $('insightsButton'), insightsPage: $('insightsPage'), closeInsightsButton: $('closeInsightsButton'),
    exerciseInsightsView: $('exerciseInsightsView'), consistencyView: $('consistencyView'), consistencyPercent: $('consistencyPercent'), consistencySummary: $('consistencySummary'), consistencyTrack: $('consistencyTrack'), consistencyFill: $('consistencyFill'), consistencyGoal: $('consistencyGoal'), consistencyVisualTitle: $('consistencyVisualTitle'), consistencyVisualCount: $('consistencyVisualCount'), consistencyChart: $('consistencyChart'),
    insightsExerciseSelect: $('insightsExerciseSelect'), insightsMetricLabel: $('insightsMetricLabel'), insightsLatestValue: $('insightsLatestValue'), insightsChange: $('insightsChange'), insightsMetrics: $('insightsMetrics'), insightsChart: $('insightsChart'), insightsFirstDate: $('insightsFirstDate'), insightsLastDate: $('insightsLastDate'), insightsChartNote: $('insightsChartNote'), insightsCount: $('insightsCount'), insightsBest: $('insightsBest'), insightsResultList: $('insightsResultList'), addPastResultButton: $('addPastResultButton'),
    pastEntryForm: $('pastEntryForm'), pastEntryTitle: $('pastEntryTitle'), closePastEntryButton: $('closePastEntryButton'), pastEntryDate: $('pastEntryDate'), pastEntryExercise: $('pastEntryExercise'), pastEntryLoadRow: $('pastEntryLoadRow'), pastEntryLoadLabel: $('pastEntryLoadLabel'), pastEntryLoad: $('pastEntryLoad'), pastEntrySets: $('pastEntrySets'), pastEntrySet1: $('pastEntrySet1'), pastEntrySet2: $('pastEntrySet2'), pastEntrySet3: $('pastEntrySet3'), pastEntrySkiFields: $('pastEntrySkiFields'), pastEntrySetting: $('pastEntrySetting'), pastEntryPace: $('pastEntryPace'), pastEntryUseForTarget: $('pastEntryUseForTarget'), pastEntryHint: $('pastEntryHint'), savePastEntryButton: $('savePastEntryButton'), cancelPastEntryButton: $('cancelPastEntryButton'), deletePastEntryButton: $('deletePastEntryButton'),
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
    els.exerciseImage.src = `./icons/exercises/${EXERCISE_IMAGES[ex.id]}`;
    els.exerciseImageButton.setAttribute('aria-label', `View ${ex.name} illustration`);
    fitExerciseTitle();
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

  function fitExerciseTitle() {
    const title = els.exerciseName;
    title.style.fontSize = '';
    let size = parseFloat(getComputedStyle(title).fontSize);
    while (title.scrollWidth > title.clientWidth && size > 15) {
      size = Math.max(15, size - 1);
      title.style.fontSize = `${size}px`;
    }
  }

  function openExerciseImage() {
    const ex = currentExercise();
    els.exerciseImageTitle.textContent = ex.name;
    els.exerciseImageLarge.src = `./icons/exercises/${EXERCISE_IMAGES[ex.id]}`;
    els.exerciseImageLarge.alt = `${ex.name} illustration`;
    els.exerciseImageOverlay.hidden = false;
    els.closeExerciseImageButton.focus();
  }

  function closeExerciseImage() {
    els.exerciseImageOverlay.hidden = true;
    els.exerciseImageButton.focus();
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
      workoutDate: saved?.workoutDate || (saved?.timestamp ? localDateString(new Date(saved.timestamp)) : localDateString(new Date())),
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
    ex.progressionRecordId = record.id;
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
    const rows = state.history.slice().sort((a, b) => compareRecordDates(b, a));
    if (!rows.length) {
      els.historyList.innerHTML = '<div class="empty-state">No completed exercises yet.<br>Your first saved set will appear here.</div>';
      return;
    }
    els.historyList.innerHTML = rows.map(r => {
      const date = shortDate(r);
      const sets = r.kind === 'timer' ? r.seconds.map(x => `${x}s`).join(' / ') : r.reps.join(' / ');
      let load = '';
      if (r.kind === 'bar') load = `${formatNumber(r.totalWeight)} lb`;
      else if (r.kind === 'db') load = `${formatNumber(r.weight)} ea`;
      else if (r.kind === 'dbSingle') load = `${formatNumber(r.weight)} lb`;
      else if (r.setting) load = `S${r.setting}`;
      return `<div class="history-item"><div><strong>${escapeHtml(r.exerciseName)}</strong><div class="history-sub">${date} · ${escapeHtml(r.workout)}</div></div><div class="history-value">${escapeHtml(load)}<div class="history-sub">${escapeHtml(sets)}</div></div></div>`;
    }).join('');
  }

  function exerciseSelectOptions() {
    return ['Push', 'Pull', 'Legs'].map(workout => {
      const options = Object.values(state.exercises)
        .filter(ex => ex.workout === workout && EXERCISE_IMAGES[ex.id])
        .map(ex => `<option value="${escapeHtml(ex.id)}">${escapeHtml(ex.name)}</option>`).join('');
      return `<optgroup label="${workout}">${options}</optgroup>`;
    }).join('');
  }

  function openInsights() {
    closeSheet();
    insightsExerciseId = currentExercise().id;
    insightsMetric = 'load';
    const options = exerciseSelectOptions();
    els.insightsExerciseSelect.innerHTML = options;
    els.pastEntryExercise.innerHTML = options;
    els.insightsExerciseSelect.value = insightsExerciseId;
    els.insightsPage.hidden = false;
    consistencyRange = '30';
    setInsightsView('exercise');
    renderInsights();
    els.closeInsightsButton.focus();
  }

  function closeInsights() {
    closePastEntry();
    els.insightsPage.hidden = true;
    els.insightsButton.focus();
  }

  function setInsightsView(view) {
    const consistency = view === 'consistency';
    if (consistency) closePastEntry();
    els.exerciseInsightsView.hidden = consistency;
    els.consistencyView.hidden = !consistency;
    document.querySelectorAll('[data-insights-view]').forEach(button => {
      const active = button.dataset.insightsView === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    els.insightsPage.scrollTop = 0;
    if (consistency) renderConsistency();
  }

  function exerciseRecords(exerciseId) {
    return state.history.filter(r => r.exerciseId === exerciseId && (r.workoutDate || Number.isFinite(Date.parse(r.timestamp))))
      .sort(compareRecordDates);
  }

  function compareRecordDates(a, b) {
    const aDay = a.workoutDate || localDateString(new Date(a.timestamp));
    const bDay = b.workoutDate || localDateString(new Date(b.timestamp));
    return aDay.localeCompare(bDay) || Date.parse(a.timestamp) - Date.parse(b.timestamp);
  }

  function chartValue(record, metric) {
    if (metric === 'time') return Array.isArray(record.seconds) ? record.seconds.reduce((sum, value) => sum + Number(value || 0), 0) : NaN;
    if (metric === 'reps') return Array.isArray(record.reps) ? record.reps.reduce((sum, value) => sum + Number(value || 0), 0) : NaN;
    if (record.kind === 'bar') return record.totalWeight == null ? NaN : Number(record.totalWeight);
    return record.weight == null ? NaN : Number(record.weight);
  }

  function metricUnit(ex, metric) {
    if (metric === 'time') return 'sec';
    if (metric === 'reps') return 'reps';
    return ex.kind === 'bar' ? 'lb total' : ex.kind === 'db' ? 'lb each' : 'lb';
  }

  function shortDate(record) {
    const [year, month, day] = record.workoutDate?.split('-').map(Number) || [];
    const date = record.workoutDate ? new Date(year, month - 1, day) : new Date(record.timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  }

  function renderInsights() {
    const ex = state.exercises[insightsExerciseId];
    if (!ex) return;
    const timed = ex.kind === 'timer';
    if (timed) insightsMetric = 'time';
    else if (insightsMetric === 'time') insightsMetric = 'load';
    els.insightsExerciseSelect.value = ex.id;
    els.insightsMetrics.hidden = timed;
    els.insightsMetrics.querySelectorAll('button').forEach(button => {
      const active = button.dataset.metric === insightsMetric;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const unit = metricUnit(ex, insightsMetric);
    els.insightsMetricLabel.textContent = timed ? 'TOTAL TIME' : insightsMetric === 'reps' ? 'TOTAL REPS' : ex.kind === 'bar' ? 'TOTAL WEIGHT' : 'DUMBBELL WEIGHT';
    const records = exerciseRecords(ex.id);
    const points = records.map(record => ({ record, value: chartValue(record, insightsMetric) }))
      .filter(point => Number.isFinite(point.value) && point.value >= 0);
    els.insightsChart.classList.toggle('is-empty', !points.length);
    els.insightsCount.textContent = String(records.length);
    els.insightsChartNote.textContent = `Each point is a logged workout. Skipped days are not plotted.`;
    if (!points.length) {
      els.insightsLatestValue.textContent = '—';
      els.insightsChange.textContent = 'No results yet';
      els.insightsChange.classList.remove('down');
      els.insightsBest.textContent = '—';
      els.insightsChart.innerHTML = '<div class="chart-empty"><p>No results for this exercise yet.</p><button type="button" data-add-past>Add a past result</button></div>';
      els.insightsFirstDate.textContent = '';
      els.insightsLastDate.textContent = '';
    } else {
      const first = points[0], last = points[points.length - 1];
      const best = Math.max(...points.map(point => point.value));
      const delta = last.value - first.value;
      els.insightsLatestValue.textContent = `${formatNumber(last.value)} ${unit}`;
      els.insightsBest.textContent = `${formatNumber(best)} ${unit}`;
      els.insightsChange.textContent = points.length === 1 ? 'First result' : delta === 0 ? 'No change yet' : `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))} ${unit}`;
      els.insightsChange.classList.toggle('down', delta < 0);
      els.insightsFirstDate.textContent = shortDate(first.record);
      els.insightsLastDate.textContent = points.length > 1 ? shortDate(last.record) : '';
      els.insightsChart.innerHTML = chartSvg(points, unit);
    }
    els.insightsResultList.innerHTML = records.length ? records.slice().reverse().map(record => {
      const sets = record.kind === 'timer' ? (record.seconds || []).map(value => `${value}s`).join(' / ') : (record.reps || []).join(' / ');
      const load = record.kind === 'bar' ? `${formatNumber(record.totalWeight)} lb total` : record.kind === 'db' ? `${formatNumber(record.weight)} lb each` : record.kind === 'dbSingle' ? `${formatNumber(record.weight)} lb` : record.setting != null ? `Setting ${record.setting}` : '';
      const detail = [load, sets].filter(Boolean).join(' · ');
      return `<div class="insights-result"><div><strong>${escapeHtml(shortDate(record))}</strong><span>${escapeHtml(detail)}</span></div>${record.backfilled ? `<button type="button" data-edit-past="${escapeHtml(record.id)}">Edit</button>` : ''}</div>`;
    }).join('') : '<div class="empty-state">No results for this exercise yet.</div>';
    els.insightsResultList.querySelectorAll('[data-edit-past]').forEach(button => button.addEventListener('click', () => openPastEntry(button.dataset.editPast)));
  }

  function chartSvg(points, unit) {
    const values = points.map(point => point.value);
    const low = Math.min(...values), high = Math.max(...values);
    const padding = high === low ? Math.max(1, high * .05) : Math.max(1, (high - low) * .18);
    const min = Math.max(0, low - padding), max = high + padding;
    const x = index => points.length === 1 ? 176 : 40 + (index * 272 / (points.length - 1));
    const y = value => 148 - ((value - min) / (max - min)) * 120;
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
    const fill = points.length > 1 ? `<path class="chart-fill" d="${path} L${x(points.length - 1).toFixed(1)},148 L${x(0).toFixed(1)},148 Z"/>` : '';
    const grids = [0, .5, 1].map(fraction => {
      const yy = 148 - fraction * 120;
      const value = min + fraction * (max - min);
      return `<line class="chart-grid" x1="40" x2="312" y1="${yy}" y2="${yy}"/><text class="chart-axis-value" x="0" y="${yy + 3}">${formatNumber(Math.round(value))}</text>`;
    }).join('');
    const dots = points.map((point, index) => `<circle class="chart-point${index === points.length - 1 ? ' chart-point-last' : ''}" cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="${index === points.length - 1 ? 5 : 3.5}"><title>${escapeHtml(shortDate(point.record))}: ${formatNumber(point.value)} ${escapeHtml(unit)}</title></circle>`).join('');
    return `<svg viewBox="0 0 320 180" role="img" aria-label="${escapeHtml(unit)} across ${points.length} logged workouts">${grids}${fill}<path class="chart-line" d="${path}"/>${dots}</svg>`;
  }

  function localDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dateOrdinal(key) {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
  }

  function loggedDayKeys(todayKey) {
    const days = new Set();
    state.history.forEach(record => {
      let key = record.workoutDate;
      if (!key || !timestampForDate(key)) {
        const date = new Date(record.timestamp);
        if (!Number.isFinite(date.getTime())) return;
        key = localDateString(date);
      }
      if (key <= todayKey) days.add(key);
    });
    return days;
  }

  function renderConsistency() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayKey = localDateString(today);
    const days = loggedDayKeys(todayKey);
    const firstDay = days.size ? [...days].sort()[0] : null;
    const start = consistencyRange === '30'
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29, 12)
      : new Date(today.getFullYear(), today.getMonth() - 11, 1, 12);
    const startKey = localDateString(start);
    const trackedStart = firstDay && firstDay > startKey ? firstDay : startKey;
    const trackedDays = firstDay ? dateOrdinal(todayKey) - dateOrdinal(trackedStart) + 1 : 0;
    const trainedDays = [...days].filter(key => key >= trackedStart).length;
    const rate = trackedDays ? Math.round(trainedDays / trackedDays * 100) : 0;
    const targetDays = Math.ceil(trackedDays * 6 / 7);
    els.consistencyPercent.textContent = trackedDays ? `${rate}%` : '—';
    els.consistencySummary.textContent = trackedDays ? `${trainedDays} of ${trackedDays} days trained` : 'Log a workout to start tracking.';
    els.consistencyFill.style.width = `${rate}%`;
    els.consistencyTrack.setAttribute('aria-valuenow', String(rate));
    els.consistencyGoal.textContent = trackedDays ? `6-day weekly goal ≈ ${targetDays} days here · white mark = 86%` : 'Your first logged day starts the tracking period.';
    document.querySelectorAll('[data-consistency-range]').forEach(button => {
      const active = button.dataset.consistencyRange === consistencyRange;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    els.consistencyVisualTitle.textContent = consistencyRange === '30' ? 'Last 30 days' : 'Past 12 months';
    els.consistencyVisualCount.textContent = trackedDays ? `${trainedDays} training ${trainedDays === 1 ? 'day' : 'days'}` : 'No logs yet';
    if (consistencyRange === '30') {
      const headings = ['M','T','W','T','F','S','S'].map(day => `<span>${day}</span>`).join('');
      const blanks = '<span class="consistency-day-spacer" aria-hidden="true"></span>'.repeat((start.getDay() + 6) % 7);
      const cells = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
        const key = localDateString(date);
        const status = !firstDay || key < firstDay ? 'untracked' : days.has(key) ? 'trained' : 'rested';
        const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const detail = status === 'trained' ? 'trained' : status === 'rested' ? 'no log' : 'before first log';
        return `<span class="consistency-day ${status}" aria-label="${escapeHtml(label)}: ${detail}" title="${escapeHtml(label)}: ${detail}">${date.getDate()}</span>`;
      }).join('');
      els.consistencyChart.innerHTML = `<div class="consistency-day-labels" aria-hidden="true">${headings}</div><div class="consistency-days">${blanks}${cells}</div>`;
    } else {
      const months = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1, 12);
        const monthStart = localDateString(month);
        const monthEnd = index === 11 ? todayKey : localDateString(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12));
        const measuredStart = firstDay && firstDay > monthStart ? firstDay : monthStart;
        const measuredDays = firstDay && measuredStart <= monthEnd ? dateOrdinal(monthEnd) - dateOrdinal(measuredStart) + 1 : 0;
        const count = [...days].filter(key => key >= measuredStart && key <= monthEnd).length;
        const percent = measuredDays ? Math.round(count / measuredDays * 100) : 0;
        const label = month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        return `<div class="consistency-month${measuredDays ? '' : ' untracked'}" aria-label="${escapeHtml(label)}: ${measuredDays ? `${count} of ${measuredDays} days trained, ${percent}%` : 'before first log'}" title="${escapeHtml(label)}: ${measuredDays ? `${count} of ${measuredDays} days trained` : 'before first log'}"><div class="consistency-month-track"><span class="consistency-month-fill" style="height:${percent}%"></span></div><span class="consistency-month-label">${escapeHtml(month.toLocaleDateString(undefined, { month: 'short' }))}</span></div>`;
      }).join('');
      els.consistencyChart.innerHTML = `<div class="consistency-months">${months}</div>`;
    }
  }

  function timestampForDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return localDateString(date) === value ? date.toISOString() : null;
  }

  function openPastEntry(recordId = null) {
    const record = recordId ? state.history.find(item => item.id === recordId && item.backfilled) : null;
    editingPastRecordId = record?.id || null;
    els.pastEntryForm.reset();
    els.pastEntryTitle.textContent = record ? 'Edit past result' : 'Add past result';
    els.savePastEntryButton.textContent = record ? 'Update result' : 'Save result';
    els.deletePastEntryButton.hidden = !record;
    els.pastEntryDate.max = localDateString(new Date());
    els.pastEntryDate.value = record ? (record.workoutDate || localDateString(new Date(record.timestamp))) : lastPastDate;
    els.pastEntryExercise.value = record?.exerciseId || insightsExerciseId;
    els.pastEntryExercise.disabled = !!record;
    els.pastEntryUseForTarget.checked = record ? !!record.affectsProgression : DEFAULT_BACKFILL_UPDATES_TARGET;
    renderPastEntryFields(record);
    els.pastEntryForm.hidden = false;
    els.pastEntryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closePastEntry() {
    els.pastEntryForm.hidden = true;
    editingPastRecordId = null;
  }

  function renderPastEntryFields(record = null) {
    const ex = state.exercises[els.pastEntryExercise.value];
    if (!ex) return;
    const timed = ex.kind === 'timer';
    els.pastEntryLoadRow.hidden = timed;
    els.pastEntryLoad.required = !timed;
    els.pastEntryLoadLabel.textContent = ex.kind === 'bar' ? 'Total weight, including the bar' : ex.kind === 'db' ? 'Weight of each dumbbell' : 'Dumbbell weight';
    els.pastEntryLoad.min = ex.kind === 'bar' ? String(barWeight(ex)) : '0';
    els.pastEntryLoad.value = !record || timed ? '' : String(ex.kind === 'bar' ? record.totalWeight : record.weight);
    els.pastEntrySets.querySelectorAll('label').forEach((label, index) => { label.textContent = `Set ${index + 1} ${timed ? '(seconds)' : '(reps)'}`; });
    const values = record ? (timed ? record.seconds : record.reps) : null;
    [els.pastEntrySet1, els.pastEntrySet2, els.pastEntrySet3].forEach((input, index) => { input.value = values?.[index] ?? ''; });
    els.pastEntrySkiFields.hidden = ex.id !== 'ski';
    els.pastEntrySetting.value = ex.id === 'ski' ? (record?.setting ?? '') : '';
    els.pastEntryPace.value = ex.id === 'ski' ? (record?.pace ?? '') : '';
    els.pastEntryHint.textContent = 'The date you choose appears on the chart. Only a result newer than your other logs can change your next target.';
  }

  function progressionSnapshot(ex) {
    return { last: ex.last?.slice(), seconds: ex.seconds?.slice(), weight: ex.weight, sideWeight: ex.sideWeight, progressionRecordId: ex.progressionRecordId || null };
  }

  function applyProgressionRecord(ex, record) {
    const values = ex.kind === 'timer' ? record.seconds : record.reps;
    if (!Array.isArray(values) || values.length !== 3) return;
    ex.last = values.map(Number);
    if (ex.kind === 'timer') ex.seconds = ex.last.slice();
    else if (ex.kind === 'bar') ex.sideWeight = Number(record.sideWeight);
    else ex.weight = Number(record.weight);
    ex.progressionRecordId = record.id;
  }

  function reconcilePastProgression(ex, changedId, previousRecord) {
    const wasSource = ex.progressionRecordId === changedId;
    const records = exerciseRecords(ex.id);
    const eligible = records.filter(record => !record.backfilled || record.affectsProgression);
    const latest = eligible[eligible.length - 1];
    const latestOverall = records[records.length - 1];
    const replacement = latest?.id === changedId && latestOverall?.id !== changedId ? eligible.filter(record => record.id !== changedId).slice(-1)[0] : latest;
    if (wasSource && replacement) applyProgressionRecord(ex, replacement);
    else if (wasSource) {
      const snapshot = previousRecord?.priorProgression || progressionSnapshot(defaultState().exercises[ex.id]);
      ex.last = snapshot.last?.slice();
      if (ex.kind === 'timer') ex.seconds = snapshot.seconds?.slice();
      else if (ex.kind === 'bar') ex.sideWeight = snapshot.sideWeight;
      else ex.weight = snapshot.weight;
      ex.progressionRecordId = snapshot.progressionRecordId;
    } else if (latest?.id === changedId && latestOverall?.id === changedId) applyProgressionRecord(ex, latest);
  }

  function savePastEntry(event) {
    event.preventDefault();
    const ex = state.exercises[els.pastEntryExercise.value];
    const dateValue = els.pastEntryDate.value;
    const timestamp = timestampForDate(dateValue);
    if (!ex || !EXERCISE_IMAGES[ex.id] || !timestamp || dateValue > localDateString(new Date())) { showToast('Choose a valid past date'); return; }
    const setInputs = [els.pastEntrySet1, els.pastEntrySet2, els.pastEntrySet3];
    const values = setInputs.map(input => Number(input.value));
    if (setInputs.some(input => input.value === '') || values.some(value => !Number.isInteger(value) || value < 0)) { showToast('Enter all three sets'); return; }
    const timed = ex.kind === 'timer';
    const load = timed ? null : Number(els.pastEntryLoad.value);
    if (!timed && (!Number.isFinite(load) || load <= 0 || (ex.kind === 'bar' && load < barWeight(ex)))) { showToast('Check the weight'); return; }
    const existingIndex = editingPastRecordId ? state.history.findIndex(record => record.id === editingPastRecordId && record.backfilled) : -1;
    const previousRecord = existingIndex >= 0 ? state.history[existingIndex] : null;
    const record = {
      id: previousRecord?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      workoutDate: dateValue,
      sessionId: previousRecord?.sessionId || `past-${dateValue}`,
      workout: ex.workout,
      exerciseId: ex.id,
      exerciseName: ex.name,
      kind: ex.kind,
      targetValues: previousRecord?.targetValues || values.slice(),
      previousText: previousRecord?.previousText || '',
      reps: timed ? null : values.slice(),
      seconds: timed ? values.slice() : null,
      weight: ex.kind.startsWith('db') ? load : null,
      sideWeight: ex.kind === 'bar' ? (load - barWeight(ex)) / 2 : null,
      totalWeight: ex.kind === 'bar' ? load : null,
      barWeight: ex.kind === 'bar' ? barWeight(ex) : null,
      setting: ex.id === 'ski' && els.pastEntrySetting.value !== '' ? Number(els.pastEntrySetting.value) : null,
      pace: ex.id === 'ski' && els.pastEntryPace.value !== '' ? Number(els.pastEntryPace.value) : null,
      backfilled: true,
      affectsProgression: els.pastEntryUseForTarget.checked,
      priorProgression: previousRecord?.priorProgression || progressionSnapshot(ex)
    };
    if (existingIndex >= 0) state.history[existingIndex] = record;
    else state.history.push(record);
    reconcilePastProgression(ex, record.id, previousRecord);
    state.undoRecord = null;
    lastPastDate = dateValue;
    insightsExerciseId = ex.id;
    saveState();
    closePastEntry();
    render();
    renderInsights();
    renderConsistency();
    showToast(previousRecord ? 'Past result updated' : 'Past result added');
  }

  function deletePastEntry() {
    const index = state.history.findIndex(record => record.id === editingPastRecordId && record.backfilled);
    if (index < 0 || !confirm('Delete this past result? This cannot be undone.')) return;
    const record = state.history[index];
    const ex = state.exercises[record.exerciseId];
    state.history.splice(index, 1);
    reconcilePastProgression(ex, record.id, record);
    state.undoRecord = null;
    saveState();
    closePastEntry();
    render();
    renderInsights();
    renderConsistency();
    showToast('Past result deleted');
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
    const rows = state.history.slice().sort(compareRecordDates).map(r => {
      const vals = r.kind === 'timer' ? r.seconds : r.reps;
      return [r.workoutDate || new Date(r.timestamp).toLocaleString(), r.workout, r.exerciseName, r.kind, r.totalWeight ?? '', r.weight ?? '', r.sideWeight ?? '', vals?.[0] ?? '', vals?.[1] ?? '', vals?.[2] ?? '', r.setting ?? '', r.pace ?? ''];
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
  els.insightsButton.addEventListener('click', openInsights);
  els.closeInsightsButton.addEventListener('click', closeInsights);
  document.querySelectorAll('[data-insights-view]').forEach(button => button.addEventListener('click', () => setInsightsView(button.dataset.insightsView)));
  document.querySelectorAll('[data-consistency-range]').forEach(button => button.addEventListener('click', () => { consistencyRange = button.dataset.consistencyRange; renderConsistency(); }));
  els.insightsExerciseSelect.addEventListener('change', () => { insightsExerciseId = els.insightsExerciseSelect.value; closePastEntry(); renderInsights(); });
  els.insightsMetrics.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { insightsMetric = button.dataset.metric; renderInsights(); }));
  els.insightsChart.addEventListener('click', event => { if (event.target.closest('[data-add-past]')) openPastEntry(); });
  els.addPastResultButton.addEventListener('click', () => openPastEntry());
  els.pastEntryExercise.addEventListener('change', () => renderPastEntryFields());
  els.pastEntryForm.addEventListener('submit', savePastEntry);
  els.closePastEntryButton.addEventListener('click', closePastEntry);
  els.cancelPastEntryButton.addEventListener('click', closePastEntry);
  els.deletePastEntryButton.addEventListener('click', deletePastEntry);
  els.historyButton.addEventListener('click', () => openSheet(els.historySheet));
  els.settingsButton.addEventListener('click', () => openSheet(els.settingsSheet));
  els.editExerciseButton.addEventListener('click', openAdjust);
  els.exerciseImageButton.addEventListener('click', openExerciseImage);
  els.closeExerciseImageButton.addEventListener('click', closeExerciseImage);
  els.exerciseImageOverlay.addEventListener('click', event => { if (event.target === els.exerciseImageOverlay) closeExerciseImage(); });
  els.modalBackdrop.addEventListener('click', closeSheet);
  document.querySelectorAll('.close-sheet').forEach(btn => btn.addEventListener('click', closeSheet));
  els.ezBarWeight.addEventListener('change', saveEzBarWeight);
  els.exportBackupButton.addEventListener('click', exportBackup);
  els.importBackupInput.addEventListener('change', e => { if (e.target.files?.[0]) importBackup(e.target.files[0]); e.target.value=''; });
  els.exportCsvButton.addEventListener('click', exportCsv);
  els.resetButton.addEventListener('click', resetAll);
  els.saveAdjustButton.addEventListener('click', saveAdjust);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!els.exerciseImageOverlay.hidden) closeExerciseImage();
    else if (!els.completionOverlay.hidden) closeCelebration();
    else if (activeSheet) closeSheet();
    else if (!els.pastEntryForm.hidden) closePastEntry();
    else if (!els.insightsPage.hidden) closeInsights();
  });
  window.addEventListener('resize', fitExerciseTitle);
  window.addEventListener('beforeunload', saveState);

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  render();
})();
