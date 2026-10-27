// Language + theme toggles. Preferences are kept in localStorage when available.
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
    // Swap <title> and meta description if bilingual variants are provided.
    var t = root.getAttribute("data-title-" + lang);
    if (t) document.title = t;
  }
  var lang = load("lang") || ((navigator.language || "").toLowerCase().indexOf("vi") === 0 ? "vi" : "en");
  setLang(lang);

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

    initTagFilter();
    initLightbox();
  });

  // ----- Lightbox for .gallery links -----
  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".gallery a"));
    if (!links.length) return;

    var box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML = '<img alt=""><button class="lb-prev" aria-label="Previous">‹</button>' +
                    '<button class="lb-next" aria-label="Next">›</button><button class="lb-close" aria-label="Close">×</button>';
    document.body.appendChild(box);
    var img = box.querySelector("img");
    var index = 0;

    function visible() {
      // Only navigate within galleries in the current language block.
      return links.filter(function (a) { return a.offsetParent !== null; });
    }
    function show(i) {
      var list = visible();
      if (!list.length) return;
      index = (i + list.length) % list.length;
      var a = list[index];
      img.src = a.getAttribute("href");
      img.alt = (a.querySelector("img") || {}).alt || "";
      box.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function close() {
      box.hidden = true;
      img.removeAttribute("src");
      document.body.style.overflow = "";
    }

    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        show(visible().indexOf(a));
      });
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

  // ----- Blog tag filter (?tag=slug) -----
  function initTagFilter() {
    var list = document.getElementById("post-list");
    if (!list) return;
    var items = list.querySelectorAll("li[data-tags]");
    var buttons = document.querySelectorAll(".filters a[data-tag]");
    var empty = document.getElementById("post-empty");

    function apply(tag) {
      var shown = 0;
      for (var i = 0; i < items.length; i++) {
        var tags = " " + items[i].getAttribute("data-tags") + " ";
        var match = !tag || tags.indexOf(" " + tag + " ") !== -1;
        items[i].hidden = !match;
        if (match) shown++;
      }
      for (var j = 0; j < buttons.length; j++) {
        buttons[j].classList.toggle("active", buttons[j].getAttribute("data-tag") === tag);
      }
      if (empty) empty.hidden = shown > 0;
    }

    function tagFromUrl() {
      var m = /[?&]tag=([^&#]+)/.exec(location.search);
      return m ? decodeURIComponent(m[1]) : "";
    }

    // Intercept clicks on any ?tag= link on this page (filter bar and per-post tags).
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a || !(a.matches(".filters a") || a.matches(".post-tags a"))) return;
      var tag = a.getAttribute("data-tag");
      if (tag === null) {
        var m = /[?&]tag=([^&#]+)/.exec(a.getAttribute("href"));
        tag = m ? decodeURIComponent(m[1]) : "";
      }
      e.preventDefault();
      history.pushState(null, "", tag ? "?tag=" + encodeURIComponent(tag) : location.pathname);
      apply(tag);
    });
    window.addEventListener("popstate", function () { apply(tagFromUrl()); });

    apply(tagFromUrl());
  }
})();
