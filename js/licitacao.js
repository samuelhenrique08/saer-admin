// Módulo isolado do gerador de licitação (portado do licitacao.html original).
// Não toca em nenhuma função do painel.js.

const LOGO_SRC = "img/saer-logo.png";

const W = 1450, BASE_H = 649, SCALE = 2;
const GOLD = "#c9ad78", LINE = "#8a7550";

const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function brl(v) {
    const n = parseInt(String(v).replace(/\D/g, ""), 10) || 0;
    return "R$" + n.toLocaleString("pt-BR");
}
function num(v) {
    return parseInt(String(v).replace(/\D/g, ""), 10) || 0;
}

// Formato esperado por linha:
// 1º — @Nome | ID | DiscordID — tempo
function parse(text) {
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;

        // Tenta o formato do painel: @[CMD SAER] Scott | 1617 | 525318781451501569 — 22h:51min:26s
        let m = line.match(/@?\[?CMD\s*SAER\]?\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*([^—–-]+?)\s*[—–-]+\s*(.+)$/i);

        // Se não achar, tenta o formato original do gerador: 1º — @Nome | ID | Discord — tempo
        if (!m) {
            m = line.match(/(\d+)\s*[º°ª]?\s*[—–-]+\s*@?\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*([^|—–]+?)\s*[—–-]+\s*(.+)$/);
            if (m) {
                // Formato original: pos, full, id, discord, tempo
                const full = m[2].trim();
                const nome = full.replace(/^\[[^\]]*\]\s*/, '').trim();
                out.push({ pos: +m[1], full, nome, id: m[3].trim(), discord: m[4].trim(), tempo: m[5].trim() });
            }
        } else {
            // Formato do painel: full, id, discord, tempo (posição será definida depois)
            const full = m[1].trim();
            const nome = full.replace(/^\[[^\]]*\]\s*/, '').trim();
            out.push({ pos: 0, full, nome, id: m[2].trim(), discord: m[3].trim(), tempo: m[4].trim() });
        }
    }

    // Ordena: se tiver posição (formato antigo), usa ela. Senão, mantém a ordem da linha.
    return out.sort((a, b) => (a.pos || 999) - (b.pos || 999)).map((r, i) => ({ ...r, pos: i + 1 }));
}

// ---------- desenho ----------
let cv, ctx, logo;
let lastParsed = [];

function cell(text, x1, y1, x2, y2, color, font) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let t = text;
    const w = x2 - x1 - 16;
    while (ctx.measureText(t).width > w && t.length > 1) t = t.slice(0, -2) + "…";
    ctx.fillText(t, (x1 + x2) / 2, (y1 + y2) / 2 + 1);
}
function box(x1, y1, x2, y2) {
    ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1, y2 - y1);
}

