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
 * skips its language switcher and keeps only what a subscribe box
 * actually needs — name/email/phone plus a channel choice (email,
 * WhatsApp, or both).
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
    intro: "Practical tips and guides to help grow your business — delivered however you prefer.",
    nameLabel: "Name",
    namePlaceholder: "Jane Smith",
    emailLabel: "Email",
    emailPlaceholder: "jane@company.com",
    phoneLabel: "Phone",
    phonePlaceholder: "+1 555 123 4567",
    channelLabel: "Get updates via",
    channelOptions: [
      { value: "BOTH", label: "Both" },
      { value: "EMAIL", label: "Email" },
      { value: "WHATSAPP", label: "WhatsApp" },
    ],
    noSpam: "No spam, ever — unsubscribe from email or WhatsApp updates at any time.",
    submit: "Subscribe",
    submitting: "Subscribing…",
    success: "You're subscribed — thanks for signing up!",
    errors: {
      name_required: "Name is required",
      email_required: "Email is required",
      email_invalid: "Enter a valid email",
      phone_required: "Phone number is required",
      channel_invalid: "Choose how you'd like to get updates",
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
      // Two explicit horizontal rows (fields, then channel + submit) rather
      // than one field per line — fits a footer's wide-but-short shape.
      // Each row is its own flex-wrap container with a fixed gap, so on a
      // wide container (a footer) everything in that row sits on one line,
      // while a narrow one (a sidebar, mobile) still falls back to
      // stacking, since every item keeps its own min-width and wraps
      // freely — same "adapts to the space it's given" approach as the
      // rest of this widget.
      "[data-gotech-newsletter-form] form{display:flex;flex-direction:column;gap:.6em;width:100%}",
      "[data-gotech-newsletter-form] .gnf-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:.6em 1em}",
      "[data-gotech-newsletter-form] .gnf-field{display:flex;flex-direction:column;gap:.35em;flex:1 1 130px;min-width:110px}",
      "[data-gotech-newsletter-form] .gnf-field-wide{flex:2 1 220px;min-width:200px}",
      "[data-gotech-newsletter-form] .gnf-hp{position:absolute;left:-9999px}",
      "[data-gotech-newsletter-form] .gnf-error{color:#dc2626;font-size:.9em;margin:0}",
      "[data-gotech-newsletter-form] .gnf-success{font-size:.95em;margin:0}",
      "[data-gotech-newsletter-form] .gnf-required{color:#f43f5e}",
      "[data-gotech-newsletter-form] .gnf-intro{margin:0 0 .25em;opacity:.75}",
      "[data-gotech-newsletter-form] .gnf-nospam{margin:0;font-size:.85em;opacity:.6}",
      "[data-gotech-newsletter-form] .gnf-channels{display:grid;grid-template-columns:repeat(3,1fr);gap:.5em}",
      "[data-gotech-newsletter-form] .gnf-channel{position:relative}",
      "[data-gotech-newsletter-form] .gnf-channel input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}",
      ":where([data-gotech-newsletter-form] .gnf-channel span){" +
        "display:flex;align-items:center;justify-content:center;text-align:center;" +
        "border:1px solid #ccc;border-radius:4px;padding:.5em .4em;cursor:pointer}",
      "[data-gotech-newsletter-form] .gnf-channel input:checked + span{" +
        "border-color:var(--gnf-accent);color:var(--gnf-accent);font-weight:600}",
      // Appearance fallbacks — zero specificity via :where(), so any host
      // site rule for input/button/label always wins over these.
      ":where([data-gotech-newsletter-form] label){font-size:.9em}",
      ":where([data-gotech-newsletter-form] input){" +
        "font:inherit;color:inherit;width:100%;box-sizing:border-box;" +
        "padding:.5em .75em;border:1px solid #ccc;border-radius:4px;background:#fff}",
      ":where([data-gotech-newsletter-form] button[type=submit]){" +
        "font:inherit;padding:.5em 1.1em;border:1px solid var(--gnf-accent);" +
        "border-radius:4px;background:var(--gnf-accent);color:#fff;cursor:pointer;" +
        "flex:0 0 auto;white-space:nowrap}",
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

    var intro = document.createElement("p");
    intro.className = "gnf-intro";
    intro.textContent = t.intro;
    form.appendChild(intro);

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
    var phoneInput = makeInput("phone", "tel", true, t.phonePlaceholder);

    // Row 1: the three text fields, side by side on anything wide enough
    // (a footer) — see the .gnf-row comment in ensureStyles above.
    var fieldsRow = document.createElement("div");
    fieldsRow.className = "gnf-row";
    fieldsRow.appendChild(makeField(t.nameLabel, nameInput, true));
    fieldsRow.appendChild(makeField(t.emailLabel, emailInput, true));
    fieldsRow.appendChild(makeField(t.phoneLabel, phoneInput, true));
    form.appendChild(fieldsRow);

    var channelWrap = document.createElement("div");
    channelWrap.className = "gnf-field gnf-field-wide";
    var channelLabel = document.createElement("label");
    channelLabel.textContent = t.channelLabel;
    var channelMark = document.createElement("span");
    channelMark.className = "gnf-required";
    channelMark.setAttribute("aria-hidden", "true");
    channelMark.textContent = " *";
    channelLabel.appendChild(channelMark);
    channelWrap.appendChild(channelLabel);

    var channelGroup = document.createElement("div");
    channelGroup.className = "gnf-channels";
    var channelInputs = [];
    for (var c = 0; c < t.channelOptions.length; c++) {
      var opt = t.channelOptions[c];
      var optWrap = document.createElement("label");
      optWrap.className = "gnf-channel";
      var optInput = document.createElement("input");
      optInput.type = "radio";
      optInput.name = "channel";
      optInput.value = opt.value;
      optInput.required = true;
      if (opt.value === "BOTH") optInput.checked = true;
      var optText = document.createElement("span");
      optText.textContent = opt.label;
      optWrap.appendChild(optInput);
      optWrap.appendChild(optText);
      channelGroup.appendChild(optWrap);
      channelInputs.push(optInput);
    }
    channelWrap.appendChild(channelGroup);

    var noSpam = document.createElement("p");
    noSpam.className = "gnf-nospam";
    noSpam.textContent = t.noSpam;
    form.appendChild(noSpam);

    var submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = t.submit;

    // Row 2: the channel choice and the submit button together — the
    // second of the widget's two horizontal lines.
    var actionRow = document.createElement("div");
    actionRow.className = "gnf-row";
    actionRow.appendChild(channelWrap);
    actionRow.appendChild(submitBtn);
    form.appendChild(actionRow);

    var errorEl = document.createElement("p");
    errorEl.className = "gnf-error";
    errorEl.style.display = "none";
    form.appendChild(errorEl);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.textContent = t.submitting;

      var selectedChannel = "";
      for (var ci = 0; ci < channelInputs.length; ci++) {
        if (channelInputs[ci].checked) selectedChannel = channelInputs[ci].value;
      }

      var payload = {
        website: hpInput.value,
        renderedAt: renderedAt,
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        channel: selectedChannel,
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
