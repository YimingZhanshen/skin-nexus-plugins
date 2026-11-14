/* ============================================================
   晴空琉璃 Azure Glass — theme.js
   BY YMZS (YimingZhanshen) · AGPL-3.0
   职责：① 明暗模式（localStorage 记忆 + 跟随系统默认）
         ② 浮动切换按钮（DOMContentLoaded 后创建）
         ③ 入场动画打标 html.azg-anim（尊重系统减少动效）
   时机：主题 JS 在 <head> 同步执行——①在首屏绘制前生效，无闪白。
   零外部依赖（无 CDN、无网络请求）。
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'azg-mode';
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function isDark() {
    return root.classList.contains('azg-dark');
  }

  function setMeta(dark) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta && document.head) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', dark ? '#080f1e' : '#2b5fe8');
  }

  function apply(dark) {
    root.classList.toggle('azg-dark', dark);
    setMeta(dark);
  }

  /* ── 1. 首屏前定调：显式偏好 > 跟随系统 > 默认浅色（晴空） ── */
  var pref = stored();
  if (pref === 'dark' || pref === 'light') {
    apply(pref === 'dark');
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    apply(true);
  }

  /* ── 2/3. DOM 就绪后：浮动按钮 + 动画打标 ── */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    if (!document.getElementById('azg-toggle') && document.body) {
      var btn = document.createElement('button');
      btn.id = 'azg-toggle';
      btn.type = 'button';
      btn.title = '切换深色/浅色模式';

      /* 图标是 20px、1.5 描边的线稿（原先是 ☀ / ☾ 两个字符：字号、基线、
         跨平台字形都不受控）。语义由 aria-label 给，SVG 对辅助技术隐藏。
         两段常量字符串，无外部输入，不存在注入面。 */
      var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"'
        + ' stroke-width="1.5" stroke-linecap="round" aria-hidden="true"'
        + '><circle cx="12" cy="12" r="4.2"/>'
        + '<path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>'
        + '</svg>';
      var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"'
        + ' stroke-width="1.5" stroke-linecap="round" aria-hidden="true"'
        + '><path d="M20.2 14.6A8.6 8.6 0 1 1 9.4 3.8a6.9 6.9 0 0 0 10.8 10.8Z"/></svg>';

      function glyph() {
        var dark = isDark();
        btn.innerHTML = dark ? SUN : MOON;
        btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      }

      btn.addEventListener('click', function () {
        var next = !isDark();
        apply(next);
        try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch (e) {}
        glyph();
      });

      document.body.appendChild(btn);
      glyph();
    }

    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('azg-anim');

      /* 统计数字缓起：进视口跑一次 0 → 目标（800ms ease-out 近似，rAF 步进）。
         不支持 IO 或解析失败就保持服务端终值，渐进增强。 */
      var nums = document.querySelectorAll('.stats b');
      if (window.IntersectionObserver && nums.length) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            var el = en.target, target = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10);
            if (!isFinite(target) || target <= 0) return;
            var t0 = performance.now();
            (function step(now) {
              var k = Math.min(1, (now - t0) / 800);
              el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
              if (k < 1) requestAnimationFrame(step);
            })(t0);
          });
        }, { threshold: 0.4 });
        Array.prototype.forEach.call(nums, function (n) { io.observe(n); });
      }

      /* 山峦视差：滚动进度写在 SVG 自己身上（--az-shift 0..1），
         只让山体两层重算，不碰全局。rAF 节流，passive 监听。 */
      var scene = document.querySelector('.scene-mountains');
      if (scene) {
        var ticking = false;
        window.addEventListener('scroll', function () {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(function () {
            scene.style.setProperty('--az-shift', String(Math.min(1, window.scrollY / 640)));
            ticking = false;
          });
        }, { passive: true });
      }
    }
  });
})();
