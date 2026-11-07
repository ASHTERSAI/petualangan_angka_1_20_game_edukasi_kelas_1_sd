/**
 * PETUALANGAN ANGKA 1-20
 * Game Edukasi Interaktif Berhitung Kelas 1 SD
 * Dilengkapi Web Audio API Synthesizer & SpeechSynthesis
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.speechVoice = null;
    this.initSpeech();
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initSpeech() {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        this.speechVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID')) || null;
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  playTone(freq, type = 'sine', duration = 0.2, startTime = 0) {
    if (!this.enabled) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + startTime);

      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(this.audioCtx.currentTime + startTime);
      osc.stop(this.audioCtx.currentTime + startTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playClick() {
    this.playTone(520, 'sine', 0.08);
  }

  playItemCount(index = 1) {
    const baseFreq = 320;
    const freq = baseFreq + (index * 25);
    this.playTone(freq, 'triangle', 0.15);
  }

  playCorrect() {
    // Happy ascending chime (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.22, idx * 0.08);
    });
  }

  playWrong() {
    // Gentle boing (no harsh buzzing)
    this.playTone(330, 'triangle', 0.2, 0);
    this.playTone(260, 'triangle', 0.3, 0.15);
  }

  playFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.35, idx * 0.12);
    });
  }

  speak(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9; // clear, friendly tempo for primary school
    utterance.pitch = 1.1; // cheerful voice
    if (this.speechVoice) {
      utterance.voice = this.speechVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
}

// Visual Items Database for Grade 1
const EMOJI_ITEMS = ['🍎', '🍌', '🍓', '🥕', '🐰', '⭐', '🎈', '🚗', '🐱', '🐣', '⚽', '🍦'];

const NUMBER_WORDS = {
  1: 'SATU', 2: 'DUA', 3: 'TIGA', 4: 'EMPAT', 5: 'LIMA',
  6: 'ENAM', 7: 'TUJUH', 8: 'DELAPAN', 9: 'SEMBILAN', 10: 'SEPULUH',
  11: 'SEBELAS', 12: 'DUA BELAS', 13: 'TIGA BELAS', 14: 'EMPAT BELAS', 15: 'LIMA BELAS',
  16: 'ENAM BELAS', 17: 'TUJUH BELAS', 18: 'DELAPAN BELAS', 19: 'SEMBILAN BELAS', 20: 'DUA PULUH'
};

class GameApp {
  constructor() {
    this.sound = new SoundManager();
    this.currentMode = 'explore';
    this.currentQuestionIndex = 0;
    this.totalQuestionsPerSession = 10;
    this.maxNumberRange = 20;
    this.isRelayMode = false;
    this.relayPlayerIndex = 1;

    this.sessionScore = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.questionsList = [];
    this.currentQuestionData = null;
    this.selectedExploreNumber = 1;
    this.countedItemsCount = 0;

    // Load saved settings & stats
    this.loadStorage();
    this.initDOM();
    this.initConfetti();
  }

  loadStorage() {
    this.totalStars = parseInt(localStorage.getItem('pa_stars') || '0', 10);
    this.highScore = parseInt(localStorage.getItem('pa_high_score') || '0', 10);
    this.maxNumberRange = parseInt(localStorage.getItem('pa_range') || '20', 10);
    this.totalQuestionsPerSession = parseInt(localStorage.getItem('pa_qcount') || '10', 10);
    this.isRelayMode = localStorage.getItem('pa_relay') === 'true';
  }

  saveStorage() {
    localStorage.setItem('pa_stars', this.totalStars);
    localStorage.setItem('pa_high_score', this.highScore);
    localStorage.setItem('pa_range', this.maxNumberRange);
    localStorage.setItem('pa_qcount', this.totalQuestionsPerSession);
    localStorage.setItem('pa_relay', this.isRelayMode);
  }

  initDOM() {
    // Header buttons
    document.getElementById('btn-home').addEventListener('click', () => {
      this.sound.playClick();
      this.showHome();
    });

    document.getElementById('btn-teacher-mode').addEventListener('click', () => {
      this.sound.playClick();
      this.toggleTeacherModal(true);
    });

    const soundBtn = document.getElementById('btn-sound-toggle');
    soundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      soundBtn.textContent = this.sound.enabled ? '🔊' : '🔇';
      if (this.sound.enabled) this.sound.playClick();
    });

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.getElementById('btn-speak-question').addEventListener('click', () => {
      if (this.currentQuestionData) {
        this.sound.speak(this.currentQuestionData.speechText || this.currentQuestionData.text);
      }
    });

    this.updateHomeStats();
    this.setupExploreGrid();
    this.applySettingsToForm();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  updateHomeStats() {
    document.getElementById('home-stars-count').textContent = this.totalStars;
    document.getElementById('home-high-score').textContent = this.highScore;
  }

  showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showHome() {
    this.updateHomeStats();
    this.showView('view-home');
  }

  /* -------------------------------
     EXPLORE NUMBER (Mengenal Angka)
  --------------------------------- */
  setupExploreGrid() {
    const container = document.getElementById('numbers-grid-container');
    container.innerHTML = '';
    const max = this.maxNumberRange;

    for (let i = 1; i <= max; i++) {
      const btn = document.createElement('button');
      btn.className = `keypad-btn ${i === this.selectedExploreNumber ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        this.selectExploreNumber(i);
      });
      container.appendChild(btn);
    }
    this.renderExploreDetail(this.selectedExploreNumber);
  }

  selectExploreNumber(num) {
    this.selectedExploreNumber = num;
    this.sound.playClick();
    this.setupExploreGrid();
    this.renderExploreDetail(num);
  }

  renderExploreDetail(num) {
    document.getElementById('focus-number-display').textContent = num;
    const word = NUMBER_WORDS[num] || String(num);
    document.getElementById('focus-number-words').textContent = word;

    // Place value explanation for Grade 1
    let placeValText = `${num} Satuan`;
    if (num >= 10 && num < 20) {
      const ones = num - 10;
      placeValText = `1 Puluhan dan ${ones} Satuan`;
    } else if (num === 20) {
      placeValText = `2 Puluhan (20 Satuan)`;
    }
    document.getElementById('focus-place-value').textContent = placeValText;

    // Generate countable emoji items
    const emoji = EMOJI_ITEMS[(num - 1) % EMOJI_ITEMS.length];
    const itemsContainer = document.getElementById('focus-items-container');
    itemsContainer.innerHTML = '';
    this.countedItemsCount = 0;

    for (let i = 1; i <= num; i++) {
      const itemEl = document.createElement('div');
      itemEl.className = 'touch-count-item';
      itemEl.textContent = emoji;
      itemEl.title = `Sentuh untuk menghitung: ${i}`;
      itemEl.addEventListener('click', () => {
        if (!itemEl.classList.contains('counted')) {
          itemEl.classList.add('counted');
          this.countedItemsCount++;
          this.sound.playItemCount(this.countedItemsCount);
          this.sound.speak(String(this.countedItemsCount));
        }
      });
      itemsContainer.appendChild(itemEl);
    }

    // Auto speak number name
    this.sound.speak(`${num}. ${word}`);
  }

  speakCurrentNumber() {
    const num = this.selectedExploreNumber;
    const word = NUMBER_WORDS[num] || String(num);
    this.sound.speak(`${num}. ${word}`);
  }

  /* -------------------------------
     START GAME / QUIZ MODES
  --------------------------------- */
  startMode(mode) {
    this.sound.playClick();
    this.currentMode = mode;

    if (mode === 'explore') {
      this.setupExploreGrid();
      this.showView('view-explore');
      return;
    }

    this.currentQuestionIndex = 0;
    this.sessionScore = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.relayPlayerIndex = 1;

    this.generateQuestions(mode);
    this.showView('view-quiz');
    this.renderCurrentQuestion();
  }

  generateQuestions(mode) {
    this.questionsList = [];
    const count = this.totalQuestionsPerSession;

    for (let i = 0; i < count; i++) {
      let qType = mode;
      if (mode === 'challenge') {
        const types = ['addition', 'subtraction', 'compare_more', 'compare_less', 'story'];
        qType = types[Math.floor(Math.random() * types.length)];
      }

      let qData;
      switch (qType) {
        case 'addition':
          qData = this.buildAdditionQuestion();
          break;
        case 'subtraction':
          qData = this.buildSubtractionQuestion();
          break;
        case 'compare_more':
          qData = this.buildCompareQuestion('more');
          break;
        case 'compare_less':
          qData = this.buildCompareQuestion('less');
          break;
        case 'story':
          qData = this.buildStoryQuestion();
          break;
        default:
          qData = this.buildAdditionQuestion();
      }
      this.questionsList.push(qData);
    }
  }

  getRandomEmoji() {
    return EMOJI_ITEMS[Math.floor(Math.random() * EMOJI_ITEMS.length)];
  }

  buildAdditionQuestion() {
    const max = this.maxNumberRange;
    const a = Math.floor(Math.random() * (max - 2)) + 1;
    const maxB = max - a;
    const b = Math.floor(Math.random() * Math.min(maxB, 10)) + 1;
    const ans = a + b;
    const emoji = this.getRandomEmoji();

    const options = this.generateOptions(ans, 1, max);

    return {
      type: 'addition',
      title: 'Penjumlahan',
      text: 'Berapa jumlah benda berikut jika digabungkan?',
      speechText: `Berapa ${a} ditambah ${b}?`,
      equation: `${a} + ${b} = ?`,
      emoji: emoji,
      groupA: a,
      groupB: b,
      correctAnswer: ans,
      options: options
    };
  }

  buildSubtractionQuestion() {
    const max = this.maxNumberRange;
    const a = Math.floor(Math.random() * (max - 2)) + 2;
    const b = Math.floor(Math.random() * (a - 1)) + 1;
    const ans = a - b;
    const emoji = this.getRandomEmoji();

    const options = this.generateOptions(ans, 0, max);

    return {
      type: 'subtraction',
      title: 'Pengurangan',
      text: `Ada ${a} benda, kemudian berkurang ${b}. Berapa yang tersisa?`,
      speechText: `Ada ${a} benda, berkurang ${b}. Berapa sisanya?`,
      equation: `${a} - ${b} = ?`,
      emoji: emoji,
      totalCount: a,
      subtractCount: b,
      correctAnswer: ans,
      options: options
    };
  }

  buildCompareQuestion(subType) {
    const max = Math.min(this.maxNumberRange, 15);
    let a = Math.floor(Math.random() * max) + 1;
    let b = Math.floor(Math.random() * max) + 1;
    while (a === b) {
      b = Math.floor(Math.random() * max) + 1;
    }

    const isMore = subType === 'more';
    const ans = isMore ? (a > b ? 'A' : 'B') : (a < b ? 'A' : 'B');
    const emojiA = this.getRandomEmoji();
    let emojiB = this.getRandomEmoji();
    while (emojiB === emojiA) emojiB = this.getRandomEmoji();

    return {
      type: 'compare',
      compareType: subType,
      title: isMore ? 'Mana yang Lebih Banyak?' : 'Mana yang Lebih Sedikit?',
      text: isMore ? 'Pilih kelompok yang JUMLAHNYA LEBIH BANYAK!' : 'Pilih kelompok yang JUMLAHNYA LEBIH SEDIKIT!',
      speechText: isMore ? 'Kelompok mana yang lebih banyak?' : 'Kelompok mana yang lebih sedikit?',
      equation: isMore ? 'Kelompok A atau Kelompok B?' : 'Kelompok A atau Kelompok B?',
      groupA: { count: a, emoji: emojiA, label: `Kelompok A (${a})` },
      groupB: { count: b, emoji: emojiB, label: `Kelompok B (${b})` },
      correctAnswer: ans,
      options: ['A', 'B']
    };
  }

  buildStoryQuestion() {
    const max = this.maxNumberRange;
    const templates = [
      {
        text: (a, b) => `Budi mempunyai ${a} buah apel. Ibu memberikan lagi ${b} buah apel. Berapa jumlah apel Budi sekarang?`,
        op: '+',
        emoji: '🍎'
      },
      {
        text: (a, b) => `Siti memiliki ${a} buah permen. Ia memberikan ${b} permen kepada temannya. Berapa sisa permen Siti?`,
        op: '-',
        emoji: '🍬'
      },
      {
        text: (a, b) => `Ada ${a} ekor burung di atas pohon. Datang lagi ${b} ekor burung. Berapa banyak burung sekarang?`,
        op: '+',
        emoji: '🐦'
      },
      {
        text: (a, b) => `Andi mempunyai ${a} kelereng mainan. Sebanyak ${b} kelereng hilang. Berapa kelereng Andi sekarang?`,
        op: '-',
        emoji: '⚽'
      }
    ];

    const chosen = templates[Math.floor(Math.random() * templates.length)];
    let a, b, ans;

    if (chosen.op === '+') {
      a = Math.floor(Math.random() * (max - 4)) + 1;
      b = Math.floor(Math.random() * Math.min(max - a, 6)) + 1;
      ans = a + b;
    } else {
      a = Math.floor(Math.random() * (max - 3)) + 3;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      ans = a - b;
    }

    const storyText = chosen.text(a, b);
    const options = this.generateOptions(ans, 0, max);

    return {
      type: 'story',
      title: 'Soal Cerita',
      text: storyText,
      speechText: storyText,
      equation: `${a} ${chosen.op} ${b} = ?`,
      emoji: chosen.emoji,
      op: chosen.op,
      numA: a,
      numB: b,
      correctAnswer: ans,
      options: options
    };
  }

  generateOptions(correct, minVal, maxVal) {
    const set = new Set();
    set.add(correct);

    while (set.size < 3) {
      const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      let cand = correct + delta;
      if (cand < minVal) cand = correct + Math.floor(Math.random() * 3) + 1;
      if (cand > maxVal) cand = correct - Math.floor(Math.random() * 3) - 1;
      if (cand >= 0) set.add(cand);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  }

  /* -------------------------------
     RENDER CURRENT QUESTION
  --------------------------------- */
  renderCurrentQuestion() {
    const q = this.questionsList[this.currentQuestionIndex];
    this.currentQuestionData = q;

    // Status Bar & Relay Mode
    const relayBanner = document.getElementById('relay-banner');
    if (this.isRelayMode) {
      relayBanner.style.display = 'block';
      document.getElementById('current-player-turn').textContent = this.currentQuestionIndex + 1;
    } else {
      relayBanner.style.display = 'none';
    }

    document.getElementById('quiz-badge-mode').textContent = q.title;
    document.getElementById('quiz-question-counter').textContent = 
      `Soal ${this.currentQuestionIndex + 1} dari ${this.questionsList.length}`;

    const progressPct = ((this.currentQuestionIndex + 1) / this.questionsList.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progressPct}%`;
    document.getElementById('current-session-score').textContent = this.sessionScore;

    // Question Text & Equation
    document.getElementById('question-text').textContent = q.text;
    document.getElementById('equation-display').textContent = q.equation;

    // Render Visual Stage
    const visualStage = document.getElementById('visual-stage');
    visualStage.innerHTML = '';
    const replayBtn = document.getElementById('btn-replay-anim');
    replayBtn.style.display = 'none';

    if (q.type === 'addition') {
      const boxA = this.createVisualBox(q.groupA, q.emoji);
      const sign = document.createElement('div');
      sign.className = 'math-op-sign';
      sign.textContent = '+';
      const boxB = this.createVisualBox(q.groupB, q.emoji);

      visualStage.appendChild(boxA);
      visualStage.appendChild(sign);
      visualStage.appendChild(boxB);
    } else if (q.type === 'subtraction') {
      replayBtn.style.display = 'inline-block';
      this.renderSubtractionVisual(q);
    } else if (q.type === 'compare') {
      const boxA = this.createVisualBox(q.groupA.count, q.groupA.emoji, q.groupA.label, true, 'A');
      const vsText = document.createElement('div');
      vsText.className = 'math-op-sign';
      vsText.textContent = 'VS';
      const boxB = this.createVisualBox(q.groupB.count, q.groupB.emoji, q.groupB.label, true, 'B');

      visualStage.appendChild(boxA);
      visualStage.appendChild(vsText);
      visualStage.appendChild(boxB);
    } else if (q.type === 'story') {
      if (q.op === '+') {
        const boxA = this.createVisualBox(q.numA, q.emoji);
        const sign = document.createElement('div');
        sign.className = 'math-op-sign';
        sign.textContent = '+';
        const boxB = this.createVisualBox(q.numB, q.emoji);
        visualStage.appendChild(boxA);
        visualStage.appendChild(sign);
        visualStage.appendChild(boxB);
      } else {
        replayBtn.style.display = 'inline-block';
        this.renderSubtractionVisual({
          totalCount: q.numA,
          subtractCount: q.numB,
          emoji: q.emoji
        });
      }
    }

    // Render Answer Options
    const optContainer = document.getElementById('options-container');
    optContainer.innerHTML = '';

    if (q.type === 'compare') {
      optContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
      ['A', 'B'].forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `Kelompok <strong>${choice}</strong>`;
        btn.addEventListener('click', () => this.handleAnswer(choice, btn));
        optContainer.appendChild(btn);
      });
    } else {
      optContainer.style.gridTemplateColumns = `repeat(${q.options.length}, 1fr)`;
      q.options.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = val;
        btn.addEventListener('click', () => this.handleAnswer(val, btn));
        optContainer.appendChild(btn);
      });
    }

    // Read question aloud
    this.sound.speak(q.speechText);
  }

  createVisualBox(count, emoji, labelText = null, isSelectable = false, selectKey = null) {
    const box = document.createElement('div');
    box.className = `item-group-box ${isSelectable ? 'selectable' : ''}`;

    if (labelText) {
      const label = document.createElement('span');
      label.className = 'item-group-label';
      label.textContent = labelText;
      box.appendChild(label);
    }

    for (let i = 0; i < count; i++) {
      const item = document.createElement('span');
      item.className = 'visual-item';
      item.textContent = emoji;
      box.appendChild(item);
    }

    if (isSelectable && selectKey) {
      box.addEventListener('click', () => {
        this.handleAnswer(selectKey, box);
      });
    }
    return box;
  }

  renderSubtractionVisual(q) {
    const visualStage = document.getElementById('visual-stage');
    visualStage.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'item-group-box';
    box.id = 'subtraction-anim-box';

    for (let i = 0; i < q.totalCount; i++) {
      const item = document.createElement('span');
      item.className = 'visual-item';
      item.textContent = q.emoji;
      box.appendChild(item);
    }

    visualStage.appendChild(box);

    // Trigger cross-out animation after small delay
    setTimeout(() => {
      this.animateSubtractionCrossOut(q.subtractCount);
    }, 600);
  }

  animateSubtractionCrossOut(countToSubtract) {
    const box = document.getElementById('subtraction-anim-box');
    if (!box) return;
    const items = box.querySelectorAll('.visual-item');
    const total = items.length;

    // Cross out from the end
    for (let i = total - 1; i >= total - countToSubtract && i >= 0; i--) {
      setTimeout(() => {
        if (items[i]) {
          items[i].classList.add('crossed-out');
        }
      }, (total - 1 - i) * 200);
    }
  }

  replayCurrentAnimation() {
    this.sound.playClick();
    const q = this.currentQuestionData;
    if (q) {
      if (q.type === 'subtraction') {
        this.renderSubtractionVisual(q);
      } else if (q.type === 'story' && q.op === '-') {
        this.renderSubtractionVisual({
          totalCount: q.numA,
          subtractCount: q.numB,
          emoji: q.emoji
        });
      }
    }
  }

  /* -------------------------------
     HANDLE ANSWER & FEEDBACK
  --------------------------------- */
  handleAnswer(selected, buttonEl) {
    const q = this.currentQuestionData;
    const isCorrect = (String(selected).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase());

    // Disable all options briefly
    const allBtns = document.querySelectorAll('.option-btn, .item-group-box.selectable');
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    if (isCorrect) {
      if (buttonEl && buttonEl.classList) buttonEl.classList.add('correct-glow');
      this.sound.playCorrect();
      this.sessionScore += 10;
      this.correctCount++;
      this.showFeedbackPopup(true, 'HEBAT! JAWABAN KAMU BENAR! 🌟');
      this.triggerConfetti();

      setTimeout(() => {
        this.nextQuestion();
      }, 1600);
    } else {
      if (buttonEl && buttonEl.classList) buttonEl.classList.add('wrong-shake');
      this.sound.playWrong();
      this.wrongCount++;
      this.showFeedbackPopup(false, 'YUK, COBA LAGI! Hitung pelan-pelan ya!');

      setTimeout(() => {
        if (buttonEl && buttonEl.classList) buttonEl.classList.remove('wrong-shake');
        allBtns.forEach(b => b.style.pointerEvents = 'auto');
      }, 1300);
    }
  }

  showFeedbackPopup(isCorrect, message) {
    const overlay = document.getElementById('feedback-overlay');
    const card = document.getElementById('feedback-card');
    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-title');
    const msg = document.getElementById('feedback-msg');

    if (isCorrect) {
      card.className = 'feedback-card animate-pop';
      icon.textContent = '🎉';
      title.textContent = 'LUAR BIASA!';
    } else {
      card.className = 'feedback-card wrong animate-pop';
      icon.textContent = '💡';
      title.textContent = 'YUK, COBA LAGI!';
    }
    msg.textContent = message;
    overlay.style.display = 'flex';

    setTimeout(() => {
      overlay.style.display = 'none';
    }, 1400);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questionsList.length) {
      this.renderCurrentQuestion();
    } else {
      this.showResults();
    }
  }

  /* -------------------------------
     RESULTS & SUMMARY
  --------------------------------- */
  showResults() {
    this.showView('view-result');
    this.sound.playFanfare();
    this.triggerConfetti();

    const total = this.questionsList.length;
    const correct = this.correctCount;
    const finalScore = this.sessionScore;

    document.getElementById('result-correct-count').textContent = correct;
    document.getElementById('result-wrong-count').textContent = this.wrongCount;
    document.getElementById('result-final-score').textContent = finalScore;

    // Stars calculation: 3 stars for >= 80%, 2 for >= 50%, 1 for < 50%
    const ratio = correct / total;
    let earnedStars = 1;
    if (ratio >= 0.8) earnedStars = 3;
    else if (ratio >= 0.5) earnedStars = 2;

    this.totalStars += earnedStars;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
    }
    this.saveStorage();

    const starEls = document.querySelectorAll('#stars-earned-container .star-big');
    starEls.forEach((el, idx) => {
      if (idx < earnedStars) {
        setTimeout(() => el.classList.add('active'), idx * 300);
      } else {
        el.classList.remove('active');
      }
    });

    // Friendly messages for Grade 1
    const titleEl = document.getElementById('result-title');
    const subEl = document.getElementById('result-subtitle');
    const motivEl = document.getElementById('result-motivation');

    if (earnedStars === 3) {
      titleEl.textContent = '🌟 LUAR BIASA!';
      subEl.textContent = `Kamu berhasil menjawab ${correct} dari ${total} soal!`;
      motivEl.textContent = 'Hebat sekali! Kamu adalah Bintang Matematika hari ini!';
      this.sound.speak('Luar biasa! Kamu adalah bintang matematika!');
    } else if (earnedStars === 2) {
      titleEl.textContent = '👏 BAGUS SEKALI!';
      subEl.textContent = `Kamu berhasil menjawab ${correct} dari ${total} soal.`;
      motivEl.textContent = 'Sedikit lagi sempurna! Teruslah giat berlatih ya!';
      this.sound.speak('Bagus sekali! Teruslah rajin belajar!');
    } else {
      titleEl.textContent = '💪 TETAP SEMANGAT!';
      subEl.textContent = `Kamu telah berusaha menjawab ${total} soal!`;
      motivEl.textContent = 'Setiap latihan membuatmu makin pintar. Yuk coba lagi!';
      this.sound.speak('Tetap semangat! Kamu pasti bisa!');
    }
  }

  restartCurrentMode() {
    this.sound.playClick();
    this.startMode(this.currentMode);
  }

  /* -------------------------------
     TEACHER MODE & SETTINGS
  --------------------------------- */
  toggleTeacherModal(show) {
    const modal = document.getElementById('modal-teacher');
    modal.style.display = show ? 'flex' : 'none';
  }

  applySettingsToForm() {
    if (this.maxNumberRange === 10) {
      document.getElementById('range-10').checked = true;
    } else {
      document.getElementById('range-20').checked = true;
    }

    if (this.totalQuestionsPerSession === 5) {
      document.getElementById('count-5').checked = true;
    } else if (this.totalQuestionsPerSession === 15) {
      document.getElementById('count-15').checked = true;
    } else {
      document.getElementById('count-10').checked = true;
    }

    document.getElementById('toggle-relay-mode').checked = this.isRelayMode;
  }

  saveTeacherSettings() {
    this.sound.playClick();
    const rangeVal = document.querySelector('input[name="num-range"]:checked').value;
    const countVal = document.querySelector('input[name="q-count"]:checked').value;
    const relayVal = document.getElementById('toggle-relay-mode').checked;

    this.maxNumberRange = parseInt(rangeVal, 10);
    this.totalQuestionsPerSession = parseInt(countVal, 10);
    this.isRelayMode = relayVal;

    this.saveStorage();
    this.setupExploreGrid();
    this.toggleTeacherModal(false);
  }

  resetSavedData() {
    if (confirm('Apakah Ibu/Bapak Guru yakin ingin mereset total bintang dan rekor skor?')) {
      this.totalStars = 0;
      this.highScore = 0;
      this.saveStorage();
      this.updateHomeStats();
      alert('Data rekor berhasil direset.');
    }
  }

  /* -------------------------------
     CONFETTI PARTICLE SYSTEM
  --------------------------------- */
  initConfetti() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];

    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  triggerConfetti() {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 15,
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        dRot: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (!this.animatingConfetti) {
      this.animatingConfetti = true;
      this.runConfettiLoop();
    }
  }

  runConfettiLoop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.dRot;
      p.opacity -= 0.015;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.runConfettiLoop());
    } else {
      this.animatingConfetti = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA ServiceWorker siap:', reg.scope))
      .catch(err => console.log('SW registrasi gagal:', err));
  });
}

// Global App Instance
let gameApp;
window.addEventListener('DOMContentLoaded', () => {
  gameApp = new GameApp();
});
