(function () {
  const DOCS = window.TEST_DOCUMENTS || [];
  const params = new URLSearchParams(location.search);
  let doc = DOCS.find(d => d.id === params.get("doc")) || DOCS[0];

  const $ = id => document.getElementById(id);
  const els = {
    notice: $("authNotice"), formTitle: $("formTitle"), form: $("pinForm"),
    pin: $("pin"), captcha: $("captchaAnswer"), captchaCanvas: $("captchaCanvas"),
    error: $("formError"), hint: $("hint") || document.querySelector(".hint"),
    opened: $("openedState"),
    lockBtn: $("lockBtn"), bars: $("lockedBars"), barsFoot: $("lockedBarsFoot"),
    body: $("docBody"), text: $("unlockedText"), footText: $("unlockedFoot"),
    pinCode: $("pinBadgeCode"), qr: $("qrCanvas")
  };

  if (!doc) {
    els.error.hidden = false;
    els.error.textContent = "Нет ни одного документа в data.js";
    return;
  }

  /* ---------- превью листа ---------- */
  function renderBars(container, count) {
    container.textContent = "";
    for (let i = 0; i < count; i++) container.appendChild(document.createElement("span"));
  }
  renderBars(els.bars, 8);
  renderBars(els.barsFoot, 5);

  function renderQr(seedText) {
    const size = 25, quiet = 1, canvas = els.qr, ctx = canvas.getContext("2d");
    const cell = Math.floor(canvas.width / (size + quiet * 2));
    const offset = Math.floor((canvas.width - cell * (size + quiet * 2)) / 2) + cell * quiet;

    let h = 2166136261;
    for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };

    const inFinder = (r, c) =>
      (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (inFinder(r, c) || rnd() < 0.48) ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
      }
    }
    // служебные квадраты по углам
    [[0, 0], [0, size - 7], [size - 7, 0]].forEach(([r, c]) => {
      ctx.fillStyle = "#111"; ctx.fillRect(offset + c * cell, offset + r * cell, cell * 7, cell * 7);
      ctx.fillStyle = "#fff"; ctx.fillRect(offset + (c + 1) * cell, offset + (r + 1) * cell, cell * 5, cell * 5);
      ctx.fillStyle = "#111"; ctx.fillRect(offset + (c + 2) * cell, offset + (r + 2) * cell, cell * 3, cell * 3);
    });
  }
  renderQr(doc.id + doc.pin);
  els.pinCode.textContent = doc.pin;

  /* ---------- арифметическая капча ---------- */
  let captchaAnswer = 0;

  function drawCaptcha() {
    const canvas = els.captchaCanvas, ctx = canvas.getContext("2d");
    const a = 3 + Math.floor(Math.random() * 9);
    const b = 1 + Math.floor(Math.random() * 8);
    const plus = Math.random() < 0.5;
    captchaAnswer = plus ? a + b : a - b;
    const text = `${a} ${plus ? "+" : "-"} ${b}`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f1f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(120,110,170,${Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }

    const colors = ["#2b3f9e", "#5a2ea6", "#1f6fb2", "#7a3fb0"];
    [...text].forEach((ch, i) => {
      ctx.save();
      ctx.translate(16 + i * 22, 30 + (Math.random() * 6 - 3));
      ctx.rotate((Math.random() * 30 - 15) * Math.PI / 180);
      ctx.fillStyle = colors[i % colors.length];
      ctx.font = `bold ${22 + Math.floor(Math.random() * 6)}px Georgia, serif`;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  }
  drawCaptcha();

  /* ---------- ошибки ---------- */
  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = false;
  }

  function downloadDocument(fileName) {
    const link = document.createElement("a");
    link.href = fileName;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /* ---------- разблокировка ---------- */
  function unlock() {
    els.bars.hidden = true;
    els.barsFoot.hidden = true;
    els.text.hidden = false;
    els.footText.hidden = false;

    els.text.innerHTML = `<h2>${doc.title}</h2>` +
      doc.paragraphs.map(p => `<p>${p}</p>`).join("");
    els.footText.innerHTML = `<p>Идентификатор: ${doc.id}</p>`;

    els.form.hidden = true;
    els.formTitle.hidden = true;
    els.hint.hidden = true;
    els.opened.hidden = false;
  }

  function lock() {
    els.opened.hidden = true;
    els.form.hidden = false;
    els.formTitle.hidden = false;
    els.hint.hidden = false;
    els.text.hidden = true;
    els.footText.hidden = true;
    els.bars.hidden = false;
    els.barsFoot.hidden = false;
    els.pin.value = "";
    els.captcha.value = "";
    els.error.hidden = true;
    drawCaptcha();
  }

  els.form.addEventListener("submit", e => {
    e.preventDefault();
    const pin = els.pin.value.trim();
    const answer = parseInt(els.captcha.value.trim(), 10);

    if (!pin) return showError("Введите ПИН код.");
    if (Number.isNaN(answer) || answer !== captchaAnswer) {
      drawCaptcha();
      els.captcha.value = "";
      return showError("Неверный ответ проверочного выражения.");
    }
    const fileByPin = {
      "4441": "1281-406a-eb1b-b236-b4d0-6210-1462.docx",
      "4446": "1281-406a-eb1b-b236-b4d0-6210-1461.docx"
    };
    if (fileByPin[pin]) {
      els.error.hidden = true;
      downloadDocument(fileByPin[pin]);
      return;
    }
    if (pin !== doc.pin) return showError("ПИН код не найден или указан неверно.");
    unlock();
  });

  els.captchaCanvas.addEventListener("click", () => { drawCaptcha(); els.captcha.value = ""; });
  els.lockBtn.addEventListener("click", lock);
  $("noticeClose").addEventListener("click", () => els.notice.hidden = true);
  $("authLink").addEventListener("click", e => e.preventDefault());

  /* ---------- бренд и шапка ---------- */
  const BRAND = Object.assign(
    { name: "my.gov.uz", year: 2026 },
    window.BRAND || {}
  );
  $("brandNameFoot").textContent = BRAND.name;
  $("brandYear").textContent = BRAND.year;

  const LANGS = ["RU", "UZ", "EN"];
  $("langBtn").addEventListener("click", e => {
    const next = (LANGS.indexOf(e.currentTarget.firstChild.textContent.trim()) + 1) % LANGS.length;
    e.currentTarget.firstChild.textContent = LANGS[next];
  });
  $("signinLink").addEventListener("click", e => e.preventDefault());
})();
