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

      function glyph() {
        btn.textContent = isDark() ? '☀' : '☾';
        btn.setAttribute('aria-label', isDark() ? '切换到浅色模式' : '切换到深色模式');
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
    }
  });
})();
