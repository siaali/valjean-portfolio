(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };

  var DATA = null;
  var IO = null;
  var LB = null;

  function boot() {
    fetch('data/works.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        DATA = data;
        applySite(data.site || {});
        applySocial(data.site ? data.site.social : []);
        initContact();
        if (document.body.classList.contains('page-home')) initHome();
        if (document.body.classList.contains('page-work')) initWork();
      })
      .catch(showDataError);
  }

  function showDataError(err) {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="data-error">Could not load <code>data/works.json</code>.<br>' +
      '请用本地静态服务器打开（例如 <code>python3 -m http.server 8000</code>），不要直接双击 HTML 文件。<br>' +
      '<small>' + esc(err && err.message) + '</small></div>');
  }

  function applySite(site) {
    $$('[data-site-name]').forEach(function (el) { el.textContent = site.name || ''; });
    $$('[data-site-tagline]').forEach(function (el) { el.textContent = site.tagline || ''; });
    $$('[data-site-location]').forEach(function (el) { el.textContent = site.location || ''; });
    $$('[data-site-about]').forEach(function (el) { el.textContent = site.about || ''; });
    var mail = site.email || '';
    $$('[data-email-link]').forEach(function (el) { el.setAttribute('href', 'mailto:' + mail); });
    $$('[data-email-text]').forEach(function (el) { el.textContent = mail; });
    // 详情页静帧组的小标题也由配置驱动，改名字不用碰 HTML
    var labels = site.labels || {};
    if (labels.stills) {
      $$('[data-stills-label]').forEach(function (el) { el.textContent = labels.stills; });
    }
    // About 区个人肖像：没填 site.portrait 时整块自动隐藏
    var wrap = $('[data-site-portrait-wrap]');
    if (wrap) {
      var portrait = site.portrait || '';
      if (portrait) {
        $$('[data-site-portrait]').forEach(function (el) { el.src = portrait; });
        wrap.hidden = false;
      } else {
        wrap.hidden = true;
      }
    }
    if (!document.body.classList.contains('page-work')) {
      document.title = (site.name || 'Portfolio') + ' — ' + (site.tagline || 'Selected work');
    }
    fitHeroTitle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroTitle);
    window.addEventListener('resize', fitHeroTitle);
  }

  /* 参考站首屏大字是按容器宽度撑满的：这里按站名长度自动算字号，
     以后改 works.json 的 site.name 也会自动重新适配，不用动代码 */
  function fitHeroTitle() {
    var el = $('.hero-title'), box = $('.hero-inner');
    if (!el || !box || !el.textContent.trim()) return;
    var cs = getComputedStyle(box);
    var pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    var target = (box.clientWidth - pad) * 0.92;
    if (target <= 0) return;
    el.style.fontSize = '100px';
    var range = document.createRange();
    range.selectNodeContents(el);
    var w = range.getBoundingClientRect().width;
    if (!w) return;
    // 不设字号上限：首屏是固定 16:9 版式，大字必须跟着画布无限等比放大，
    // 否则宽屏会被截断，视频与文字的相对大小关系就不一致了。
    el.style.fontSize = Math.round(Math.max(46, 100 * target / w)) + 'px';
  }

  function applySocial(list) {
    var box = $('#social');
    if (!box) return;
    box.innerHTML = (list || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + ' ↗</a>';
    }).join('');
  }

  function catLabel(id) {
    var c = (DATA.categories || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.label : '';
  }

  function observeReveal(root) {
    var nodes = $$('.reveal', root || document);
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!IO) {
      IO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); IO.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    nodes.forEach(function (n, i) {
      if (n.classList.contains('is-in')) return;
      n.style.transitionDelay = Math.min(i, 6) * 60 + 'ms';
      IO.observe(n);
    });
  }

  var VIEW_KEY = 'portfolio:view';
  var VIEW = 'flow';

  function viewConfig() {
    var v = (DATA.site && DATA.site.view) || {};
    return {
      defaultView: v.default === 'grid' ? 'grid' : 'flow',
      remember: v.remember !== false
    };
  }

  function resolveView() {
    var cfg = viewConfig();
    var q = new URLSearchParams(location.search).get('v');
    if (q === 'flow' || q === 'grid') return q;
    if (cfg.remember) {
      try {
        var saved = localStorage.getItem(VIEW_KEY);
        if (saved === 'flow' || saved === 'grid') return saved;
      } catch (e) {}
    }
    return cfg.defaultView;
  }

  function applyView(view) {
    VIEW = view === 'grid' ? 'grid' : 'flow';
    var grid = $('#grid');
    if (grid) grid.classList.toggle('is-flow', VIEW === 'flow');
    $$('.view-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-view') === VIEW;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function initViewSwitch() {
    var box = $('#viewSwitch');
    if (!box) return;
    applyView(resolveView());
    $$('.view-btn', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-view') === 'grid' ? 'grid' : 'flow';
        applyView(next);
        var cfg = viewConfig();
        if (cfg.remember) {
          try { localStorage.setItem(VIEW_KEY, next); } catch (e) {}
        }
        var u = new URL(location.href);
        if (next === cfg.defaultView) u.searchParams.delete('v'); else u.searchParams.set('v', next);
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      });
    });
  }

  function initHome() {
    initHero(DATA.site && DATA.site.hero ? DATA.site.hero : {});
    var sv = $('#services');
    if (sv) sv.innerHTML = ((DATA.site && DATA.site.services) || []).map(function (x) {
      return '<li>' + esc(x) + '</li>';
    }).join('');
    initViewSwitch();
    // 不展示分类筛选：直接渲染全部作品，详情页仍可用 categories 取分类名
    renderGrid('all');
    initCopy();
    ['#info .info-label', '#info .info-body', '.footer-talk'].forEach(function (sel) {
      var el = $(sel); if (el) el.classList.add('reveal');
    });
    observeReveal(document.body);
  }

  function initHero(hero) {
    var box = $('#heroMedia');
    if (!box) return;
    var img = new Image();
    img.src = hero.poster || '';
    img.alt = '';
    box.appendChild(img);
    box.classList.add('is-fallback');
    // 首屏双源：本地用 hero.video，线上按地区优先 hero.videoCn / hero.videoGlobal
    var sources = sourceOrder(hero.video || '', hero.videoGlobal || '', hero.videoCn || '');
    var directs = [];
    sources.forEach(function (s) {
      var d = directVideo(s.url);
      if (d) directs.push(d);
    });
    if (!directs.length) return;

    var attempt = 0;
    function loadNext() {
      if (attempt >= directs.length) return; // 全失败就保持静态兜底图，不黑屏
      var v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.preload = 'auto';
      v.poster = hero.poster || '';
      v.style.display = 'none';
      v.addEventListener('canplay', function () {
        v.style.display = 'block';
        img.style.display = 'none';
        box.classList.remove('is-fallback');
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
      v.addEventListener('error', function () { v.remove(); loadNext(); });
      v.src = directs[attempt++];
      box.appendChild(v);
    }
    loadNext();
  }

  function renderGrid(cat) {
    var grid = $('#grid');
    if (!grid) return;
    var list = (DATA.works || []).filter(function (w) { return cat === 'all' || w.category === cat; });
    var empty = $('#gridEmpty');
    if (empty) empty.hidden = list.length > 0;
    grid.innerHTML = list.map(function (w) {
      var ar = parseAspect(w.aspect);
      return '<a class="card reveal" href="work.html?w=' + encodeURIComponent(w.id) + '">' +
        '<div class="card-media' + (ar < 1 ? ' is-portrait' : '') + '" style="--card-ar:' + ar.toFixed(4) + '">' +
          '<img src="' + esc(w.cover) + '" alt="' + esc(w.title) + '" loading="lazy">' +
          '<span class="card-explore">Explore ↗</span>' +
        '</div>' +
        '<div class="card-meta"><div>' +
          (w.client ? '<span class="card-client">' + esc(w.client) + '</span>' : '') +
          (!w.client || w.client !== w.title ? '<span class="card-title">' + esc(w.title) + '</span>' : '') +
        '</div><span class="card-year">' + esc(w.year) + '</span></div>' +
      '</a>';
    }).join('');
    observeReveal(grid);
  }

  /* 页脚「Copy Email」和 CONTACT 面板共用同一份复制逻辑 */
  function copyEmail(done) {
    var mail = (DATA.site && DATA.site.email) || '';
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = mail; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mail).then(done, fallback);
    } else { fallback(); }
  }

  function initCopy() {
    var btn = $('#copyEmail');
    if (!btn) return;
    btn.addEventListener('click', function () {
      copyEmail(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy Email'; }, 1800);
      });
    });
  }

  /* 点 CONTACT 不再直接触发 mailto（很多设备没配默认邮件客户端，会像没反应），
     改成弹出一个小面板：立刻能看到邮箱、一键复制，同时保留「打开邮件 App」。
     面板由脚本生成，首页 / 详情页共用一份，邮箱地址仍取自 works.json。 */
  function initContact() {
    var trigger = $('.site-nav a[data-email-link]');
    var header = $('.site-header');
    if (!trigger || !header) return;
    var mail = (DATA.site && DATA.site.email) || '';

    var pop = document.createElement('div');
    pop.className = 'contact-pop';
    pop.id = 'contactPop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Contact');
    pop.innerHTML =
      '<div class="contact-pop-head">' +
        '<span class="contact-pop-label">Get in touch</span>' +
        '<button type="button" class="contact-pop-close" aria-label="Close">×</button>' +
      '</div>' +
      '<a class="contact-pop-mail" href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>' +
      '<div class="contact-pop-actions">' +
        '<button type="button" class="contact-pop-copy">Copy address</button>' +
        '<a class="contact-pop-open" href="mailto:' + esc(mail) + '">Open mail app ↗</a>' +
      '</div>' +
      '<p class="contact-pop-note">Opens your default mail app. If nothing happens, copy the address above.</p>';
    header.appendChild(pop);

    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'contactPop');
    var timer = null;

    function setOpen(on) {
      pop.classList.toggle('is-open', on);
      document.body.classList.toggle('contact-open', on);
      trigger.setAttribute('aria-expanded', on ? 'true' : 'false');
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!pop.classList.contains('is-open'));
    });
    $('.contact-pop-close', pop).addEventListener('click', function () { setOpen(false); });
    $('.contact-pop-copy', pop).addEventListener('click', function () {
      var btn = this;
      copyEmail(function () {
        btn.textContent = 'Copied';
        clearTimeout(timer);
        timer = setTimeout(function () { btn.textContent = 'Copy address'; }, 1800);
      });
    });
    // 这两条仍走 mailto；故意不收起面板——很多设备点了没反应，面板留着才能改点复制
    // （点面板内部不会触发下面的「点外部关闭」，由 pop.contains 判断挡住）

    document.addEventListener('click', function (e) {
      if (!pop.classList.contains('is-open')) return;
      if (pop.contains(e.target) || trigger.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pop.classList.contains('is-open')) {
        setOpen(false);
        trigger.focus();
      }
    });
  }

  function parseAspect(a) {
    if (typeof a === 'number' && a > 0) return a;
    var s = String(a || '').trim();
    if (s.indexOf(':') > -1) {
      var p = s.split(':').map(Number);
      if (p[0] > 0 && p[1] > 0) return p[0] / p[1];
    }
    var n = Number(s);
    return n > 0 ? n : 16 / 9;
  }

  /* 双源选源（国内外都能看）：
     - 本地预览（localhost / file:）永远用 works.json 里原有的 video，行为和以前完全一样
     - 线上：按地区自动选源——大陆访客优先 cn，其它访客优先 global；cn 没填就退回 global
     - 访客可用网址 ?r=cn / ?r=global / ?r=auto 手动指定（记入 localStorage，auto 清除）
     - mp4 加载失败时，按候选顺序自动换下一个源重试一次 */
  var REGION_KEY = 'portfolio:region';

  function isLocalHost() {
    return location.protocol === 'file:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function regionOverride() {
    var q = new URLSearchParams(location.search).get('r');
    if (q === 'cn' || q === 'global' || q === 'auto') {
      try {
        if (q === 'auto') localStorage.removeItem(REGION_KEY);
        else localStorage.setItem(REGION_KEY, q);
      } catch (e) {}
      return q === 'auto' ? '' : q;
    }
    try {
      var saved = localStorage.getItem(REGION_KEY);
      if (saved === 'cn' || saved === 'global') return saved;
    } catch (e) {}
    return '';
  }

  function isMainlandCN() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
      if (/^asia\/(shanghai|beijing|chongqing|harbin|urumqi|chengdu|guangzhou|shenzhen|nanjing|hangzhou|wuhan|xian|tianjin|shenyang)/.test(tz)) return true;
    } catch (e) {}
    var lang = (navigator.language || '').toLowerCase();
    return lang === 'zh-cn' || lang === 'zh-hans-cn';
  }

  function sourceOrder(primary, globalUrl, cnUrl) {
    var out = [], seen = {};
    function add(u, kind) {
      u = u ? String(u) : '';
      if (u && !seen[u]) { seen[u] = 1; out.push({ url: u, kind: kind }); }
    }
    // 本地预览：原路径优先，线上源作为兜底，绝不改变现在的本地体验
    if (isLocalHost()) { add(primary, 'local'); add(globalUrl, 'global'); add(cnUrl, 'cn'); return out; }
    var mode = regionOverride() || (isMainlandCN() ? 'cn' : 'global');
    if (mode === 'cn') { add(cnUrl, 'cn'); add(globalUrl, 'global'); add(primary, 'primary'); }
    else { add(globalUrl, 'global'); add(cnUrl, 'cn'); add(primary, 'primary'); }
    return out;
  }

  function embedUrl(raw) {
    if (!raw) return null;
    var u = String(raw).trim(), m;
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i))) {
      return 'https://player.vimeo.com/video/' + m[1] + '?title=0&byline=0&portrait=0&dnt=1&autopause=0';
    }
    if ((m = u.match(/(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i))) {
      return 'https://www.youtube.com/embed/' + m[1] + '?rel=0&modestbranding=1&playsinline=1';
    }
    if (/^https:\/\/(player\.vimeo\.com\/video\/|www\.youtube\.com\/embed\/)/i.test(u)) return u;
    return null;
  }

  function directVideo(raw) {
    if (!raw) return null;
    var u = String(raw).trim();
    return /\.(mp4|m4v|webm|mov)(\?|#|$)/i.test(u) ? u : null;
  }

  function buildDemoPlayer(onClose) {
    var d = document.createElement('div');
    d.className = 'demo-player';
    d.innerHTML =
      '<div class="demo-screen">' +
        '<strong>Placeholder video</strong>' +
        '<small>Add a Vimeo or YouTube URL to <code>video</code> in data/works.json</small>' +
      '</div>' +
      '<div class="demo-controls">' +
        '<button type="button" data-demo-pause aria-label="Pause">❚❚</button>' +
        '<div class="demo-track"><i></i></div>' +
        '<span>DEMO</span>' +
        '<button type="button" class="demo-close" data-demo-close aria-label="Close">×</button>' +
      '</div>';
    $('[data-demo-close]', d).addEventListener('click', function () { d.remove(); onClose(); });
    $('[data-demo-pause]', d).addEventListener('click', function (e) {
      var bar = $('.demo-track i', d);
      var paused = bar.style.animationPlayState === 'paused';
      bar.style.animationPlayState = paused ? 'running' : 'paused';
      e.currentTarget.textContent = paused ? '❚❚' : '▶';
    });
    return d;
  }

  function videoEntries(w) {
    var raw = w.video;
    var list = Array.isArray(raw) ? raw.slice() : [raw];
    if (!list.length) list = [''];
    return list.map(function (item) {
      var url, label, aspect, poster, globalUrl, cnUrl;
      if (item && typeof item === 'object') {
        url = String(item.url || '');
        label = String(item.label || '');
        aspect = item.aspect || w.aspect;
        poster = item.poster || w.cover;
        globalUrl = item.urlGlobal || w.videoGlobal || '';
        cnUrl = item.urlCn || w.videoCn || '';
      } else {
        url = item == null ? '' : String(item);
        label = ''; aspect = w.aspect; poster = w.cover;
        globalUrl = w.videoGlobal || '';
        cnUrl = w.videoCn || '';
      }
      return {
        url: url, label: label, aspect: aspect, poster: poster,
        sources: sourceOrder(url, globalUrl, cnUrl)
      };
    });
  }

  /* 播放器下方不再显示状态文字；只有真的加载失败时，才在画面底部给一行提示 */
  function showPlayerError(frame, msg) {
    if ($('.player-error', frame)) return;
    var p = document.createElement('p');
    p.className = 'player-error';
    p.textContent = msg;
    frame.appendChild(p);
  }

  function setupOnePlayer(v, w, player, frame, index, total) {
    if (!player || !frame) return;
    var ratio = parseAspect(v.aspect);

    function fit() {
      var cw = player.clientWidth, ch = player.clientHeight;
      if (!cw || !ch) return;
      var fw = cw, fh = cw / ratio;
      if (fh > ch) { fh = ch; fw = ch * ratio; }
      frame.style.width = Math.round(fw) + 'px';
      frame.style.height = Math.round(fh) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);

    // 候选源按选源顺序：大陆优先 cn、海外优先 global、本地优先原路径。
    // 先找第一个能用的嵌入链接；否则收集所有 mp4 候选，失败时逐个换源重试。
    var sources = (v.sources && v.sources.length) ? v.sources : [{ url: v.url, kind: 'primary' }];
    var embed = null;
    for (var si = 0; si < sources.length; si++) {
      embed = embedUrl(sources[si].url);
      if (embed) break;
    }
    var directs = [];
    sources.forEach(function (s) {
      var d = directVideo(s.url);
      if (d) directs.push(d);
    });
    var playable = !!(embed || directs.length);

    var cover = document.createElement('div');
    cover.className = 'player-cover';
    cover.innerHTML =
      '<img src="' + esc(v.poster) + '" alt="">' +
      '<span class="play-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5v17l15-8.5z"/></svg></span>' +
      '<span class="player-caption">' + (playable ? 'Play film' : 'Preview player') + '</span>';
    frame.appendChild(cover);

    function reset() {
      frame.innerHTML = '';
      frame.appendChild(cover);
    }

    cover.addEventListener('click', function () {
      cover.remove();
      if (embed) {
        var f = document.createElement('iframe');
        f.src = embed;
        f.title = w.title + (total > 1 ? ' — film ' + (index + 1) : ' — video');
        f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.appendChild(f);
      } else if (directs.length) {
        // 同一详情页有多个短片时，先停掉其它正在播的，避免多路声音叠在一起
        document.querySelectorAll('#players video').forEach(function (other) {
          if (!other.paused) other.pause();
        });

        var attempt = 0;
        function loadNext() {
          if (attempt >= directs.length) {
            showPlayerError(frame, 'Video could not load — check the file path or link');
            return;
          }
          var vd = document.createElement('video');
          vd.src = directs[attempt++];
          vd.controls = true;
          vd.playsInline = true;
          vd.preload = 'auto';
          vd.poster = v.poster || '';
          vd.setAttribute('playsinline', '');
          vd.setAttribute('webkit-playsinline', '');
          frame.appendChild(vd);
          // 当前源失败：自动换下一个源重试；全失败才给出提示
          vd.addEventListener('error', function () {
            vd.remove();
            loadNext();
          });
          // 点击封面本身是一次用户手势，这里可以直接开始播放（包括带声音）
          var pr = vd.play();
          if (pr && typeof pr.catch === 'function') {
            pr.catch(function () { vd.setAttribute('autoplay', ''); });
          }
        }
        loadNext();
      } else {
        frame.appendChild(buildDemoPlayer(reset));
      }
    });
  }

  function initPlayers(w) {
    var box = $('#players');
    if (!box) return;
    var entries = videoEntries(w);
    var multi = entries.length > 1;
    var frames = [];
    box.innerHTML = '';

    entries.forEach(function (v, i) {
      var block = document.createElement('section');
      block.className = 'player-block';
      var bits = [];
      if (multi) bits.push((i + 1 < 10 ? '0' : '') + (i + 1) + ' / ' +
        (entries.length < 10 ? '0' : '') + entries.length);
      if (v.label) bits.push(v.label);
      var label = bits.length ? '<p class="player-label">' + esc(bits.join(' · ')) + '</p>' : '';
      block.innerHTML = label +
        '<div class="player"><div class="player-frame"></div></div>';
      box.appendChild(block);
      var player = $('.player', block), frame = $('.player-frame', block);
      frames.push(frame);
      setupOnePlayer(v, w, player, frame, i, entries.length);
    });

    window.addEventListener('pagehide', function () {
      frames.forEach(function (f) { f.innerHTML = ''; });
    });
  }

  function setupLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    var img = $('#lbImage'), count = $('#lbCount');
    var imgs = [], cur = 0;

    function render() {
      img.src = imgs[cur];
      img.alt = 'Still ' + (cur + 1);
      count.textContent = (cur + 1) + ' / ' + imgs.length;
      $('#lbPrev').hidden = imgs.length < 2;
      $('#lbNext').hidden = imgs.length < 2;
    }
    function close() {
      lb.hidden = true;
      document.body.classList.remove('lb-open');
      img.removeAttribute('src');
    }
    function step(d) {
      if (imgs.length < 2) return;
      cur = (cur + d + imgs.length) % imgs.length;
      render();
    }
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { step(-1); });
    $('#lbNext').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === img) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    LB = {
      open: function (list, i) {
        imgs = list; cur = i; render();
        lb.hidden = false;
        document.body.classList.add('lb-open');
      }
    };
  }

  function initStills(w) {
    var sec = $('#stillsSection'), grid = $('#stillsGrid');
    if (!sec || !grid) return;
    var list = (Array.isArray(w.stills) ? w.stills : []).filter(Boolean);
    if (!list.length) { sec.hidden = true; return; }
    sec.hidden = false;
    // 每张静帧按作品本身画幅占位并完整显示（16:9 / 5:4），不统一裁成 4:3
    grid.style.setProperty('--stills-ar', parseAspect(w.aspect).toFixed(4));
    grid.innerHTML = list.map(function (src, i) {
      return '<button type="button" data-still="' + i + '" aria-label="Open still ' + (i + 1) + '">' +
        '<img src="' + esc(src) + '" alt="' + esc(w.title) + ' — still ' + (i + 1) + '" loading="lazy"></button>';
    }).join('');
    $$('[data-still]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (LB) LB.open(list, Number(btn.getAttribute('data-still')));
      });
    });
  }

  function initNext(next) {
    var a = $('#nextWork'), t = $('#nextTitle');
    if (!a || !t || !next) return;
    t.textContent = next.title;
    a.href = 'work.html?w=' + encodeURIComponent(next.id);
  }

  function initWork() {
    setupLightbox();
    var id = new URLSearchParams(location.search).get('w');
    var works = DATA.works || [];
    var idx = -1;
    for (var i = 0; i < works.length; i++) { if (works[i].id === id) { idx = i; break; } }
    if (idx < 0) {
      var d = $('#detail');
      if (d) d.innerHTML = '<div class="data-error">Work not found. <a href="index.html#work">← Back to all work</a></div>';
      return;
    }
    var w = works[idx];
    document.title = w.title + ' — ' + ((DATA.site && DATA.site.name) || 'Portfolio');
    $('#dTitle').textContent = w.title;
    // 比例只用于播放器与大图流布局，不再作为文字展示
    $('#dMeta').innerHTML = [w.client, w.year, catLabel(w.category)]
      .filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    $('#dNote').textContent = w.note || '';
    initPlayers(w);
    initStills(w);
    initNext(works[(idx + 1) % works.length]);
    ['#detail .detail-head', '#detail .player-wrap', '#detail .detail-note', '#detail .stills', '#detail .next-work']
      .forEach(function (sel) { var el = $(sel); if (el && !el.hidden) el.classList.add('reveal'); });
    observeReveal(document.body);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
