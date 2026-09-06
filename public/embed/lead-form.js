/*
 * GoTech CRM — embeddable lead-capture widget.
 *
 * Drop this on any page:
 *   <div data-gotech-lead-form></div>
 *   <script src="https://<your-crm-domain>/embed/lead-form.js" async></script>
 *
 * Renders in English by default. If your site has separate pages per
 * language, point each page's script tag at the matching link so the form
 * matches the page it's dropped on:
 *   ?lang=en   English (default)
 *   ?lang=zh   Chinese
 *   ?lang=ms   Malay
 * e.g. <script src="https://<your-crm-domain>/embed/lead-form.js?lang=zh" async></script>
 * A visitor can still switch languages themselves inside the form — that
 * choice is remembered (localStorage) and wins over the page's own ?lang=
 * on any later visit, on any page of your site.
 *
 * Unlike an iframe, this renders bare <input>/<textarea>/<button> elements
 * directly into the host page's own DOM — no isolated document, no
 * separate stylesheet context — so the host site's own CSS (fonts, text
 * color, any existing input/button/form rules) applies to it exactly like
 * it would to any other form on the page. The few default styles this
 * script does add (border, padding, radius on inputs/buttons) are written
 * with :where(), which carries zero CSS specificity, so literally any rule
 * the host site already has for those elements wins automatically — these
 * are fallbacks for an otherwise-unstyled page, not an opinion this script
 * is trying to defend.
 *
 * One caveat worth knowing: a host site that resets ALL form elements via
 * a global reset (Tailwind's preflight, for example) removes borders the
 * same way it would for the site's own native inputs — the fallback below
 * can't outrank that reset, since it's also a plain element-level rule.
 * If that happens, add a couple of lines targeting
 * `[data-gotech-lead-form] input` in the host site's own stylesheet.
 *
 * Two things you can set directly on your <div data-gotech-lead-form>
 * (as a style attribute, or in your own stylesheet) without touching this
 * script at all:
 *   font-size    overall size of the form — defaults to 14px rather than
 *                inheriting the page's own text size, which could be much
 *                larger depending on where you drop it in.
 *   --glf-accent color of the submit button and the active language pill
 *                — defaults to GoTech's indigo (#4f46e5).
 * e.g. <div data-gotech-lead-form style="--glf-accent:#16a34a"></div>
 */
