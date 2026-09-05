/*
 * GoTech CRM — embeddable lead-capture widget.
 *
 * Drop this on any page:
 *   <div data-gotech-lead-form></div>
 *   <script src="https://<your-crm-domain>/embed/lead-form.js" async></script>
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
 */
(function () {
  "use strict";

  var CURRENT_SCRIPT = document.currentScript;

  function apiUrl() {
    try {
      return new URL(CURRENT_SCRIPT.src).origin + "/api/public/lead";
    } catch (e) {
      return "/api/public/lead";
    }
  }
  var API_URL = apiUrl();

  var STYLE_ID = "gotech-lead-form-style";
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      // Layout only — spacing/structure, not appearance. Low-impact, kept
      // at normal specificity since it's unlikely any host page has an
      // opinion about how THIS particular form's fields are arranged.
      "[data-gotech-lead-form] form{display:flex;flex-direction:column;gap:1em;max-width:28rem}",
      "[data-gotech-lead-form] .glf-field{display:flex;flex-direction:column;gap:.35em}",
      "[data-gotech-lead-form] .glf-hp{position:absolute;left:-9999px}",
      "[data-gotech-lead-form] .glf-error{color:#dc2626;font-size:.9em;margin:0}",
      "[data-gotech-lead-form] .glf-success{font-size:.95em;margin:0}",
      // Appearance fallbacks — zero specificity via :where(), so any host
      // site rule for input/textarea/button/label always wins over these.
      ":where([data-gotech-lead-form] label){font-size:.9em}",
      ":where([data-gotech-lead-form] input,[data-gotech-lead-form] textarea){" +
        "font:inherit;color:inherit;width:100%;box-sizing:border-box;" +
        "padding:.6em .75em;border:1px solid #ccc;border-radius:4px;background:#fff}",
      ":where([data-gotech-lead-form] button){" +
        "font:inherit;padding:.65em 1.4em;border:1px solid currentColor;" +
        "border-radius:4px;background:transparent;cursor:pointer}",
      ":where([data-gotech-lead-form] button:disabled){opacity:.6;cursor:default}",
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

  function makeField(labelText, controlEl) {
    var wrap = document.createElement("div");
    wrap.className = "glf-field";
    var label = document.createElement("label");
    label.textContent = labelText;
    var id = nextId(controlEl.name || "field");
    label.setAttribute("for", id);
    controlEl.id = id;
    wrap.appendChild(label);
    wrap.appendChild(controlEl);
    return wrap;
  }

  function render(container) {
    ensureStyles();
    container.innerHTML = "";

    var form = document.createElement("form");

    // Honeypot: hidden from real visitors, often filled in by bots.
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

    var nameInput = makeInput("name", "text", true, "Jane Smith");
    var emailInput = makeInput("email", "email", true, "jane@company.com");
    var phoneInput = makeInput("phone", "tel", false, "Optional — e.g. +60 12 345 6789");
    var companyInput = makeInput("companyName", "text", false, "Optional");
    var messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.rows = 4;
    messageInput.placeholder = "Tell us a bit about your project…";

    form.appendChild(makeField("Name", nameInput));
    form.appendChild(makeField("Email", emailInput));
    form.appendChild(makeField("Phone", phoneInput));
    form.appendChild(makeField("Company", companyInput));
    form.appendChild(makeField("What are you looking to build?", messageInput));

    var errorEl = document.createElement("p");
    errorEl.className = "glf-error";
    errorEl.style.display = "none";
    form.appendChild(errorEl);

    var submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Get in touch";
    form.appendChild(submitBtn);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

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
              return { ok: res.ok && data && data.ok === true, error: data && data.error };
            });
        })
        .then(function (result) {
          if (result.ok) {
            container.innerHTML = "";
            var success = document.createElement("p");
            success.className = "glf-success";
            success.textContent = "Thanks! We'll be in touch shortly.";
            container.appendChild(success);
          } else {
            errorEl.textContent = result.error || "Something went wrong. Please try again.";
            errorEl.style.display = "";
            submitBtn.disabled = false;
            submitBtn.textContent = "Get in touch";
          }
        })
        .catch(function () {
          errorEl.textContent = "Something went wrong. Please try again.";
          errorEl.style.display = "";
          submitBtn.disabled = false;
          submitBtn.textContent = "Get in touch";
        });
    });

    container.appendChild(form);
  }

  function init() {
    var containers = document.querySelectorAll("[data-gotech-lead-form]");
    for (var i = 0; i < containers.length; i++) {
      render(containers[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
