/*
 * GoTech CRM — embeddable newsletter subscribe widget.
 *
 * Drop this on any page:
 *   <div data-gotech-newsletter-form></div>
 *   <script src="https://<your-crm-domain>/embed/newsletter-form.js" async></script>
 *
 * Same "renders directly into the host page's own DOM" approach as the
 * lead-capture widget (public/embed/lead-form.js) — no iframe, no isolated
 * document, so the host site's own CSS (fonts, text color, any existing
 * input/button styling) applies to it exactly like any other form on the
 * page. See that file's own comments for the full reasoning; this one
 * skips its language switcher (a one-field "just my email" form doesn't
 * carry the same translation weight the lead form's does) and keeps only
 * what a subscribe box actually needs.
 *
 * Two things you can set directly on your <div data-gotech-newsletter-form>
 * (as a style attribute, or in your own stylesheet) without touching this
 * script at all:
 *   font-size    overall size of the form — defaults to the page's own
 *                text size clamped between 13-16px.
 *   --gnf-accent color of the submit button — defaults to a neutral
 *                near-black (#111827), not GoTech's own indigo, since this
 *                form is meant to sit on other sites with their own brand
 *                color.
 * e.g. <div data-gotech-newsletter-form style="--gnf-accent:#16a34a"></div>
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

  var API_URL = SCRIPT_URL ? SCRIPT_URL.origin + "/api/public/newsletter-subscribe" : "/api/public/newsletter-subscribe";

  var STRINGS = {
    nameLabel: "Name",
    namePlaceholder: "Jane Smith",
    emailLabel: "Email",
    emailPlaceholder: "jane@company.com",
    phoneLabel: "Phone",
    phonePlaceholder: "+1 555 123 4567",
    submit: "Subscribe",
    submitting: "Subscribing…",
    success: "You're subscribed — thanks for signing up!",
    errors: {
      name_required: "Name is required",
      email_required: "Email is required",
      email_invalid: "Enter a valid email",
      rate_limited: "Too many attempts — please try again later.",
      not_configured: "Subscriptions aren't set up yet — please try again shortly.",
      invalid_submission: "Please check the form and try again.",
      generic: "Something went wrong. Please try again.",
    },
  };

  var STYLE_ID = "gotech-newsletter-form-style";
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      // Same clamp()/CSS-variable approach as the lead-form widget — see
      // its own comments for why this beats a flat px value or font:inherit.
      ":where([data-gotech-newsletter-form]){font-size:clamp(13px,1em,16px);--gnf-accent:#111827}",
      "[data-gotech-newsletter-form] form{display:flex;flex-direction:column;gap:1em;width:100%}",
      "[data-gotech-newsletter-form] .gnf-field{display:flex;flex-direction:column;gap:.35em}",
      "[data-gotech-newsletter-form] .gnf-hp{position:absolute;left:-9999px}",
      "[data-gotech-newsletter-form] .gnf-error{color:#dc2626;font-size:.9em;margin:0}",
      "[data-gotech-newsletter-form] .gnf-success{font-size:.95em;margin:0}",
      "[data-gotech-newsletter-form] .gnf-required{color:#f43f5e}",
      // Appearance fallbacks — zero specificity via :where(), so any host
      // site rule for input/button/label always wins over these.
      ":where([data-gotech-newsletter-form] label){font-size:.9em}",
      ":where([data-gotech-newsletter-form] input){" +
        "font:inherit;color:inherit;width:100%;box-sizing:border-box;" +
        "padding:.5em .75em;border:1px solid #ccc;border-radius:4px;background:#fff}",
      ":where([data-gotech-newsletter-form] button[type=submit]){" +
        "font:inherit;padding:.5em 1.1em;border:1px solid var(--gnf-accent);" +
        "border-radius:4px;background:var(--gnf-accent);color:#fff;cursor:pointer}",
      ":where([data-gotech-newsletter-form] button:not(:disabled):hover){opacity:.85}",
      ":where([data-gotech-newsletter-form] button:disabled){opacity:.6;cursor:default}",
    ].join("");
    document.head.appendChild(style);
  }

  var uid = 0;
  function nextId(prefix) {
    uid += 1;
    return "gnf-" + prefix + "-" + uid;
  }

  function makeInput(name, type, required, placeholder) {
    var el = document.createElement("input");
    el.name = name;
    el.type = type;
    if (required) el.required = true;
    if (placeholder) el.placeholder = placeholder;
    return el;
  }

  function makeField(labelText, controlEl, required) {
    var wrap = document.createElement("div");
    wrap.className = "gnf-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    if (required) {
      var mark = document.createElement("span");
      mark.className = "gnf-required";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = " *";
      label.appendChild(mark);
    }
    var id = nextId(controlEl.name || "field");
    label.setAttribute("for", id);
    controlEl.id = id;
    wrap.appendChild(label);
    wrap.appendChild(controlEl);
    return wrap;
  }

  function render(container) {
    ensureStyles();
    var t = STRINGS;
    container.innerHTML = "";

    var form = document.createElement("form");

    // Honeypot: hidden from real visitors, often filled in by bots. Never
    // shown to assistive tech either (aria-hidden on the wrapper).
    var hp = document.createElement("div");
    hp.className = "gnf-hp";
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

    // Set once, at render — the server rejects a submission that arrives
    // too soon after this, since no human reads the form and types an
    // answer that fast. See lead-spam-guard.ts (shared with the lead form).
    var renderedAt = Date.now();

    var nameInput = makeInput("name", "text", true, t.namePlaceholder);
    var emailInput = makeInput("email", "email", true, t.emailPlaceholder);
    var phoneInput = makeInput("phone", "tel", false, t.phonePlaceholder);

    form.appendChild(makeField(t.nameLabel, nameInput, true));
    form.appendChild(makeField(t.emailLabel, emailInput, true));
    form.appendChild(makeField(t.phoneLabel, phoneInput));

    var errorEl = document.createElement("p");
    errorEl.className = "gnf-error";
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
        renderedAt: renderedAt,
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
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
            var success = document.createElement("p");
            success.className = "gnf-success";
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
    var containers = document.querySelectorAll("[data-gotech-newsletter-form]");
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