function draw() {
    if (!cv) return;

    const rows = parse($("prompt-input").value || "");
    lastParsed = rows;

    const showAdm = $("lic-showAdm").checked;
    $("lic-admBox").style.display = showAdm ? "" : "none";

    const adms = showAdm
        ? $("lic-adm")
            .value.split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => {
                const p = l.split("|").map((x) => x.trim());
                return { nome: p[0] || "", id: p[1] || "" };
            })
        : [];

    const H = Math.max(BASE_H, 568 + adms.length * 43 + 25);

    cv.width = W * SCALE;
    cv.height = H * SCALE;
    cv.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // logo
    if (logo.complete) ctx.drawImage(logo, 870, 45, 565, 560);

    // título
    ctx.fillStyle = GOLD;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "italic 46px Anton, Impact, sans-serif";
    ctx.save();
    ctx.translate(444, 97);
    ctx.transform(1, 0, -0.12, 1, 0, 0);
    ctx.fillText($("lic-titulo").value, 0, 0);
    ctx.restore();

    // tabela principal
    const X = [64, 224, 344, 494, 654, 824];
    const Y = [105, 193, 282, 371, 460, 548].map((v) => v + 20);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;

    const head = ["QRA", "ID", "TEMPO", "MOTIVO", "VALOR"];
    for (let c = 0; c < 5; c++) {
        box(X[c], Y[0], X[c + 1], Y[1]);
        cell(head[c], X[c], Y[0], X[c + 1], Y[1], GOLD, "700 14px Archivo, Arial");
    }

    const vals = [$("lic-v1").value, $("lic-v2").value, $("lic-v3").value];
    const body = "500 14px Archivo, Arial";

    for (let i = 0; i < 3; i++) {
        const r = rows.find((x) => x.pos === i + 1);
        const y1 = Y[i + 1], y2 = Y[i + 2];
        for (let c = 0; c < 5; c++) box(X[c], y1, X[c + 1], y2);
        if (r) {
            cell(r.full, X[0], y1, X[1], y2, "#fff", body);
            cell(r.id, X[1], y1, X[2], y2, "#fff", body);
            cell(r.tempo, X[2], y1, X[3], y2, "#fff", body);
        }
        cell("Destaque Top " + (i + 1), X[3], y1, X[4], y2, "#fff", body);
        cell(brl(vals[i]), X[4], y1, X[5], y2, "#fff", body);
    }

    box(X[0], Y[4], X[5], Y[5]);
    const total = vals.reduce((s, v) => s + num(v), 0);
    cell(
        "Total: R$ " + total.toLocaleString("pt-BR"),
        X[0], Y[4], X[5], Y[5],
        "#fff", body
    );

    // tabela dos admins
    const SX = [184, 312, 441, 572, 704];
    adms.forEach((a, i) => {
        const y1 = Y[5] + i * 43, y2 = y1 + 43;
        for (let c = 0; c < 4; c++) box(SX[c], y1, SX[c + 1], y2);
        const f = "500 13.5px Archivo, Arial";
        [a.nome, a.id, "Admin. S.A.E.R.", brl($("lic-vAdm").value)].forEach((t, c) =>
            cell(t, SX[c], y1, SX[c + 1], y2, "#fff", f)
        );
    });

    const m = $("lic-msg");
    if (!rows.length) {
        m.textContent = "Nenhuma linha reconhecida no prompt. Cole o prompt no campo acima.";
        m.className = "lic-msg err";
    } else {
        m.textContent = rows.length + " membro(s) lido(s) do prompt.";
        m.className = "lic-msg";
    }
}

// ---------- exportações ----------
function fileName(ext) {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `licitacao-saer-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.${ext}`;
}
function save(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// PDF mínimo com a imagem JPEG embutida (sem bibliotecas)
function makePdf() {
    const jpg = atob(cv.toDataURL("image/jpeg", 0.95).split(",")[1]);
    const pw = cv.width / SCALE, ph = cv.height / SCALE;
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const push = (s) => {
        const b = typeof s === "string" ? enc.encode(s) : s;
        parts.push(b);
        len += b.length;
    };
    const img = new Uint8Array(jpg.length);
    for (let i = 0; i < jpg.length; i++) img[i] = jpg.charCodeAt(i);
    const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const obj = (n, s) => {
        offs[n] = len;
        push(`${n} 0 obj\n${s}\nendobj\n`);
    };
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offs[4] = len;
    push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img);
    push("\nendstream\nendobj\n");
    obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const xref = len;
    let x = "xref\n0 6\n0000000000 65535 f \n";
    for (let n = 1; n <= 5; n++) x += String(offs[n]).padStart(10, "0") + " 00000 n \n";
    push(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
}

// ---------- init ----------
function initLicitacao() {
    if (!$("card-licitacao")) return;

    cv = $("lic-cv");
    if (!cv) return;
    ctx = cv.getContext("2d");

    logo = new Image();
    logo.src = LOGO_SRC;
    logo.onload = draw;

    // listeners (agora escuta o prompt principal do painel!)
    ["prompt-input", "lic-titulo", "lic-v1", "lic-v2", "lic-v3", "lic-showAdm", "lic-adm", "lic-vAdm"].forEach((id) => {
        const el = $(id);
        if (el) el.addEventListener("input", draw);
    });

    $("lic-bPng")?.addEventListener("click", () => cv.toBlob((b) => save(b, fileName("png")), "image/png"));
    $("lic-bPdf")?.addEventListener("click", () => save(makePdf(), fileName("pdf")));
    $("lic-bCopy")?.addEventListener("click", () =>
        cv.toBlob(async (b) => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
                $("lic-msg").textContent = "Imagem copiada — é só colar no Discord (Ctrl+V).";
            } catch (e) {
                $("lic-msg").textContent = "Seu navegador não deixou copiar; use Baixar PNG.";
            }
        }, "image/png")
    );

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLicitacao);
} else {
    initLicitacao();
}