(function () {
  "use strict";

  var CURRENT_SCRIPT = document.currentScript;

  var SCRIPT_URL;
  try {
    SCRIPT_URL = new URL(CURRENT_SCRIPT.src);
  } catch (e) {
    SCRIPT_URL = null;
  }

  function apiUrl() {
    return SCRIPT_URL ? SCRIPT_URL.origin + "/api/public/lead" : "/api/public/lead";
  }
  var API_URL = apiUrl();

  var STORAGE_KEY = "gotechLeadFormLang";

  function isValidLang(value) {
    return value === "en" || value === "zh" || value === "ms";
  }

  // The ?lang= on THIS script's own src — how a site owner pins a page's
  // embed to match that page's language (see the file-level comment above).
  function scriptLang() {
    var value = SCRIPT_URL ? SCRIPT_URL.searchParams.get("lang") : null;
    return isValidLang(value) ? value : null;
  }

  function storedLang() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return isValidLang(value) ? value : null;
    } catch (e) {
      return null;
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // Ignore — not essential, the switcher still works for this visit.
    }
  }

  // A visitor's own explicit choice (if they ever switched) beats the
  // page's default, same as the hosted /lead form; the script's own
  // ?lang= is that default whenever nothing's been chosen yet.
  function detectLang() {
    return storedLang() || scriptLang() || "en";
  }

  var currentLang = detectLang();

  // Mirrors LEAD_FORM_STRINGS in src/lib/lead-form-i18n.ts — this file is a
  // standalone static asset with no access to that module, so all three
  // languages are duplicated by hand; keep the two in sync if either changes.
  var TRANSLATIONS = {
    en: {
      nameLabel: "Name",
      namePlaceholder: "Jane Smith",
      emailLabel: "Email",
      emailPlaceholder: "jane@company.com",
      phoneLabel: "Phone",
      phonePlaceholder: "+60 12 345 6789",
      phoneHint: "Include the country code with a + sign, e.g. +60 12 345 6789.",
      companyLabel: "Company",
      companyPlaceholder: "Optional",
      messageLabel: "What are you looking to build?",
      messagePlaceholder: "Tell us a bit about your project…",
      submit: "Get in touch",
      submitting: "Sending…",
      success: "Thanks! We'll be in touch shortly.",
      errors: {
        name_required: "Name is required",
        email_required: "Email is required",
        email_invalid: "Enter a valid email",
        phone_required: "Phone number is required",
        phone_invalid: "Include the country code with a + sign, e.g. +60 12 345 6789.",
        pipeline_not_ready: "The system isn't set up yet — please try again shortly.",
        invalid_submission: "Please check the form and try again.",
        generic: "Something went wrong. Please try again.",
      },
    },
    zh: {
      nameLabel: "姓名",
      namePlaceholder: "Jane Smith",
      emailLabel: "电子邮件",
      emailPlaceholder: "jane@company.com",
      phoneLabel: "电话号码",
      phonePlaceholder: "+60 12 345 6789",
      phoneHint: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
      companyLabel: "公司",
      companyPlaceholder: "选填",
      messageLabel: "您想打造什么项目？",
      messagePlaceholder: "简单介绍一下您的项目…",
      submit: "联系我们",
      submitting: "发送中…",
      success: "谢谢！我们会尽快与您联系。",
      errors: {
        name_required: "请填写姓名",
        email_required: "请填写电子邮件",
        email_invalid: "请输入有效的电子邮件地址",
        phone_required: "请填写电话号码",
        phone_invalid: "请附上国家代码及 + 号，例如 +60 12 345 6789。",
        pipeline_not_ready: "系统尚未设置完成，请稍后再试。",
        invalid_submission: "请检查表单内容后重试。",
        generic: "出现错误，请重试。",
      },
    },
    ms: {
      nameLabel: "Nama",
      namePlaceholder: "Jane Smith",
      emailLabel: "E-mel",
      emailPlaceholder: "jane@company.com",
      phoneLabel: "Nombor Telefon",
      phonePlaceholder: "+60 12 345 6789",
      phoneHint: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
      companyLabel: "Syarikat",
      companyPlaceholder: "Pilihan",
      messageLabel: "Apakah projek yang anda ingin bina?",
      messagePlaceholder: "Ceritakan sedikit tentang projek anda…",
      submit: "Hubungi Kami",
      submitting: "Menghantar…",
      success: "Terima kasih! Kami akan menghubungi anda tidak lama lagi.",
      errors: {
        name_required: "Nama diperlukan",
        email_required: "E-mel diperlukan",
        email_invalid: "Sila masukkan e-mel yang sah",
        phone_required: "Nombor telefon diperlukan",
        phone_invalid: "Sertakan kod negara dengan tanda +, contohnya +60 12 345 6789.",
        pipeline_not_ready: "Sistem belum bersedia — sila cuba sebentar lagi.",
        invalid_submission: "Sila semak borang dan cuba lagi.",
        generic: "Berlaku ralat. Sila cuba lagi.",
      },
    },
  };

  var LANG_OPTIONS = [
    { code: "en", label: "EN" },
    { code: "zh", label: "中文" },
    { code: "ms", label: "BM" },
  ];

  var STYLE_ID = "gotech-lead-form-style";
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      // A compact, predictable base size — font:inherit further down would
      // otherwise pick up whatever ambient font-size happens to cascade to
      // wherever the container sits on the host page (a hero section, a
      // large-type marketing block, etc.), which is what made the form
      // look oversized on some sites. Zero specificity, so a host that
      // wants it bigger/smaller just sets font-size on its own
      // [data-gotech-lead-form] element — no need to touch every field.
      // --glf-accent is the one color knob: set it the same way (even
      // inline, e.g. <div data-gotech-lead-form style="--glf-accent:#16a34a">)
      // to match the submit button and the active language pill to your
      // site's brand color without overriding either rule directly.
      ":where([data-gotech-lead-form]){font-size:14px;--glf-accent:#4f46e5}",
      // Layout only — spacing/structure, not appearance. Low-impact, kept
      // at normal specificity since it's unlikely any host page has an
      // opinion about how THIS particular form's fields are arranged.
      // Deliberately no max-width here: the form fills whatever width the
      // host page's own [data-gotech-lead-form] container is — a site that
      // wants a narrower form controls that on the container itself.
      "[data-gotech-lead-form] form{display:flex;flex-direction:column;gap:1em;width:100%}",
      "[data-gotech-lead-form] .glf-field{display:flex;flex-direction:column;gap:.35em}",
      "[data-gotech-lead-form] .glf-row{display:grid;grid-template-columns:1fr;gap:1em}",
      "@media (min-width:640px){[data-gotech-lead-form] .glf-row{grid-template-columns:1fr 1fr}}",
      "[data-gotech-lead-form] .glf-hp{position:absolute;left:-9999px}",
      "[data-gotech-lead-form] .glf-error{color:#dc2626;font-size:.9em;margin:0}",
      "[data-gotech-lead-form] .glf-success{font-size:.95em;margin:0}",
      "[data-gotech-lead-form] .glf-required{color:#f43f5e}",
      "[data-gotech-lead-form] .glf-hint{font-size:.8em;opacity:.7;margin:0}",
      "[data-gotech-lead-form] .glf-langs{display:flex;justify-content:flex-end;gap:.25em;margin-bottom:.75em}",
      // Active-language state is deliberately normal-specificity (not
      // :where()) so it's always visible regardless of host button
      // styling — it's the one opinion this widget needs to hold onto.
      // The color itself still comes from --glf-accent, so it's not
      // locked to GoTech's own indigo on someone else's site.
      "[data-gotech-lead-form] .glf-lang-btn-active{background:var(--glf-accent);border-color:var(--glf-accent);color:#fff}",
      // Appearance fallbacks — zero specificity via :where(), so any host
      // site rule for input/textarea/button/label always wins over these.
      ":where([data-gotech-lead-form] label){font-size:.9em}",
      ":where([data-gotech-lead-form] input,[data-gotech-lead-form] textarea){" +
        "font:inherit;color:inherit;width:100%;box-sizing:border-box;" +
        "padding:.5em .75em;border:1px solid #ccc;border-radius:4px;background:#fff}",
      // Filled with --glf-accent by default (rather than a plain outline)
      // so an unstyled host page still gets a real-looking, on-brand
      // button instead of a plain box — still zero-specificity, so a host
      // that already styles its own buttons overrides this outright.
      ":where([data-gotech-lead-form] button[type=submit]){" +
        "font:inherit;padding:.5em 1.1em;border:1px solid var(--glf-accent);" +
        "border-radius:4px;background:var(--glf-accent);color:#fff;cursor:pointer}",
      ":where([data-gotech-lead-form] button:not(:disabled):hover){opacity:.85}",
      ":where([data-gotech-lead-form] button:disabled){opacity:.6;cursor:default}",
      ":where([data-gotech-lead-form] .glf-lang-btn){" +
        "font:inherit;font-size:.8em;padding:.3em .6em;border:1px solid #ccc;" +
        "border-radius:4px;background:#fff;cursor:pointer;color:inherit}",
    ].join("");
    document.head.appendChild(style);
  }

  var uid = 0;
  function nextId(prefix) {
    uid += 1;
    return "glf-" + prefix + "-" + uid;
  }

  function makeInput(name, type, required, placeholder) {
    var el = document.createElement("input");
    el.name = name;
    el.type = type;
    if (required) el.required = true;
    if (placeholder) el.placeholder = placeholder;
    return el;
  }

  function makeField(labelText, controlEl, required, hintText) {
    var wrap = document.createElement("div");
    wrap.className = "glf-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    if (required) {
      var mark = document.createElement("span");
      mark.className = "glf-required";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = " *";
      label.appendChild(mark);
    }
    var id = nextId(controlEl.name || "field");
    label.setAttribute("for", id);
    controlEl.id = id;
    wrap.appendChild(label);
    wrap.appendChild(controlEl);
    if (hintText) {
      var hint = document.createElement("p");
      hint.className = "glf-hint";
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  // Two fields side by side above 640px (matches Tailwind's `sm:` breakpoint,
  // so the hosted /lead form and this widget switch to two columns at the
  // same width) — stacked on narrower screens.
  function makeRow(fieldA, fieldB) {
    var row = document.createElement("div");
    row.className = "glf-row";
    row.appendChild(fieldA);
    row.appendChild(fieldB);
    return row;
  }

  // Captures whatever the visitor already typed before a re-render (a
  // language switch rebuilds the DOM from scratch) so switching languages
  // mid-fill-in never wipes their answers — same reasoning as the
  // controlled-inputs fix in the React LeadCaptureForm.
  function getValues(container) {
    var form = container.querySelector("form");
    function v(name) {
      if (!form) return "";
      var el = form.elements.namedItem(name);
      return el ? el.value : "";
    }
    return {
      name: v("name"),
      email: v("email"),
      phone: v("phone"),
      companyName: v("companyName"),
      message: v("message"),
    };
  }

  function makeLangSwitcher() {
    var wrap = document.createElement("div");
    wrap.className = "glf-langs";
    LANG_OPTIONS.forEach(function (option) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "glf-lang-btn" + (option.code === currentLang ? " glf-lang-btn-active" : "");
      btn.textContent = option.label;
      btn.setAttribute("aria-pressed", String(option.code === currentLang));
      btn.addEventListener("click", function () {
        if (currentLang === option.code) return;
        currentLang = option.code;
        storeLang(option.code);
        renderAll();
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function render(container) {
    ensureStyles();
    var preserved = getValues(container);
    var t = TRANSLATIONS[currentLang];
    container.innerHTML = "";
    container.appendChild(makeLangSwitcher());

    var form = document.createElement("form");

    // Honeypot: hidden from real visitors, often filled in by bots. Never
    // shown to assistive tech either (aria-hidden on the wrapper), so it
    // doesn't need translating.
    var hp = document.createElement("div");
    hp.className = "glf-hp";
    hp.setAttribute("aria-hidden", "true");
    var hpLabel = document.createElement("label");
    hpLabel.textContent = "Leave this field blank";
    var hpInput = makeInput("website", "text", false, "");
    hpInput.id = nextId("website");
    hpInput.tabIndex = -1;
    hpInput.autocomplete = "off";
    hpLabel.setAttribute("for", hpInput.id);
    hp.appendChild(hpLabel);
    hp.appendChild(hpInput);
    form.appendChild(hp);

    var nameInput = makeInput("name", "text", true, t.namePlaceholder);
    nameInput.value = preserved.name;
    var emailInput = makeInput("email", "email", true, t.emailPlaceholder);
    emailInput.value = preserved.email;
    var phoneInput = makeInput("phone", "tel", true, t.phonePlaceholder);
    phoneInput.value = preserved.phone;
    var companyInput = makeInput("companyName", "text", false, t.companyPlaceholder);
    companyInput.value = preserved.companyName;
    var messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.rows = 4;
    messageInput.placeholder = t.messagePlaceholder;
    messageInput.value = preserved.message;

    form.appendChild(makeRow(
      makeField(t.nameLabel, nameInput, true),
      makeField(t.phoneLabel, phoneInput, true, t.phoneHint),
    ));
    form.appendChild(makeRow(
      makeField(t.emailLabel, emailInput, true),
      makeField(t.companyLabel, companyInput),
    ));
    form.appendChild(makeField(t.messageLabel, messageInput));

    var errorEl = document.createElement("p");
    errorEl.className = "glf-error";
    errorEl.style.display = "none";
    form.appendChild(errorEl);

    var submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = t.submit;
    form.appendChild(submitBtn);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.textContent = t.submitting;

      var payload = {
        website: hpInput.value,
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        companyName: companyInput.value,
        message: messageInput.value,
      };

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { ok: res.ok && data && data.ok === true, code: data && data.code };
            });
        })
        .then(function (result) {
          if (result.ok) {
            container.innerHTML = "";
            container.appendChild(makeLangSwitcher());
            var success = document.createElement("p");
            success.className = "glf-success";
            success.textContent = t.success;
            container.appendChild(success);
          } else {
            errorEl.textContent = (result.code && t.errors[result.code]) || t.errors.generic;
            errorEl.style.display = "";
            submitBtn.disabled = false;
            submitBtn.textContent = t.submit;
          }
        })
        .catch(function () {
          errorEl.textContent = t.errors.generic;
          errorEl.style.display = "";
          submitBtn.disabled = false;
          submitBtn.textContent = t.submit;
        });
    });

    container.appendChild(form);
  }

  function renderAll() {
    var containers = document.querySelectorAll("[data-gotech-lead-form]");
    for (var i = 0; i < containers.length; i++) {
      render(containers[i]);
    }
  }

  function init() {
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
