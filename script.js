/* ============================================================
   Prasanjit Ghosh — Portfolio
   Vanilla JS: theme, navigation, reveal animations, proof ticker,
   contact form validation, scroll-to-top, page loader.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Page loader ---------------- */
  window.addEventListener("load", function () {
    var loader = document.getElementById("loader");
    if (loader) {
      setTimeout(function () { loader.classList.add("is-hidden"); }, 250);
    }
  });

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Theme toggle (persisted) ---------------- */
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var THEME_KEY = "pg-theme";

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* storage unavailable */ }
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else {
      applyTheme("dark"); // dark is the preferred default look
    }
  })();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
    });
  }

  /* ---------------- Mobile nav ---------------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function closeMobileNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });
  }

  /* ---------------- Sticky nav shadow + active link ---------------- */
  var nav = document.getElementById("nav");
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id], main[id]"));
  var navAnchorLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));

  function onScroll() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 12);

    var toTop = document.getElementById("toTop");
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.getAttribute("id");
          navAnchorLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach(function (sec) { navObserver.observe(sec); });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------- Hero "proof ticker" (signature element) ---------------- */
  var proofLines = [
    "lim(x\u2192\u221e) 1/x = 0",
    "f\u2032(x) = lim h\u21920 [f(x+h) \u2212 f(x)] / h",
    "\u2200\u03b5>0, \u2203\u03b4>0 : |x\u2212a|<\u03b4 \u21d2 |f(x)\u2212f(a)|<\u03b5",
    "console.log(\"still learning\");",
    "\u2211 (1/n\u00b2), n=1\u2192\u221e = \u03c0\u00b2/6"
  ];

  var ticker = document.getElementById("proofTicker");
  if (ticker) {
    if (reduceMotion) {
      ticker.textContent = proofLines[0];
    } else {
      var lineIndex = 0;
      var charIndex = 0;
      var deleting = false;
      var cursorSpan = document.createElement("span");
      cursorSpan.className = "cursor";

      function tick() {
        var current = proofLines[lineIndex];

        if (!deleting) {
          charIndex++;
          ticker.textContent = current.slice(0, charIndex);
          ticker.appendChild(cursorSpan);
          if (charIndex === current.length) {
            deleting = false;
            setTimeout(function () { deleting = true; tick(); }, 1600);
            return;
          }
        } else {
          charIndex--;
          ticker.textContent = current.slice(0, charIndex);
          ticker.appendChild(cursorSpan);
          if (charIndex === 0) {
            deleting = false;
            lineIndex = (lineIndex + 1) % proofLines.length;
          }
        }
        setTimeout(tick, deleting ? 22 : 42);
      }
      tick();
    }
  }

  /* ---------------- Scroll to top ---------------- */
  var toTopBtn = document.getElementById("toTop");
  if (toTopBtn) {
    toTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- Contact form validation ---------------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var nameInput = document.getElementById("cf-name");
    var emailInput = document.getElementById("cf-email");
    var messageInput = document.getElementById("cf-message");
    var status = document.getElementById("formStatus");

    var errors = {
      name: document.getElementById("err-name"),
      email: document.getElementById("err-email"),
      message: document.getElementById("err-message")
    };

    function setError(field, msg) {
      if (errors[field]) errors[field].textContent = msg || "";
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validate() {
      var valid = true;

      if (!nameInput.value.trim()) {
        setError("name", "Please enter your name.");
        valid = false;
      } else {
        setError("name", "");
      }

      if (!emailInput.value.trim()) {
        setError("email", "Please enter your email.");
        valid = false;
      } else if (!isValidEmail(emailInput.value.trim())) {
        setError("email", "Please enter a valid email address.");
        valid = false;
      } else {
        setError("email", "");
      }

      if (!messageInput.value.trim()) {
        setError("message", "Please write a short message.");
        valid = false;
      } else if (messageInput.value.trim().length < 10) {
        setError("message", "Message should be at least 10 characters.");
        valid = false;
      } else {
        setError("message", "");
      }

      return valid;
    }

    [nameInput, emailInput, messageInput].forEach(function (input) {
      input.addEventListener("blur", validate);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.classList.remove("is-error");

      if (!validate()) {
        status.textContent = "Please fix the highlighted fields before sending.";
        status.classList.add("is-error");
        return;
      }

      // No backend is connected yet, so the form hands off to the
      // visitor's own email client with the message pre-filled.
      var subject = encodeURIComponent("Portfolio message from " + nameInput.value.trim());
      var body = encodeURIComponent(
        messageInput.value.trim() + "\n\n— " + nameInput.value.trim() + " (" + emailInput.value.trim() + ")"
      );
      var mailto = "mailto:abhayghosh750@gmail.com?subject=" + subject + "&body=" + body;

      window.location.href = mailto;
      status.textContent = "Opening your email app to send this message\u2026";
    });
  }
})();
