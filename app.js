// Page behavior: product grid, filters, product details, cart, PayPal checkout,
// FAQ & policies and the contact form. You shouldn't need to edit this.
// Products, shop settings and the FAQ live in the data/ folder, which the
// online editor (Pages CMS) changes for you.

(async () => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );

  const slugify = (text) =>
    String(text ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";

  const grid = $("#grid");
  const empty = $("#empty");
  const count = $("#result-count");

  // ── Load the data files ───────────────────────────────────
  // "no-cache" asks the host whether a file changed, so edits show up right away.
  const loadJson = (url) =>
    fetch(url, { cache: "no-cache" }).then((res) => (res.ok ? res.json() : Promise.reject(new Error(url))));

  let shopData, productData, helpData;
  try {
    [shopData, productData, helpData] = await Promise.all([
      loadJson("data/shop.json"),
      loadJson("data/products.json"),
      loadJson("data/help.json").catch(() => ({})),
    ]);
  } catch (err) {
    console.error(err);
    grid.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "The product list couldn't load. Please refresh the page.";
    return;
  }

  const SHOP = {
    name: "Wireframe Garage",
    email: "",
    shipTime: "ships in 3–5 business days",
    shippingCost: 0,
    currency: "USD",
    paypalClientId: "",
    formEndpoint: "",
    ...Object.fromEntries(Object.entries(shopData || {}).filter(([, v]) => v !== null && v !== "")),
  };

  // ── Products ──────────────────────────────────────────────
  // Ways a product can be sold. A way only counts if it has a price above 0.
  const KINDS = ["file", "printed", "sticker"];
  const KIND_LABEL = { file: "Model file", printed: "Printed part", sticker: "Sticker" };
  const CHIP_LABEL = { file: "File", printed: "Printed", sticker: "Sticker" };
  const MAX_QTY = 10;

  const offer = (o) => (o && Number(o.price) > 0 ? { ...o, price: Number(o.price) } : null);
  const photoPath = (src) => String(src).trim().replace(/^\/+/, ""); // keep paths relative to the site

  const PRODUCTS = (() => {
    const list = Array.isArray(productData) ? productData : productData?.products;
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .filter((p) => p && p.name && !p.hidden)
      .map((p) => {
        // The link name comes from the product name, e.g. ?part=door-lock-knobs-pair
        const base = slugify(p.name);
        let id = base;
        for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
        seen.add(id);
        return {
          ...p,
          id,
          category: p.category || "Other",
          fitment: p.fitment || "",
          description: p.description || "",
          notes: (Array.isArray(p.notes) ? p.notes : []).filter(Boolean),
          photos: [].concat(p.photos || []).filter(Boolean).map(photoPath),
          file: offer(p.file),
          printed: offer(p.printed),
          sticker: offer(p.sticker),
        };
      })
      .filter((p) => KINDS.some((k) => p[k])); // nothing to buy → not shown
  })();

  const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
  const kindDetail = (p, kind) =>
    kind === "file"
      ? p.file.formats || "STL"
      : kind === "printed"
        ? p.printed.material || "Printed to order"
        : p.sticker.details || "Vinyl sticker";

  // ── Money (worked out in cents so totals never drift) ─────
  const CURRENCY = SHOP.currency || "USD";
  const wholeFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const centsFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY });
  const toCents = (n) => Math.round(Number(n) * 100);
  const money = (c) => (c % 100 === 0 ? wholeFmt : centsFmt).format(c / 100);
  const decimal = (c) => (c / 100).toFixed(2);

  const CUBE_ICON =
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="M24 4 42 14v20L24 44 6 34V14z"/><path d="M6 14l18 10 18-10M24 24v20"/></svg>';
  const LINK_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>';

  const state = { type: "all", category: "all", query: "" };

  const dialog = $("#product-dialog");
  const dialogBody = $("#dialog-body");
  const form = $("#contact-form");
  const formStatus = $("#form-status");

  const cartPanel = $("#cart");
  const cartBackdrop = $("#cart-backdrop");
  const cartButton = $("#cart-button");
  const cartCount = $("#cart-count");
  const cartBody = $("#cart-body");
  const cartFoot = $("#cart-foot");
  const checkoutArea = $("#checkout");
  const checkoutNote = $("#checkout-note");

  // ── Shop details ──────────────────────────────────────────
  $$("[data-shop-name]").forEach((el) => (el.textContent = SHOP.name));
  const shipTime = SHOP.shipTime.charAt(0).toUpperCase() + SHOP.shipTime.slice(1);
  $$("[data-ship-time]").forEach((el) => (el.textContent = shipTime));
  const footerEmail = $("#footer-email");
  footerEmail.textContent = SHOP.email;
  footerEmail.href = "mailto:" + SHOP.email;
  $("#year").textContent = new Date().getFullYear();
  const pageTitle = document.title;

  // ── Mobile menu ───────────────────────────────────────────
  const menuButton = $(".menu-toggle");
  const nav = $("#site-nav");
  const setMenu = (open) => {
    menuButton.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  };
  menuButton.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });

  // ── Filters ───────────────────────────────────────────────
  const categorySelect = $("#category");
  [...new Set(PRODUCTS.map((p) => p.category))].forEach((c) => categorySelect.add(new Option(c, c)));

  // Hide a type button (e.g. Stickers) when nothing is sold that way
  $$(".segmented button").forEach((btn) => {
    const type = btn.dataset.type;
    if (type !== "all" && !PRODUCTS.some((p) => p[type])) btn.hidden = true;
    btn.addEventListener("click", () => {
      state.type = type;
      $$(".segmented button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      render();
    });
  });
  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    render();
  });
  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  const matches = (p) => {
    if (state.type !== "all" && !p[state.type]) return false;
    if (state.category !== "all" && p.category !== state.category) return false;
    if (state.query) {
      const text = [p.name, p.category, p.fitment, p.description].join(" ").toLowerCase();
      if (!text.includes(state.query)) return false;
    }
    return true;
  };

  // ── Product grid ──────────────────────────────────────────
  const partUrl = (id) => {
    const url = new URL(location.href);
    url.search = "?part=" + encodeURIComponent(id);
    url.hash = "";
    return url.href;
  };

  const media = (p, cls) =>
    p.photos.length
      ? `<img class="${cls}" src="${esc(p.photos[0])}" alt="${esc(p.name)}" loading="lazy">`
      : `<div class="${cls} placeholder" aria-hidden="true">${CUBE_ICON}<span>${esc(p.category)}</span></div>`;

  const priceChips = (p) =>
    KINDS.filter((k) => p[k])
      .map((k) => `<span class="chip"><span>${CHIP_LABEL[k]}</span>${money(toCents(p[k].price))}</span>`)
      .join("");

  function render() {
    const list = PRODUCTS.filter(matches);
    grid.innerHTML = list
      .map(
        (p) => `
        <article class="card product">
          ${media(p, "product-media")}
          <div class="product-body">
            <p class="tag product-cat">${esc(p.category)}</p>
            <h3><a class="product-link" href="?part=${encodeURIComponent(p.id)}" data-id="${esc(p.id)}">${esc(p.name)}</a></h3>
            <p class="product-fit">${esc(p.fitment)}</p>
            <div class="chips">${priceChips(p)}</div>
          </div>
        </article>`
      )
      .join("");

    empty.hidden = list.length > 0;
    const noun = PRODUCTS.length === 1 ? "item" : "items";
    count.textContent =
      list.length === PRODUCTS.length ? `${PRODUCTS.length} ${noun}` : `${list.length} of ${PRODUCTS.length} ${noun}`;
  }

  grid.addEventListener("click", (e) => {
    const link = e.target.closest(".product-link");
    // Let ctrl/cmd-click and middle-click open the product in a new tab as normal
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openProduct(link.dataset.id);
  });

  // ── Product details ───────────────────────────────────────
  function option(p, kind) {
    const detail =
      kind === "file" ? `${kindDetail(p, kind)} · emailed after purchase` : `${kindDetail(p, kind)} · ${SHOP.shipTime}`;
    return `
      <div class="option">
        <div class="option-info"><strong>${KIND_LABEL[kind]}</strong><span>${esc(detail)}</span></div>
        <div class="option-buy">
          <span class="price">${money(toCents(p[kind].price))}</span>
          <button class="btn ${kind === "file" ? "btn-ghost" : "btn-primary"}" type="button"
            data-add="${esc(p.id)}" data-kind="${kind}"
            aria-label="Add ${KIND_LABEL[kind].toLowerCase()} to cart">Add to cart</button>
        </div>
      </div>`;
  }

  function gallery(p) {
    if (p.photos.length < 2) return media(p, "dialog-media");
    const thumbs = p.photos
      .map(
        (src, i) => `
        <button type="button" class="thumb" data-photo="${esc(src)}" aria-label="Photo ${i + 1}" aria-pressed="${i === 0}">
          <img src="${esc(src)}" alt="" loading="lazy">
        </button>`
      )
      .join("");
    return `<img class="dialog-media" id="dialog-photo" src="${esc(p.photos[0])}" alt="${esc(p.name)}">
      <div class="thumbs">${thumbs}</div>`;
  }

  let openId = null;

  function openProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    openId = id;

    const notes = p.notes.length ? `<ul class="notes">${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : "";

    dialogBody.innerHTML = `
      <button class="icon-btn dialog-close" type="button" aria-label="Close">×</button>
      ${gallery(p)}
      <div class="dialog-content">
        <p class="tag product-cat">${esc(p.category)}${p.fitment ? ` · ${esc(p.fitment)}` : ""}</p>
        <h2 id="dialog-title">${esc(p.name)}</h2>
        ${p.description ? `<p>${esc(p.description)}</p>` : ""}
        ${notes}
        <div class="options">
          ${KINDS.filter((k) => p[k]).map((k) => option(p, k)).join("")}
        </div>
        ${p.file ? `<p class="option-note">Model files are for your own use. Please don't share or resell them. <a href="#trust">Why?</a></p>` : ""}
        <div class="share-row">
          <button class="share-btn" type="button" data-copy-link>${LINK_ICON}<span>Copy link to this item</span></button>
        </div>
      </div>`;

    // Put the product in the address bar so the link can be copied or bookmarked
    history.replaceState(history.state, "", partUrl(id));
    document.title = `${p.name} · ${SHOP.name}`;
    if (!dialog.open) dialog.showModal();
  }

  dialog.addEventListener("close", () => {
    openId = null;
    document.title = pageTitle;
    const url = new URL(location.href);
    if (url.searchParams.has("part")) {
      url.searchParams.delete("part");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
  });

  async function copyLink(btn) {
    const p = findProduct(openId);
    if (!p) return;
    const url = partUrl(p.id);
    const label = btn.querySelector("span");

    // Phones: open the share sheet (Messages, Facebook, etc.)
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: p.name, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // Older browsers: copy through a temporary text box inside the popup
      const box = document.createElement("textarea");
      box.value = url;
      box.setAttribute("readonly", "");
      box.style.cssText = "position:absolute;opacity:0;pointer-events:none";
      dialogBody.append(box);
      box.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      box.remove();
    }
    label.textContent = copied ? "Link copied" : url;
    if (copied) setTimeout(() => (label.textContent = "Copy link to this item"), 2000);
  }

  dialog.addEventListener("click", (e) => {
    // Close on the × button or a click on the dimmed backdrop
    if (e.target === dialog || e.target.closest(".dialog-close")) {
      dialog.close();
      return;
    }
    // In-page links (like "Why?") close the popup so the page can scroll to them
    if (e.target.closest('a[href^="#"]')) {
      dialog.close();
      return;
    }
    const thumb = e.target.closest("[data-photo]");
    if (thumb) {
      $("#dialog-photo", dialogBody).src = thumb.dataset.photo;
      $$(".thumb", dialogBody).forEach((t) => t.setAttribute("aria-pressed", String(t === thumb)));
      return;
    }
    const share = e.target.closest("[data-copy-link]");
    if (share) {
      copyLink(share);
      return;
    }
    const add = e.target.closest("[data-add]");
    if (add) {
      addToCart(add.dataset.add, add.dataset.kind);
      dialog.close();
      openCart();
    }
  });

  // ── FAQ & policies ────────────────────────────────────────
  // Text from data/help.json. A blank line starts a new paragraph, lines that
  // start with "- " become a bullet list, and {email}, {shipping} and
  // {shipTime} are filled in from the shop settings.
  const tokens = {
    email: SHOP.email,
    shipping: Number(SHOP.shippingCost) > 0 ? money(toCents(SHOP.shippingCost)) : "free",
    shipTime: SHOP.shipTime,
  };
  const linkEmails = (html) =>
    html.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, (m) => `<a href="mailto:${m}">${m}</a>`);

  function richText(src) {
    const text = String(src ?? "").replace(/\{(email|shipping|shipTime)\}/g, (_, k) => tokens[k] ?? "");
    const out = [];
    for (const block of text.split(/\n\s*\n/)) {
      let para = [];
      let items = [];
      const flushPara = () => {
        if (para.length) out.push(`<p>${para.map((l) => linkEmails(esc(l))).join("<br>")}</p>`);
        para = [];
      };
      const flushList = () => {
        if (items.length) out.push(`<ul>${items.map((l) => `<li>${linkEmails(esc(l))}</li>`).join("")}</ul>`);
        items = [];
      };
      for (const raw of block.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        const bullet = line.match(/^[-*•]\s+(.*)/);
        if (bullet) {
          flushPara();
          items.push(bullet[1]);
        } else {
          flushList();
          para.push(line);
        }
      }
      flushPara();
      flushList();
    }
    return out.join("");
  }

  const accordion = (id, title, body) => `
    <details class="qa"${id ? ` id="${esc(id)}"` : ""}>
      <summary>${esc(title)}</summary>
      <div class="qa-body">${richText(body)}</div>
    </details>`;

  (function renderHelp() {
    const faq = (helpData?.faq || []).filter((q) => q && q.question);
    const policies = (helpData?.policies || [])
      .filter((p) => p && p.title)
      .map((p) => {
        let id = slugify(p.title);
        if (document.getElementById(id)) id = "policy-" + id;
        return { ...p, id };
      });

    $("#faq-list").innerHTML = faq.map((q) => accordion("", q.question, q.answer)).join("");
    $("#policy-list").innerHTML = policies.map((p) => accordion(p.id, p.title, p.body)).join("");
    $("#faq-group").hidden = !faq.length;
    $("#policy-group").hidden = !policies.length;
    $("#help").hidden = !faq.length && !policies.length;
    $("#nav-help").hidden = $("#help").hidden;

    $("#footer-links").innerHTML = [
      faq.length ? `<a href="#help">FAQ</a>` : "",
      ...policies.map((p) => `<a href="#${esc(p.id)}">${esc(p.title)}</a>`),
    ].join("");
  })();

  // Links to a policy (e.g. #returns-refunds) open it as well as scrolling to it
  const openFromHash = () => {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target?.matches("details.qa")) target.open = true;
  };
  window.addEventListener("hashchange", openFromHash);
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    const target = link && document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
    if (target?.matches("details.qa")) target.open = true;
  });

  // ── Cart (saved in the visitor's browser) ─────────────────
  const CART_KEY = "starion-cart-v1";
  const lineKey = (l) => `${l.id}:${l.kind}`;

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      // Drop anything that's no longer for sale
      return Array.isArray(saved)
        ? saved
            .filter((l) => KINDS.includes(l.kind) && findProduct(l.id)?.[l.kind] && l.qty > 0)
            .map((l) => ({ ...l, qty: l.kind === "file" ? 1 : Math.min(l.qty, MAX_QTY) }))
        : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* private browsing etc. — cart just won't survive a reload */
    }
  }

  let cart = loadCart(); // [{ id, kind, qty }]
  let lastOrderHtml = ""; // thank-you message shown after a successful payment

  function cartTotals() {
    const lines = cart.map((l) => {
      const product = findProduct(l.id);
      const unit = toCents(product[l.kind].price);
      return { ...l, product, unit, total: unit * l.qty };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const needsShipping = lines.some((l) => l.kind !== "file");
    const shipping = needsShipping ? toCents(SHOP.shippingCost || 0) : 0;
    return { lines, subtotal, shipping, total: subtotal + shipping, needsShipping };
  }

  function addToCart(id, kind) {
    const line = cart.find((l) => l.id === id && l.kind === kind);
    if (!line) cart.push({ id, kind, qty: 1 });
    else if (kind !== "file") line.qty = Math.min(MAX_QTY, line.qty + 1);
    // A model file only ever needs to be bought once, so its qty stays at 1
    cartChanged();
  }

  function changeQty(key, delta) {
    const line = cart.find((l) => lineKey(l) === key);
    if (!line) return;
    line.qty = Math.min(MAX_QTY, line.qty + delta);
    if (line.qty < 1) cart = cart.filter((l) => l !== line);
    cartChanged();
  }

  function removeLine(key) {
    cart = cart.filter((l) => lineKey(l) !== key);
    cartChanged();
  }

  function cartChanged() {
    saveCart();
    setNote("");
    renderCart();
  }

  const lineHtml = (l) => {
    const key = esc(lineKey(l));
    const qty =
      l.kind !== "file"
        ? `<div class="qty" role="group" aria-label="Quantity">
             <button type="button" data-key="${key}" data-qty="-1" aria-label="One fewer">−</button>
             <span>${l.qty}</span>
             <button type="button" data-key="${key}" data-qty="1" aria-label="One more"${l.qty >= MAX_QTY ? " disabled" : ""}>+</button>
           </div>`
        : "";
    return `
      <li class="cart-line">
        <div class="cart-line-info">
          <strong>${esc(l.product.name)}</strong>
          <span>${KIND_LABEL[l.kind]} · ${esc(kindDetail(l.product, l.kind))}</span>
          <button type="button" class="link-btn" data-remove="${key}">Remove</button>
        </div>
        <div class="cart-line-side">
          <span class="cart-line-price">${money(l.total)}</span>
          ${qty}
        </div>
      </li>`;
  };

  function renderCart() {
    const { lines, subtotal, shipping, total, needsShipping } = cartTotals();

    const items = lines.reduce((n, l) => n + l.qty, 0);
    cartCount.textContent = items;
    cartCount.hidden = items === 0;

    if (lastOrderHtml) {
      cartBody.innerHTML = lastOrderHtml;
      cartFoot.hidden = true;
      return;
    }

    if (!lines.length) {
      cartBody.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty.</p>
          <a class="btn btn-ghost" href="#shop" data-close-cart>Browse the shop</a>
        </div>`;
      cartFoot.hidden = true;
      return;
    }

    cartBody.innerHTML = `<ul class="cart-lines">${lines.map(lineHtml).join("")}</ul>`;
    $("#cart-subtotal").textContent = money(subtotal);
    $("#cart-shipping").textContent = needsShipping ? (shipping ? money(shipping) : "Free") : "None — sent by email";
    $("#cart-total").textContent = money(total);
    cartFoot.hidden = false;
    renderPayPalButtons();
  }

  // ── Cart panel open / close ───────────────────────────────
  function openCart() {
    setMenu(false);
    cartPanel.hidden = false;
    cartBackdrop.hidden = false;
    document.body.classList.add("no-scroll");
    setupCheckout();
    renderCart();
    $("#cart-close").focus();
  }

  function closeCart() {
    cartPanel.hidden = true;
    cartBackdrop.hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastOrderHtml) {
      lastOrderHtml = "";
      renderCart();
    }
    cartButton.focus({ preventScroll: true });
  }

  cartButton.addEventListener("click", openCart);
  cartBackdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cartPanel.hidden) closeCart();
  });

  cartPanel.addEventListener("click", (e) => {
    if (e.target.closest("#cart-close, [data-close-cart]")) return closeCart();

    const qtyBtn = e.target.closest("[data-qty]");
    if (qtyBtn) {
      const { key, qty } = qtyBtn.dataset;
      changeQty(key, Number(qty));
      // Keep keyboard focus on the same button after the list redraws
      $(`[data-key="${CSS.escape(key)}"][data-qty="${qty}"]`, cartPanel)?.focus();
      return;
    }

    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) return removeLine(removeBtn.dataset.remove);

    if (e.target.closest("[data-order-request]")) requestOrderByEmail();
  });

  // ── Checkout ──────────────────────────────────────────────
  // PayPal shows a PayPal button and a "Debit or Credit Card" button, so buyers
  // can pay by card without a PayPal account. No server needed.
  let checkoutReady = false;
  let paypalStatus = "idle"; // idle → loading → ready
  let buttonsRendered = false;
  let orderSnapshot = null;

  const setNote = (text) => (checkoutNote.textContent = text);

  function setupCheckout() {
    if (checkoutReady) return;
    checkoutReady = true;

    if (!SHOP.paypalClientId) {
      // Payments not connected yet → let the buyer send their cart as an order request
      checkoutArea.innerHTML = `
        <button class="btn btn-primary btn-block" type="button" data-order-request>Send order request</button>
        <p class="checkout-hint">We'll reply with a link to pay by card or PayPal.</p>`;
      return;
    }

    checkoutArea.innerHTML = `
      <div id="paypal-buttons" class="paypal-buttons"><p class="checkout-hint">Loading secure checkout…</p></div>
      <p class="checkout-hint">Pay with PayPal or any credit/debit card.</p>`;
    loadPayPal();
  }

  function loadPayPal() {
    if (paypalStatus !== "idle") return;
    paypalStatus = "loading";

    const params = new URLSearchParams({
      "client-id": SHOP.paypalClientId,
      currency: CURRENCY,
      intent: "capture",
      "disable-funding": "paylater",
    });
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params}`;
    script.onload = () => {
      paypalStatus = "ready";
      renderPayPalButtons();
    };
    script.onerror = () => {
      script.remove();
      paypalStatus = "idle";
      checkoutReady = false; // try again next time the cart opens
      $("#paypal-buttons").innerHTML = `<p class="checkout-hint">Checkout couldn't load. Check your connection and reopen the cart, or email ${esc(SHOP.email)}.</p>`;
    };
    document.head.append(script);
  }

  function buildOrder(t) {
    const currency_code = CURRENCY;
    return {
      intent: "CAPTURE",
      purchase_units: [
        {
          description: `${SHOP.name} order`.slice(0, 127),
          amount: {
            currency_code,
            value: decimal(t.total),
            breakdown: {
              item_total: { currency_code, value: decimal(t.subtotal) },
              shipping: { currency_code, value: decimal(t.shipping) },
            },
          },
          items: t.lines.map((l) => ({
            name: `${l.product.name} (${KIND_LABEL[l.kind]})`.slice(0, 127),
            sku: `${l.id}-${l.kind}`.slice(0, 127),
            unit_amount: { currency_code, value: decimal(l.unit) },
            quantity: String(l.qty),
            category: l.kind === "file" ? "DIGITAL_GOODS" : "PHYSICAL_GOODS",
          })),
        },
      ],
      application_context: {
        brand_name: SHOP.name.slice(0, 127),
        // Only ask for a shipping address when something physical is being sent
        shipping_preference: t.needsShipping ? "GET_FROM_FILE" : "NO_SHIPPING",
      },
    };
  }

  function renderPayPalButtons() {
    if (buttonsRendered || paypalStatus !== "ready" || cartPanel.hidden || cartFoot.hidden) return;
    buttonsRendered = true;

    const container = $("#paypal-buttons");
    container.innerHTML = "";

    window.paypal
      .Buttons({
        style: { layout: "vertical", shape: "rect", color: "gold", label: "pay" },

        createOrder: (data, actions) => {
          setNote("");
          orderSnapshot = cartTotals();
          if (!orderSnapshot.lines.length) throw new Error("Cart is empty");
          return actions.order.create(buildOrder(orderSnapshot));
        },

        onApprove: async (data, actions) => {
          const result = await actions.order.capture();
          const problem = Array.isArray(result?.details) && result.details[0];
          if (problem?.issue === "INSTRUMENT_DECLINED") return actions.restart(); // let them pick another card
          if (problem || result?.status !== "COMPLETED") {
            setNote(`The payment didn't go through. Please try again, or email ${SHOP.email}.`);
            return;
          }
          showThanks(result, orderSnapshot);
        },

        onCancel: () => setNote("Payment cancelled — your cart is still here."),

        onError: (err) => {
          console.error(err);
          setNote(`The payment didn't go through. Please try again, or email ${SHOP.email}.`);
        },
      })
      .render(container)
      .catch((err) => {
        console.error(err);
        buttonsRendered = false;
        container.innerHTML = `<p class="checkout-hint">Checkout couldn't load. Please email ${esc(SHOP.email)} to order.</p>`;
      });
  }

  function showThanks(result, snapshot) {
    const name = result.payer?.name?.given_name;
    const email = result.payer?.email_address;
    const hasFiles = snapshot.lines.some((l) => l.kind === "file");

    lastOrderHtml = `
      <div class="cart-done">
        <h3>Thanks${name ? `, ${esc(name)}` : ""}! Your order is paid.</h3>
        <p class="muted">Order <code>${esc(result.id)}</code> · ${money(snapshot.total)}</p>
        ${hasFiles ? `<p>Your model files will be emailed to ${email ? `<strong>${esc(email)}</strong>` : "you"} shortly. They're for your own use, so thanks for keeping them to yourself.</p>` : ""}
        ${snapshot.needsShipping ? `<p>Your printed parts and stickers are made to order. The order ${esc(SHOP.shipTime)}, and we'll email tracking once it's on the way.</p>` : ""}
        <p class="muted">Questions? Email <a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a>.</p>
      </div>`;

    cart = [];
    saveCart();
    setNote("");
    renderCart();
  }

  // No PayPal set up yet: turn the cart into a prefilled order request
  function requestOrderByEmail() {
    const t = cartTotals();
    const list = t.lines
      .map((l) => `- ${l.qty} × ${l.product.name} (${KIND_LABEL[l.kind]}) — ${money(l.total)}`)
      .join("\n");
    const shippingLine = t.needsShipping ? `\nShipping: ${t.shipping ? money(t.shipping) : "Free"}` : "";

    $("#subject").value = "Order request";
    $("#message").value = `I'd like to order:\n${list}\n${shippingLine}\nTotal: ${money(t.total)}`;
    closeCart();
    $("#custom").scrollIntoView({ behavior: "smooth" });
    $("#message").focus({ preventScroll: true });
  }

  // ── Contact form ──────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    if (SHOP.formEndpoint) {
      formStatus.textContent = "Sending…";
      try {
        const res = await fetch(SHOP.formEndpoint, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        formStatus.textContent = "Thanks! We'll get back to you soon.";
      } catch {
        formStatus.textContent = `Couldn't send that. Please email ${SHOP.email} instead.`;
      }
      return;
    }

    const subject = data.get("subject") || "Part request";
    const body = `${data.get("message")}\n\n— ${data.get("name")} (${data.get("email")})`;
    window.location.href =
      `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    formStatus.textContent = "Opening your email app…";
  });

  render();
  renderCart();
  openFromHash();

  // Opened from a shared link like ?part=door-lock-knobs-pair
  const sharedPart = new URLSearchParams(location.search).get("part");
  if (sharedPart) {
    if (findProduct(sharedPart)) openProduct(sharedPart);
    else dialog.dispatchEvent(new Event("close")); // product gone: tidy the address bar
  }
})();
