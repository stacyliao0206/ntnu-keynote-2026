/**
 * Numeracy Lab — Slide Presenter（自適應版）
 * 翻頁：←/→、空白、PageUp/Down、Home/End、點畫面左1/3 或右2/3、觸控左右滑。
 * 規劃模式（按 P）：投影片維持 16:9 置頂，規劃面板「往下展開」接在下方，往下捲才看完。
 *   面板內＝該頁對應的完整逐字原文（也就是上台念的稿）＋小設計條。
 *   原文存在每頁的 <aside class="plan-note">（永遠隱藏），由本檔複製進 #plan-panel。
 *   列印（出 PDF）時規劃層自動隱藏（見 base.css @media print）。
 * 總覽模式（按 O）：全部頁面縮圖格狀排列，點哪頁跳哪頁；Esc 或再按 O 關閉。
 * 安全線（按 g）：切換 .slide-frame 安全框紅虛線（驗收內容有無爆框）。
 * 動態開關（按 M）：一鍵關掉／打開所有進場動畫（在 <html> 加 .no-motion）。
 *   設定記在 localStorage，同一台電腦下次開任何一份簡報都沿用。
 *   若系統開了「減少動態效果」，預設就是關閉。
 */
(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!slides.length) return;
  const deck = document.querySelector('.deck');

  let current = 0;

  // Progress indicator
  const progress = document.createElement('div');
  progress.className = 'progress';
  document.body.appendChild(progress);

  // Mode hint（右上角小藥丸）
  const hint = document.createElement('div');
  hint.className = 'mode-hint';
  document.body.appendChild(hint);

  // 規劃面板（接在 .deck 之後，往下展開）
  const planPanel = document.createElement('div');
  planPanel.id = 'plan-panel';
  document.body.appendChild(planPanel);

  // 總覽層（按 O）
  const overview = document.createElement('div');
  overview.id = 'overview';
  overview.style.cssText = 'position:fixed;inset:0;background:rgba(0,75,36,.97);z-index:800;display:none;overflow-y:auto;padding:2vw;box-sizing:border-box;';
  document.body.appendChild(overview);

  function planOn() { return document.body.classList.contains('mode-plan'); }
  function overviewOn() { return overview.style.display !== 'none'; }

  // 動態開關（按 M）
  const MOTION_KEY = 'nl-deck-motion';
  function motionOff() { return document.documentElement.classList.contains('no-motion'); }
  function applyMotion(off) {
    document.documentElement.classList.toggle('no-motion', off);
    try { localStorage.setItem(MOTION_KEY, off ? 'off' : 'on'); } catch (e) {}
    updateHint();
  }
  function toggleMotion() { applyMotion(!motionOff()); }

  function updateHint() {
    hint.textContent = planOn()
      ? '規劃模式 · 按 P 收起'
      : '簡報模式 · P 規劃 · O 總覽 · g 安全線 · M 動態：' + (motionOff() ? '關' : '開');
  }

  function updatePlan() {
    const note = slides[current].querySelector('.plan-note');
    planPanel.innerHTML = note
      ? note.innerHTML
      : '<div class="plan-note__source"><b>對應原文</b>（此頁無規劃資料）</div>';
  }

  function show(index) {
    if (index < 0 || index >= slides.length) return;
    slides[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    progress.textContent = `${current + 1} / ${slides.length}`;
    window.location.hash = current + 1;
    updatePlan();
    if (planOn()) window.scrollTo(0, 0);   // 換頁時回到投影片頂端
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function togglePlan() {
    const on = !planOn();
    document.body.classList.toggle('mode-plan', on);
    document.documentElement.classList.toggle('mode-plan', on);
    updateHint();
    window.scrollTo(0, 0);
  }

  // --- 總覽：每次開啟時 clone 所有 slide 成縮圖（靜態快照），點擊跳頁 ---
  // 自適應版要點：.slide 用 container-query 單位（cqw），縮圖必須先把 clone 放進一個
  // 「100vw 寬、16:9」的 stage（讓 1cqw 重新等於 1vw，比例與真實舞台一致），再用
  // transform:scale() 把整個 stage 縮到 cell 大小。clone 不加 .active（避免觸發
  // body:has() 底色延伸 / 影響真實頁），改用 inline opacity:1 顯示。
  const OV_COLS = 4;
  const STAGE_W = 100;                       // vw：縮圖內部參考舞台寬（= 16:9 螢幕的舞台寬）
  function buildOverview() {
    overview.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${OV_COLS},1fr);gap:1.2vw;`;
    slides.forEach((s, i) => {
      const cellW = 100 / OV_COLS - 1.5;     // vw
      const cellH = cellW * 9 / 16;
      const factor = cellW / STAGE_W;
      const cell = document.createElement('div');
      cell.style.cssText = `position:relative;width:${cellW}vw;height:${cellH}vw;overflow:hidden;border-radius:.4vw;cursor:pointer;outline:${i === current ? '.25vw solid #E8FF3A' : '1px solid rgba(255,255,255,.25)'};background:#fff;`;
      const stage = document.createElement('div');
      stage.style.cssText = `position:absolute;top:0;left:0;width:${STAGE_W}vw;aspect-ratio:16/9;background:#fff;overflow:hidden;container-type:inline-size;transform:scale(${factor});transform-origin:top left;`;
      const clone = s.cloneNode(true);
      clone.classList.remove('active');   // 縮圖不可帶 active，否則觸發 body:has() 底色延伸、卡住整頁底色
      clone.style.cssText += ';opacity:1;pointer-events:none;transition:none;';
      stage.appendChild(clone);
      const tag = document.createElement('div');
      tag.textContent = i + 1;
      tag.style.cssText = 'position:absolute;right:.4vw;bottom:.3vw;z-index:5;font:700 .9vw "Noto Sans TC",sans-serif;color:#fff;background:rgba(0,75,36,.85);border-radius:.3vw;padding:.05vw .45vw;';
      cell.appendChild(stage);
      cell.appendChild(tag);
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleOverview(false);
        show(i);
      });
      grid.appendChild(cell);
    });
    overview.appendChild(grid);
  }
  function toggleOverview(force) {
    const on = force !== undefined ? force : !overviewOn();
    if (on) buildOverview();
    overview.style.display = on ? 'block' : 'none';
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overviewOn()) { e.preventDefault(); toggleOverview(false); return; }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      show(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      show(slides.length - 1);
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePlan();
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      toggleOverview();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      if (deck) deck.classList.toggle('safe-guides');   // 切換內容安全區輔助線
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMotion();                                   // 切換進場動畫
    }
  });

  // Click 翻頁（左 1/3 上一頁、右 2/3 下一頁）。規劃/總覽模式停用點擊翻頁。
  document.addEventListener('click', function (e) {
    if (planOn() || overviewOn()) return;
    if (e.target.closest('a, button, input, textarea, #plan-panel, .plan-note')) return;
    if (e.clientX < window.innerWidth / 3) { prev(); } else { next(); }
  });

  // Touch swipe（規劃/總覽模式停用，讓使用者正常上下捲）
  let touchStartX = 0;
  document.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  });
  document.addEventListener('touchend', function (e) {
    if (planOn() || overviewOn()) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
  });

  // Init: 動態開關（記住的設定 > 系統「減少動態效果」偏好）
  let motionStored = null;
  try { motionStored = localStorage.getItem(MOTION_KEY); } catch (e) {}
  const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('no-motion', motionStored ? motionStored === 'off' : !!prefersReduce);

  // Init: check hash or start at slide 1
  const hash = parseInt(window.location.hash.slice(1), 10);
  show(hash > 0 && hash <= slides.length ? hash - 1 : 0);
  updatePlan();
  updateHint();
})();
