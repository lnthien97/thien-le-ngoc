// Site script: language + theme toggles, lightbox, and the data-driven pages
// (photo collections from anh/*.json, stories from chuyen/*.md).
(function () {
  var root = document.documentElement;

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  // ----- Language -----
  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang);
    var btn = document.getElementById("lang-toggle");
    if (btn) btn.textContent = lang === "vi" ? "EN" : "VI";
    var t = root.getAttribute("data-title-" + lang);
    if (t) document.title = t;
  }
  setLang(load("lang") || ((navigator.language || "").toLowerCase().indexOf("vi") === 0 ? "vi" : "en"));

  // ----- Theme -----
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
  }
  var savedTheme = load("theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);

  // ----- Helpers -----
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Bilingual value -> markup. Accepts "text" or {vi: "...", en: "..."}.
  function t(v) {
    if (v == null) return "";
    if (typeof v === "string") return esc(v);
    var vi = v.vi != null ? v.vi : v.en, en = v.en != null ? v.en : v.vi;
    if (vi === en) return esc(vi);
    return '<span data-l="vi">' + esc(vi) + '</span><span data-l="en">' + esc(en) + "</span>";
  }
  function plain(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return (root.getAttribute("data-lang") === "en" ? v.en || v.vi : v.vi || v.en) || "";
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.slice(0, 10).split("-");
    if (p.length < 3) return esc(iso);
    return '<time datetime="' + esc(iso.slice(0, 10)) + '"><span data-l="vi">' + p[2] + "/" + p[1] + "/" + p[0] +
      '</span><span data-l="en">' + MONTHS[+p[1] - 1] + " " + +p[2] + ", " + p[0] + "</span></time>";
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + ": " + r.status);
      return r.json();
    });
  }
  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]+)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function bi(vi, en) { return '<span data-l="vi">' + vi + '</span><span data-l="en">' + en + "</span>"; }

  // ----- Photos -----
  function collectionCards(list, base) {
    if (!list.length) return '<p class="empty">' + bi("Sắp có ảnh.", "Photos coming soon.") + "</p>";
    return '<div class="grid">' + list.map(function (c) {
      var cover = c.cover ? '<img src="' + base + esc(c.slug) + "/" + esc(c.cover) + '" alt="" loading="lazy">' : '<div class="cover-empty"></div>';
      return '<a class="collection" href="' + base + "?c=" + encodeURIComponent(c.slug) + '">' + cover +
        '<div class="collection-body"><h3>' + t(c.title) + '</h3><div class="meta">' + c.count + " " +
        bi("ảnh", c.count === 1 ? "photo" : "photos") + " · " + fmtDate(c.updated) + "</div></div></a>";
    }).join("") + "</div>";
  }

  function renderPhotosPage(el) {
    var slug = param("c");
    getJSON("collections.json").then(function (cols) {
      if (!slug) {
        el.innerHTML = '<div class="eyebrow">' + bi("Ảnh", "Photos") + "</div><h1>" + bi("Bộ sưu tập", "Collections") + "</h1>" +
          collectionCards(cols, "");
        return;
      }
      var c = cols.filter(function (x) { return x.slug === slug; })[0];
      if (!c) { el.innerHTML = '<p class="empty">' + bi("Không tìm thấy bộ sưu tập.", "Collection not found.") + "</p>"; return; }
      root.setAttribute("data-title-vi", plain(c.title.vi || c.title) + " — Ảnh");
      root.setAttribute("data-title-en", plain(c.title.en || c.title) + " — Photos");
      setLang(root.getAttribute("data-lang"));
      return getJSON(encodeURIComponent(slug) + "/photos.json").then(function (photos) {
        el.innerHTML = '<a class="back" href="./">← ' + bi("Tất cả bộ sưu tập", "All collections") + "</a>" +
          "<h1>" + t(c.title) + "</h1>" + (c.description ? '<p class="lead">' + t(c.description) + "</p>" : "") +
          '<div class="meta">' + photos.length + " " + bi("ảnh", "photos") + " · " + bi("cập nhật ", "updated ") + fmtDate(c.updated) + "</div>" +
          '<div class="gallery masonry">' + photos.map(function (p) {
            var cap = p.caption ? t(p.caption) : "";
            return '<figure><a href="' + esc(slug) + "/" + esc(p.file) + '" data-caption="' + esc(plain(p.caption)) + '">' +
              '<img src="' + esc(slug) + "/" + esc(p.thumb) + '" width="' + p.tw + '" height="' + p.th + '" alt="' + esc(plain(p.caption)) + '" loading="lazy"></a>' +
              (cap ? "<figcaption>" + cap + "</figcaption>" : "") + "</figure>";
          }).join("") + "</div>";
      });
    }).catch(fail(el));
  }

  // ----- Stories -----
  function storyList(list, base) {
    if (!list.length) return '<p class="empty">' + bi("Chưa có truyện nào.", "No stories yet.") + "</p>";
    return '<ul class="stories">' + list.map(function (s) {
      return '<li><a href="' + base + "?s=" + encodeURIComponent(s.slug) + '"><h3>' + t(s.title) + "</h3></a>" +
        (s.summary ? "<p>" + t(s.summary) + "</p>" : "") + '<div class="meta">' + fmtDate(s.date) + "</div></li>";
    }).join("") + "</ul>";
  }

  // Minimal Markdown for prose: paragraphs (single newlines kept), # headings,
  // > quotes, *em* / **strong**, and "***" or "---" as a scene break.
  function md(src) {
    function inline(s) {
      return esc(s)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
        .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, "$1<em>$2</em>")
        .replace(/\n/g, "<br>");
    }
    return src.replace(/\r/g, "").split(/\n\s*\n/).map(function (b) {
      b = b.trim();
      if (!b) return "";
      if (/^([*-]\s*){3,}$/.test(b)) return "<hr>";
      var h = /^(#{1,3})\s+(.+)$/.exec(b);
      if (h && b.indexOf("\n") < 0) { var n = h[1].length + 1; return "<h" + n + ">" + inline(h[2]) + "</h" + n + ">"; }
      if (/^>/.test(b)) return "<blockquote><p>" + inline(b.replace(/^>\s?/gm, "")) + "</p></blockquote>";
      return "<p>" + inline(b) + "</p>";
    }).join("\n");
  }

  function renderStoriesPage(el) {
    var slug = param("s");
    getJSON("stories.json").then(function (list) {
      if (!slug) {
        el.innerHTML = '<div class="eyebrow">' + bi("Chuyện", "Stories") + "</div><h1>" + bi("Những câu chuyện", "Stories") + "</h1>" +
          storyList(list, "");
        return;
      }
      var s = list.filter(function (x) { return x.slug === slug; })[0];
      if (!s) { el.innerHTML = '<p class="empty">' + bi("Không tìm thấy truyện.", "Story not found.") + "</p>"; return; }
      root.setAttribute("data-title-vi", plain(s.title.vi || s.title));
      root.setAttribute("data-title-en", plain(s.title.en || s.title));
      setLang(root.getAttribute("data-lang"));
      return fetch(encodeURIComponent(slug) + ".md", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(slug + ".md: " + r.status);
        return r.text();
      }).then(function (text) {
        var i = list.indexOf(s), newer = list[i - 1], older = list[i + 1];
        el.innerHTML = '<a class="back" href="./">← ' + bi("Tất cả truyện", "All stories") + "</a>" +
          '<article class="story"><h1>' + t(s.title) + '</h1><div class="meta">' + fmtDate(s.date) + "</div>" +
          '<div class="prose">' + md(text) + "</div></article>" +
          '<nav class="pager">' +
          (older ? '<a href="?s=' + encodeURIComponent(older.slug) + '">← ' + t(older.title) + "</a>" : "<span></span>") +
          (newer ? '<a href="?s=' + encodeURIComponent(newer.slug) + '">' + t(newer.title) + " →</a>" : "") + "</nav>";
        window.scrollTo(0, 0);
      });
    }).catch(fail(el));
  }

  // ----- Home -----
  function renderHome() {
    var photos = document.getElementById("home-photos");
    if (photos) getJSON("anh/collections.json").then(function (cols) {
      photos.innerHTML = collectionCards(cols.slice(0, 6), "anh/");
    }).catch(fail(photos));
    var stories = document.getElementById("home-stories");
    if (stories) getJSON("chuyen/stories.json").then(function (list) {
      stories.innerHTML = storyList(list.slice(0, 5), "chuyen/");
    }).catch(fail(stories));
  }

  function fail(el) {
    return function (err) {
      console.error(err);
      el.innerHTML = '<p class="empty">' + bi("Không tải được nội dung.", "Could not load content.") + "</p>";
    };
  }

  // ----- Lightbox (delegated, works for content rendered later) -----
  function initLightbox() {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button>' +
      '<button class="lb-close" aria-label="Close">×</button>';
    document.body.appendChild(box);
    var img = box.querySelector("img"), cap = box.querySelector("figcaption");
    var links = [], index = 0;

    function show(i) {
      index = (i + links.length) % links.length;
      var a = links[index];
      img.src = a.getAttribute("href");
      cap.textContent = a.getAttribute("data-caption") || "";
      box.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function close() {
      box.hidden = true;
      img.removeAttribute("src");
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest(".gallery a");
      if (!a) return;
      e.preventDefault();
      links = Array.prototype.slice.call(a.closest(".gallery").querySelectorAll("a"));
      show(links.indexOf(a));
    });
    box.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); show(index - 1); });
    box.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target !== img) close(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setLang(root.getAttribute("data-lang"));
    setTheme(currentTheme());

    var langBtn = document.getElementById("lang-toggle");
    if (langBtn) langBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-lang") === "vi" ? "en" : "vi";
      setLang(next);
      save("lang", next);
    });
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      setTheme(next);
      save("theme", next);
    });
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    initLightbox();
    var page = document.body.getAttribute("data-page");
    var main = document.getElementById("content");
    if (page === "home") renderHome();
    else if (page === "photos") renderPhotosPage(main);
    else if (page === "stories") renderStoriesPage(main);
  });
})();
