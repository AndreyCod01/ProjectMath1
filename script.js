/* =============================  script.js  ==============================
   Глобальная логика игры + ЛИЧНЫЙ КАБИНЕТ
   • Хранение ника и лучших результатов в localStorage
   • Показ в модальном окне
   • Обновление после игры
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
  /* --- 1. Определяем страницу --- */
  const isMainPage   = typeof level === 'undefined';
  const currentLevel = isMainPage ? null : level;

  /* --- 2. Настройки --- */
  const config = {
    easy: { minNum: 1, maxNum: 10, numOperands: 2, operations: ['+', '-'] },
    hard: { minNum: 10, maxNum: 99, numOperands: 3, operations: ['+', '-'] }
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getRandomDivisor(n) {
    const divs = [];
    for (let d = 2; d <= 10; d++) if (n % d === 0) divs.push(d);
    return divs.length ? divs[randInt(0, divs.length - 1)] : 1;
  }

  function generateMediumQuestion() {
    const a = randInt(10, 99), b = randInt(10, 99);
    const op = Math.random() < 0.5 ? '+' : '-';
    const mul = randInt(2, 5);
    const first = op === '+' ? a + b : a - b;
    const product = first * mul;
    const useMul = Math.random() < 0.5;

    if (useMul) {
      return { expr: `(${a} ${op} ${b}) × ${mul}`, exprForEval: `(${a}${op}${b}) * ${mul}`, answer: product };
    } else {
      const div = getRandomDivisor(product);
      return {
        expr: `(${a} ${op} ${b}) × ${mul} ÷ ${div}`,
        exprForEval: `(${a}${op}${b}) * ${mul} / ${div}`,
        answer: product / div
      };
    }
  }

  function generateNewMediumQuestion() {
    const operations = ['*', '/'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let a = randInt(-99, 99), b = 0;
    while (b === 0) b = randInt(-10, 10);

    if (op === '*') {
      return { expr: `${a} × ${b}`, exprForEval: `${a} * ${b}`, answer: a * b };
    } else {
      const quotient = randInt(-20, 20);
      b = randInt(-10, 10);
      while (b === 0) b = randInt(-10, 10);
      a = quotient * b;
      return { expr: `${a} ÷ ${b}`, exprForEval: `${a} / ${b}`, answer: quotient };
    }
  }

  /* --- 3. Глобальные переменные --- */
  let timerInterval;
  let seconds = 0, tenthsOfSecond = 0;
  let currentQuestion = '', currentQuestionForEval = '', correctAnswer = 0;
  let generatedQuestions = [];

  /* --- 4. DOM --- */
  const startBtn      = document.getElementById('start-btn');
  const questionArea  = document.getElementById('question-area');
  const answerArea    = document.getElementById('answer-area');
  const messageArea   = document.getElementById('message-area');
  const timerSpan     = document.getElementById('timer');
  const timeResultDiv = document.getElementById('time-result');
  const profileBtn    = document.querySelector('.profile-btn');
  const profileModal  = document.getElementById('profile-modal');
  const closeProfile  = document.querySelector('[data-close-profile]');
  const profileNick   = document.getElementById('profile-nick');
  const bestEasy      = document.getElementById('best-easy');
  const bestMedium    = document.getElementById('best-medium');
  const bestHard      = document.getElementById('best-hard');

  /* --- 5. localStorage: инициализация --- */
  function initProfile() {
    let data = JSON.parse(localStorage.getItem('arithmeticProfile'));
    if (!data) {
      data = { nickname: '', bestTimes: { easy: null, medium: null, hard: null } };
      localStorage.setItem('arithmeticProfile', JSON.stringify(data));
    }
    return data;
  }

  function saveProfile(data) {
    localStorage.setItem('arithmeticProfile', JSON.stringify(data));
  }

  function setNickname() {
    let data = initProfile();
    if (!data.nickname) {
      const nick = prompt('Введите ваш ник:', 'Игрок');
      data.nickname = nick.trim() || 'Игрок';
      saveProfile(data);
    }
    return data;
  }

  function showProfile() {
    const data = initProfile();
    profileNick.textContent = data.nickname || 'Игрок';
    bestEasy.textContent    = data.bestTimes.easy    ? data.bestTimes.easy.toFixed(1) + ' с' : '—';
    bestMedium.textContent  = data.bestTimes.medium  ? data.bestTimes.medium.toFixed(1) + ' с' : '—';
    bestHard.textContent    = data.bestTimes.hard    ? data.bestTimes.hard.toFixed(1) + ' с' : '—';
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function updateBestTime(level, time) {
    const data = initProfile();
    if (!data.bestTimes[level] || time < data.bestTimes[level]) {
      data.bestTimes[level] = time;
      saveProfile(data);
    }
  }

  /* --- 6. Обработчики --- */
  if (isMainPage) {
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => btn.addEventListener('click', () => {
      const lvl = btn.getAttribute('data-level');
      window.location.href = `${lvl}.html`;
    }));
  } else {
    if (startBtn) startBtn.addEventListener('click', startGame);
  }

  // Кнопка профиля
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      setNickname();
      showProfile();
    });
  }
  if (closeProfile) {
    closeProfile.addEventListener('click', () => {
      profileModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && profileModal.classList.contains('active')) {
      profileModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  /* --- 7. Игра --- */
  function startGame() {
    resetGame();
    startTimer();
    generateAndDisplayQuestion();
    startBtn.style.display = 'none';

    if (answerArea) {
      answerArea.innerHTML = `
        <input type="number" id="answer-input" placeholder="Ваш ответ">
        <button class="check-btn" id="check-btn">Проверить</button>
      `;
      const chkBtn = document.getElementById('check-btn');
      const inp = document.getElementById('answer-input');
      chkBtn.addEventListener('click', checkAnswer);
      inp.addEventListener('keypress', e => e.key === 'Enter' && checkAnswer());
    }
    if (timeResultDiv) timeResultDiv.classList.remove('visible');
  }

  function resetGame() {
    clearInterval(timerInterval);
    seconds = 0; tenthsOfSecond = 0;
    if (timerSpan) timerSpan.textContent = formatTime(seconds, tenthsOfSecond);
    if (questionArea) questionArea.textContent = '';
    if (messageArea) {
      messageArea.textContent = '';
      messageArea.className = 'message-area';
    }
    generatedQuestions = [];
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      tenthsOfSecond += 1;
      if (tenthsOfSecond >= 10) { seconds++; tenthsOfSecond -= 10; }
      if (timerSpan) timerSpan.textContent = formatTime(seconds, tenthsOfSecond);
    }, 100);
  }

  function stopTimer() { clearInterval(timerInterval); }

  function formatTime(s, t) { return `${s}.${t}`; }

  function generateAndDisplayQuestion() {
    if (currentLevel === 'hard') {
      const { expr, exprForEval, answer } = generateMediumQuestion();
      currentQuestion = expr;
      currentQuestionForEval = exprForEval;
      correctAnswer = answer;
      if (questionArea) questionArea.textContent = currentQuestion;
    } else if (currentLevel === 'medium') {
      const { expr, exprForEval, answer } = generateNewMediumQuestion();
      currentQuestion = expr;
      currentQuestionForEval = exprForEval;
      correctAnswer = answer;
      if (questionArea) questionArea.textContent = currentQuestion;
    } else {
      const cfg = config[currentLevel];
      const ops = Array.from({ length: cfg.numOperands - 1 }, () => cfg.operations[randInt(0, cfg.operations.length - 1)]);
      const nums = Array.from({ length: cfg.numOperands }, () => randInt(cfg.minNum, cfg.maxNum));
      currentQuestion = nums[0] + ops.map((op, i) => ` ${op} ${nums[i + 1]}`).join('');
      if (questionArea) questionArea.textContent = currentQuestion;
      try { correctAnswer = eval(currentQuestion); } catch { generateAndDisplayQuestion(); }
    }
  }

  function checkAnswer() {
    const inp = document.getElementById('answer-input');
    const entered = parseInt(inp.value, 10);
    if (isNaN(entered)) {
      showMessage('Введите число!', 'incorrect');
      return;
    }

    stopTimer();
    document.getElementById('check-btn').disabled = true;
    inp.disabled = true;

    if (['medium', 'hard'].includes(currentLevel)) {
      correctAnswer = eval(currentQuestionForEval);
    }

    const correct = Math.abs(entered - correctAnswer) < 1e-9;
    showMessage(correct ? 'Молодец! Давай ещё?' : `Неправильно. Ответ: ${correctAnswer}`, correct ? 'correct' : 'incorrect');

    const totalTime = seconds + tenthsOfSecond / 10;
    if (timeResultDiv) {
      timeResultDiv.textContent = `Время: ${totalTime.toFixed(1)} с`;
      timeResultDiv.classList.add('visible');
    }

    if (correct && currentLevel) {
      updateBestTime(currentLevel, totalTime);
    }

    if (startBtn) {
      startBtn.textContent = 'Следующий пример';
      startBtn.style.display = 'block';
      startBtn.removeEventListener('click', startGame);
      startBtn.addEventListener('click', startGame);
    }
  }

  function showMessage(msg, type) {
    if (messageArea) {
      messageArea.textContent = msg;
      messageArea.className = `message-area ${type}`;
    }
  }
});