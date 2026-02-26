/**
 * GeoConsent v2 — умная всплывашка куки-согласия
 * ─────────────────────────────────────────────────
 * Конфигурация через window.GeoConsentConfig ДО загрузки скрипта:
 *
 *   window.GeoConsentConfig = {
 *     autoHide:    false,           // false | true (8s) | число в мс
 *     theme:       'dark',          // 'dark' | 'light'
 *     accentColor: '#c8f135',       // любой CSS-цвет
 *     position:    'bottom-right',  // 'bottom-right' | 'bottom-left' | 'bottom-center'
 *     privacyUrl:  '/privacy',      // URL политики конфиденциальности
 *     messages: {                   // переопределение текстов по регионам
 *       ru: { title, message, btnAccept, btnDecline }
 *     }
 *   };
 *
 * Публичное API:
 *   GeoConsent.show(region)      — показать баннер
 *   GeoConsent.reset()           — сбросить сохранённый ответ
 *   GeoConsent.getAnswer()       — получить ответ { choice, ts }
 *   GeoConsent.detectRegion()    — Promise<string>
 *   GeoConsent.configure(opts)   — обновить конфиг в рантайме
 */

(function (window, document) {
  "use strict";

  /* ─── DEFAULTS ────────────────────────────────────────────────── */
  var DEFAULTS = {
    autoHide:    null,           // null = per-region default
    theme:       'dark',
    accentColor: '#c8f135',
    position:    'bottom-right',
    privacyUrl:  '/privacy',
    messages:    {}
  };

  /* ─── MERGE USER CONFIG ───────────────────────────────────────── */
  var cfg = (function () {
    var base = {};
    for (var k in DEFAULTS) base[k] = DEFAULTS[k];
    var user = window.GeoConsentConfig || {};
    for (var k in user) base[k] = user[k];
    base.messages = base.messages || {};
    return base;
  })();

  /* ─── REGION MESSAGES ─────────────────────────────────────────── */
  var BASE_MESSAGES = {
    ru: {
      title:      'Файлы cookie',
      message:    'Сайт использует файлы cookie для корректной работы и улучшения сервиса. Подробности — в <a href="{privacyUrl}" target="_blank">пользовательском соглашении</a>.',
      btnAccept:  'Принять',
      btnDecline: null,
      autoHide:   8000,
      badge:      null,
      detail:     null,
    },
    eu: {
      title:      'Управление куки (GDPR)',
      message:    'Мы используем файлы cookie для обеспечения работы сайта, анализа трафика и персонализации контента.',
      detail:     'По Регламенту ЕС 2016/679 (GDPR) вы вправе отозвать согласие через <a href="{privacyUrl}" target="_blank">политику конфиденциальности</a>.',
      btnAccept:  'Принять все',
      btnDecline: 'Только необходимые',
      autoHide:   null,
      badge:      'GDPR',
    },
    us: {
      title:      'Cookie Notice',
      message:    'We use cookies to enhance your experience and analyze traffic. See our <a href="{privacyUrl}" target="_blank">Privacy Policy</a> for details.',
      btnAccept:  'Got it',
      btnDecline: 'Do Not Sell My Info',
      autoHide:   null,
      badge:      'CCPA',
      detail:     null,
    },
    cn: {
      title:      'Cookie 通知',
      message:    '本网站使用 Cookie 改善体验。继续使用即表示同意我们的<a href="{privacyUrl}" target="_blank">隐私政策</a>。',
      btnAccept:  '接受',
      btnDecline: null,
      autoHide:   8000,
      badge:      null,
      detail:     null,
    },
    'default': {
      title:      'Cookie Policy',
      message:    'This site uses cookies to improve your experience. <a href="{privacyUrl}" target="_blank">Learn more</a>.',
      btnAccept:  'Accept',
      btnDecline: 'Decline',
      autoHide:   null,
      badge:      null,
      detail:     null,
    }
  };

  function getMessages(region) {
    var base = BASE_MESSAGES[region] || BASE_MESSAGES['default'];
    var override = cfg.messages[region] || {};
    var result = {};
    for (var k in base) result[k] = base[k];
    for (var k in override) result[k] = override[k];
    // interpolate privacyUrl
    ['message', 'detail'].forEach(function(f) {
      if (result[f]) result[f] = result[f].replace(/\{privacyUrl\}/g, cfg.privacyUrl);
    });
    return result;
  }

  /* ─── TIMEZONE → REGION ───────────────────────────────────────── */
  var TZ_MAP = {
    'Europe/Moscow':'ru','Europe/Kaliningrad':'ru','Europe/Samara':'ru',
    'Asia/Yekaterinburg':'ru','Asia/Omsk':'ru','Asia/Krasnoyarsk':'ru',
    'Asia/Irkutsk':'ru','Asia/Yakutsk':'ru','Asia/Vladivostok':'ru',
    'Asia/Magadan':'ru','Asia/Sakhalin':'ru','Asia/Kamchatka':'ru',
    'Asia/Anadyr':'ru','Europe/Minsk':'ru',
    'Asia/Almaty':'ru','Asia/Qyzylorda':'ru',
    'Asia/Tashkent':'ru','Asia/Samarkand':'ru',
    'Asia/Yerevan':'ru','Asia/Baku':'ru','Asia/Tbilisi':'ru',
    'Asia/Bishkek':'ru','Asia/Dushanbe':'ru','Asia/Ashgabat':'ru',
    'Europe/Chisinau':'ru','Europe/Kiev':'ru','Europe/Kyiv':'ru',
    'Asia/Shanghai':'cn','Asia/Urumqi':'cn',
    'America/New_York':'us','America/Chicago':'us','America/Denver':'us',
    'America/Los_Angeles':'us','America/Phoenix':'us','America/Anchorage':'us',
    'America/Honolulu':'us','America/Toronto':'us','America/Vancouver':'us',
    'America/Winnipeg':'us','America/Halifax':'us','America/St_Johns':'us',
    'America/Edmonton':'us',
    'Europe/London':'eu','Europe/Dublin':'eu','Europe/Paris':'eu',
    'Europe/Berlin':'eu','Europe/Rome':'eu','Europe/Madrid':'eu',
    'Europe/Amsterdam':'eu','Europe/Brussels':'eu','Europe/Vienna':'eu',
    'Europe/Warsaw':'eu','Europe/Prague':'eu','Europe/Budapest':'eu',
    'Europe/Bucharest':'eu','Europe/Sofia':'eu','Europe/Zagreb':'eu',
    'Europe/Ljubljana':'eu','Europe/Bratislava':'eu','Europe/Tallinn':'eu',
    'Europe/Riga':'eu','Europe/Vilnius':'eu','Europe/Helsinki':'eu',
    'Europe/Stockholm':'eu','Europe/Copenhagen':'eu','Europe/Oslo':'eu',
    'Europe/Athens':'eu','Europe/Lisbon':'eu','Europe/Nicosia':'eu',
    'Europe/Luxembourg':'eu','Europe/Malta':'eu','Europe/Zurich':'eu',
    'Atlantic/Reykjavik':'eu',
  };

  var EU = {AT:1,BE:1,BG:1,HR:1,CY:1,CZ:1,DK:1,EE:1,FI:1,FR:1,DE:1,
    GR:1,HU:1,IE:1,IT:1,LV:1,LT:1,LU:1,MT:1,NL:1,PL:1,PT:1,RO:1,
    SK:1,SI:1,ES:1,SE:1,IS:1,LI:1,NO:1,GB:1};
  var RU = {RU:1,BY:1,KZ:1,UA:1,UZ:1,AM:1,AZ:1,GE:1,KG:1,MD:1,TJ:1,TM:1};

  function detectRegion() {
    return new Promise(function(resolve) {
      fetch('https://ipapi.co/json/', {cache:'force-cache'})
        .then(function(r){ return r.json(); })
        .then(function(d){
          var cc = (d.country_code||'').toUpperCase();
          if (RU[cc]) return resolve('ru');
          if (EU[cc]) return resolve('eu');
          if (cc==='US'||cc==='CA') return resolve('us');
          if (cc==='CN') return resolve('cn');
          resolve('default');
        })
        .catch(function(){
          try {
            var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            resolve(TZ_MAP[tz] || 'default');
          } catch(_){ resolve('default'); }
        });
    });
  }

  /* ─── COLOR UTILS ─────────────────────────────────────────────── */
  function hexToRgb(hex) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var n = parseInt(hex, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  function luminance(hex) {
    try {
      var rgb = hexToRgb(hex);
      var [r,g,b] = rgb.map(function(c){
        c /= 255;
        return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
      });
      return 0.2126*r + 0.7152*g + 0.0722*b;
    } catch(_){ return 1; }
  }
  function accentTextColor(accentHex) {
    return luminance(accentHex) > 0.35 ? '#0f0f0f' : '#ffffff';
  }
  function darken(hex, amount) {
    try {
      var [r,g,b] = hexToRgb(hex);
      r = Math.max(0, r - amount); g = Math.max(0, g - amount); b = Math.max(0, b - amount);
      return '#' + [r,g,b].map(function(c){ return ('0'+c.toString(16)).slice(-2); }).join('');
    } catch(_){ return hex; }
  }
  function alphaColor(hex, alpha) {
    try {
      var [r,g,b] = hexToRgb(hex);
      return 'rgba('+r+','+g+','+b+','+alpha+')';
    } catch(_){ return hex; }
  }

  /* ─── THEME VARS ──────────────────────────────────────────────── */
  function buildThemeVars(theme, accent) {
    var dark = theme === 'dark';
    var accentText = accentTextColor(accent);
    var accentDark = darken(accent, 20);
    var accentAlpha10 = alphaColor(accent, 0.10);
    var accentAlpha20 = alphaColor(accent, 0.20);
    var accentAlpha30 = alphaColor(accent, 0.30);
    return [
      '--gc-accent:' + accent,
      '--gc-accent-dark:' + accentDark,
      '--gc-accent-text:' + accentText,
      '--gc-accent-a10:' + accentAlpha10,
      '--gc-accent-a20:' + accentAlpha20,
      '--gc-accent-a30:' + accentAlpha30,
      dark ? '--gc-surface:#1a1a1a'    : '--gc-surface:#ffffff',
      dark ? '--gc-border:rgba(255,255,255,0.08)' : '--gc-border:rgba(0,0,0,0.09)',
      dark ? '--gc-text:#e8e8e8'       : '--gc-text:#111111',
      dark ? '--gc-muted:#888'         : '--gc-muted:#666',
      dark ? '--gc-detail-bg:rgba(255,255,255,0.03)' : '--gc-detail-bg:rgba(0,0,0,0.03)',
      dark ? '--gc-btn2-bg:rgba(255,255,255,0.05)'   : '--gc-btn2-bg:rgba(0,0,0,0.05)',
      dark ? '--gc-btn2-hover:rgba(255,255,255,0.09)': '--gc-btn2-hover:rgba(0,0,0,0.08)',
      dark ? '--gc-shadow:0 24px 64px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05)'
           : '--gc-shadow:0 12px 48px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.07)',
    ].join(';');
  }

  /* ─── POSITION STYLES ─────────────────────────────────────────── */
  var POSITION_STYLES = {
    'bottom-right':  'bottom:24px;right:24px;left:auto',
    'bottom-left':   'bottom:24px;left:24px;right:auto',
    'bottom-center': 'bottom:24px;left:50%;transform:translateX(-50%)',
  };
  var POSITION_STYLES_VISIBLE = {
    'bottom-right':  'transform:translateY(0) scale(1)',
    'bottom-left':   'transform:translateY(0) scale(1)',
    'bottom-center': 'transform:translateX(-50%) translateY(0) scale(1)',
  };
  var POSITION_STYLES_INIT = {
    'bottom-right':  'transform:translateY(16px) scale(0.97)',
    'bottom-left':   'transform:translateY(16px) scale(0.97)',
    'bottom-center': 'transform:translateX(-50%) translateY(16px) scale(0.97)',
  };

  /* ─── STORAGE ─────────────────────────────────────────────────── */
  var STORAGE_KEY = 'geoconsent_v2';

  function isAnswered() {
    try { return !!localStorage.getItem(STORAGE_KEY); }
    catch(_){ return document.cookie.indexOf(STORAGE_KEY+'=') !== -1; }
  }
  function markAnswered(choice) {
    var val = JSON.stringify({choice:choice, ts:Date.now()});
    try { localStorage.setItem(STORAGE_KEY, val); }
    catch(_){ document.cookie = STORAGE_KEY+'='+encodeURIComponent(val)+'; max-age=31536000; path=/; SameSite=Lax'; }
    window.dispatchEvent(new CustomEvent('geoconsent:answer', {detail:{choice:choice}}));
  }

  /* ─── STYLES ──────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('gc-style')) return;
    var s = document.createElement('style');
    s.id = 'gc-style';
    s.textContent = "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');"
    + "#gc-root{"
      + "font-family:'DM Sans',system-ui,sans-serif;"
      + "position:fixed;z-index:2147483647;"
      + "max-width:380px;width:calc(100vw - 48px);"
      + "pointer-events:none;opacity:0;"
      + "transition:opacity .4s cubic-bezier(.16,1,.3,1),transform .4s cubic-bezier(.16,1,.3,1);"
    + "}"
    + "#gc-root.gc-on{pointer-events:all;opacity:1}"
    + "#gc-root.gc-hide{opacity:0;transition:opacity .3s ease,transform .3s ease;pointer-events:none}"
    + ".gc-card{"
      + "background:var(--gc-surface);border:1px solid var(--gc-border);"
      + "border-radius:16px;padding:20px;"
      + "box-shadow:var(--gc-shadow);backdrop-filter:blur(12px);"
      + "position:relative;overflow:hidden;"
    + "}"
    + ".gc-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}"
    + ".gc-ico{width:32px;height:32px;background:var(--gc-accent);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}"
    + ".gc-ico svg{width:16px;height:16px}"
    + ".gc-ttl{font-size:14px;font-weight:600;color:var(--gc-text);letter-spacing:-.01em;line-height:1.2}"
    + ".gc-badge{margin-left:auto;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;"
      + "color:var(--gc-accent);background:var(--gc-accent-a10);padding:2px 7px;border-radius:20px;"
      + "border:1px solid var(--gc-accent-a20);flex-shrink:0}"
    + ".gc-msg{font-size:13px;line-height:1.6;color:var(--gc-muted);margin-bottom:10px}"
    + ".gc-msg a{color:var(--gc-accent);text-decoration:none;border-bottom:1px solid var(--gc-accent-a30);transition:border-color .2s}"
    + ".gc-msg a:hover{border-color:var(--gc-accent)}"
    + ".gc-detail{font-size:11.5px;line-height:1.5;color:var(--gc-muted);opacity:.7;margin-bottom:10px;padding:10px 12px;"
      + "background:var(--gc-detail-bg);border-left:2px solid var(--gc-accent-a30);border-radius:0 6px 6px 0}"
    + ".gc-detail a{color:var(--gc-muted)}"
    + ".gc-btns{display:flex;gap:8px;margin-top:14px}"
    + ".gc-btn{flex:1;padding:9px 14px;border-radius:10px;border:none;font-family:'DM Sans',system-ui,sans-serif;"
      + "font-size:13px;font-weight:500;cursor:pointer;transition:all .15s ease;line-height:1}"
    + ".gc-ok{background:var(--gc-accent);color:var(--gc-accent-text)}"
    + ".gc-ok:hover{background:var(--gc-accent-dark);transform:translateY(-1px);box-shadow:0 4px 12px var(--gc-accent-a30)}"
    + ".gc-ok:active{transform:translateY(0)}"
    + ".gc-no{background:var(--gc-btn2-bg);color:var(--gc-muted);border:1px solid var(--gc-border)}"
    + ".gc-no:hover{background:var(--gc-btn2-hover);color:var(--gc-text)}"
    + ".gc-bar{position:absolute;bottom:0;left:0;height:2px;background:var(--gc-accent);"
      + "width:100%;transform-origin:left;opacity:.4}"
    + "@keyframes gc-pb{from{transform:scaleX(1)}to{transform:scaleX(0)}}"
    + "@media(max-width:440px){#gc-root{bottom:0!important;right:0!important;left:0!important;transform:none!important;width:100%;max-width:100%}"
      + ".gc-card{border-radius:16px 16px 0 0}}";
    document.head.appendChild(s);
  }

  /* ─── RENDER & SHOW ───────────────────────────────────────────── */
  function removeCurrent() {
    var el = document.getElementById('gc-root');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function hide(root, choice) {
    markAnswered(choice);
    root.classList.add('gc-hide');
    var pos = cfg.position || 'bottom-right';
    root.style.transform = (pos === 'bottom-center')
      ? 'translateX(-50%) translateY(12px) scale(0.96)'
      : 'translateY(12px) scale(0.96)';
    setTimeout(function(){ if (root.parentNode) root.parentNode.removeChild(root); }, 350);
  }

  function show(region) {
    injectStyles();
    removeCurrent();

    var msg   = getMessages(region);
    var pos   = cfg.position || 'bottom-right';
    var theme = cfg.theme    || 'dark';
    var accent = cfg.accentColor || '#c8f135';

    // Resolve autoHide: cfg.autoHide overrides per-region default
    var autoHide;
    if (cfg.autoHide === false || cfg.autoHide === 0) {
      autoHide = null;
    } else if (typeof cfg.autoHide === 'number' && cfg.autoHide > 0) {
      autoHide = cfg.autoHide;
    } else if (cfg.autoHide === true) {
      autoHide = msg.autoHide || 8000;
    } else {
      // null = use per-region default
      autoHide = msg.autoHide || null;
    }

    var themeVars = buildThemeVars(theme, accent);
    var posStyle  = POSITION_STYLES[pos] || POSITION_STYLES['bottom-right'];
    var initTransform = POSITION_STYLES_INIT[pos] || POSITION_STYLES_INIT['bottom-right'];

    var badge    = msg.badge    ? '<span class="gc-badge">'+msg.badge+'</span>' : '';
    var detail   = msg.detail   ? '<div class="gc-detail">'+msg.detail+'</div>' : '';
    var declineBtn = msg.btnDecline
      ? '<button class="gc-btn gc-no" id="gc-no">'+msg.btnDecline+'</button>' : '';
    var bar = autoHide ? '<div class="gc-bar" style="animation:gc-pb '+(autoHide/1000)+'s linear forwards"></div>' : '';

    var root = document.createElement('div');
    root.id = 'gc-root';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-label', msg.title);
    root.setAttribute('style', themeVars + ';' + posStyle + ';' + initTransform);

    root.innerHTML =
      '<div class="gc-card">'
      + '<div class="gc-head">'
      +   '<div class="gc-ico"><svg viewBox="0 0 24 24" fill="none" stroke="var(--gc-accent-text)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg></div>'
      +   '<span class="gc-ttl">'+msg.title+'</span>'
      +   badge
      + '</div>'
      + '<p class="gc-msg">'+msg.message+'</p>'
      + detail
      + '<div class="gc-btns">'+declineBtn+'<button class="gc-btn gc-ok" id="gc-ok">'+msg.btnAccept+'</button></div>'
      + bar
      + '</div>';

    document.body.appendChild(root);

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        root.classList.add('gc-on');
        var visTransform = POSITION_STYLES_VISIBLE[pos] || POSITION_STYLES_VISIBLE['bottom-right'];
        root.style.transform = visTransform;
      });
    });

    root.querySelector('#gc-ok').addEventListener('click', function(){ hide(root,'accepted'); });
    var noBtn = root.querySelector('#gc-no');
    if (noBtn) noBtn.addEventListener('click', function(){ hide(root,'declined'); });

    if (autoHide) {
      setTimeout(function(){
        if (document.getElementById('gc-root') === root) hide(root,'auto-accepted');
      }, autoHide);
    }
  }

  /* ─── INIT ────────────────────────────────────────────────────── */
  function init() {
    if (isAnswered()) return;
    detectRegion().then(function(region){
      setTimeout(function(){ show(region); }, 800);
    });
  }

  /* ─── PUBLIC API ──────────────────────────────────────────────── */
  window.GeoConsent = {
    init: init,
    show: function(region){ show(region || 'default'); },
    reset: function(){
      try { localStorage.removeItem(STORAGE_KEY); } catch(_){}
      document.cookie = STORAGE_KEY+'=; max-age=0; path=/;';
    },
    configure: function(opts){
      for (var k in opts) cfg[k] = opts[k];
    },
    getAnswer: function(){
      try { var v=localStorage.getItem(STORAGE_KEY); return v?JSON.parse(v):null; }
      catch(_){ return null; }
    },
    detectRegion: detectRegion,
  };

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})(window, document);
