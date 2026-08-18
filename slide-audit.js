/**
 * slide-audit.js — 內容溢出偵測器
 *
 * 檢查每個 .slide-frame：框內任何元素是否超出安全框邊界。
 * 回傳每頁的溢出量（px / 換算成 cqw），讓人或 AI 套版流程知道「哪幾頁爆框、爆多少」。
 *
 * 用法：
 *   1) 瀏覽器 console：auditSlides()  → 印出表格
 *   2) headless：頁面 load 後讀 document.title（已是 JSON）
 *
 * 設計重點：所有 .slide 即使沒 .active（opacity:0）仍然有版面，
 *   所以一次 load 就能稽核全部頁面，不必逐頁切換。
 */
(function () {
  function rectOf(el) { return el.getBoundingClientRect(); }

  window.auditSlides = function auditSlides(tolerancePx) {
    const tol = tolerancePx == null ? 1 : tolerancePx;
    const slides = Array.from(document.querySelectorAll('.slide'));
    const results = [];

    document.querySelectorAll('.slide-frame').forEach(function (frame) {
      const fr = rectOf(frame);
      const slide = frame.closest('.slide');
      const idx = slides.indexOf(slide) + 1;
      let overTop = 0, overBottom = 0, overLeft = 0, overRight = 0;

      frame.querySelectorAll('*').forEach(function (el) {
        const r = rectOf(el);
        if (r.width === 0 && r.height === 0) return;        // 跳過不可見元素
        if (getComputedStyle(el).position === 'fixed') return;
        overTop    = Math.max(overTop,    fr.top    - r.top);
        overBottom = Math.max(overBottom, r.bottom  - fr.bottom);
        overLeft   = Math.max(overLeft,   fr.left   - r.left);
        overRight  = Math.max(overRight,  r.right   - fr.right);
      });

      // 1cqw = 1% of frame... 用 slide 寬換算成 cqw 比較直覺
      const slideW = rectOf(slide).width || 1;
      const toCqw = function (px) { return Math.round(px / slideW * 1000) / 10; };
      const worst = Math.max(overTop, overBottom, overLeft, overRight);

      results.push({
        slide: idx,
        overflow: worst > tol,
        bottomPx: Math.round(Math.max(0, overBottom)),
        rightPx:  Math.round(Math.max(0, overRight)),
        topPx:    Math.round(Math.max(0, overTop)),
        leftPx:   Math.round(Math.max(0, overLeft)),
        worstCqw: toCqw(Math.max(0, worst)),
      });
    });

    // headless 取用：把結果塞進 title
    try { document.title = JSON.stringify(results); } catch (e) {}

    // console 友善輸出
    if (typeof console !== 'undefined' && console.table) {
      const bad = results.filter(function (r) { return r.overflow; });
      console.log(bad.length ? ('⚠️ ' + bad.length + ' 頁溢出') : '✅ 全部收在安全框內');
      console.table(results);
    }
    return results;
  };

  // headless：load 後自動跑一次（給 --dump-dom 讀 title）
  window.addEventListener('load', function () {
    setTimeout(function () { window.auditSlides(); }, 50);
  });
})();
