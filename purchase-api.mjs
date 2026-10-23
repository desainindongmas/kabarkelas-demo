import { createHash, randomBytes } from "node:crypto";
import { quoteSchool, quoteFoundation } from "./shared/pricing.mjs";

const cookieName = "kk_buyer";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const invalid = (message) => fail(400, message);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const ownerToken = (req) => {
  const token = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(token || "") ? token : null;
};
const text = (value, label, min, max, multiline = false) => {
  if (typeof value !== "string") invalid(`${label} wajib diisi.`);
  const result = value.trim();
  if (result.length < min || result.length > max ||
      (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/ : /[\u0000-\u001f]/).test(result))
    invalid(`${label} tidak valid.`);
  return result;
};
const validCount = (value) => Number.isSafeInteger(value) && value > 0;

function normalizeRequest(body) {
  if (!object(body) || !object(body.contact) || !object(body.needs))
    invalid("Isi data pemesanan dengan lengkap.");
  if (typeof body.requestId !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId))
    invalid("Identitas draf tidak valid. Muat ulang formulir lalu coba lagi.");
  if (body.consent !== true)
    invalid("Persetujuan penggunaan data kontak diperlukan untuk menyimpan draf.");
  const contact = {
    name: text(body.contact.name, "Nama penanggung jawab", 2, 120),
    organization: text(body.contact.organization, "Nama sekolah atau yayasan", 2, 200),
    email: text(body.contact.email, "Email", 3, 254),
    phone: text(body.contact.phone ?? "", "Nomor telepon", 0, 32),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) invalid("Alamat email tidak valid.");
  if (contact.phone && !/^[+0-9(). -]{6,32}$/.test(contact.phone)) invalid("Nomor telepon tidak valid.");
  const { plan, wantsEws } = body.needs;
  if (!["Standard", "Pro", "Yayasan"].includes(plan) || typeof wantsEws !== "boolean")
    invalid("Pilihan paket dan kebutuhan EWS tidak valid.");
  if (plan === "Standard" && wantsEws)
    invalid("EWS tersedia pada Pro dan Yayasan. Pilih paket yang sesuai atau ubah kebutuhan EWS.");
  let needs, quote;
  if (plan === "Yayasan") {
    const units = body.needs.units;
    if (!Array.isArray(units) || units.length < 2 || units.length > 100 || !units.every(validCount))
      invalid("Yayasan memerlukan 2–100 unit dengan jumlah siswa berupa bilangan bulat positif.");
    const result = quoteFoundation(units);
    if (!Number.isSafeInteger(result.students)) invalid("Total jumlah siswa terlalu besar.");
    needs = { plan, students: result.students, units: [...units], wantsEws };
    quote = {
      annual: result.annual,
      students: result.students,
      managementAnnual: result.managementAnnual,
      proAnnual: result.proAnnual,
      customQuote: result.customQuote,
      units: result.units,
    };
  } else {
    if (!validCount(body.needs.students)) invalid("Jumlah siswa harus berupa bilangan bulat positif.");
    if (!Array.isArray(body.needs.units) || body.needs.units.length > 1)
      invalid("Untuk beberapa unit sekolah, pilih paket Yayasan.");
    const result = quoteSchool(body.needs.students);
    needs = { plan, students: result.students, units: [result.students], wantsEws };
    quote = {
      annual: plan === "Pro" ? result.proAnnual : result.standardAnnual,
      students: result.students,
      customQuote: result.customQuote,
    };
  }
  return {
    requestId: body.requestId.toLowerCase(),
    contact,
    needs,
    quote,
    note: text(body.note ?? "", "Catatan", 0, 2000, true),
    consent: true,
  };
}

/** Buyer drafts stay inside the visitor's workspace; no seller delivery occurs. */
export function installPurchaseAPI({ app, db, secureCookies = false }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_drafts (
      id TEXT PRIMARY KEY,
      owner_hash TEXT NOT NULL,
      request_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      body TEXT NOT NULL,
      UNIQUE(owner_hash, request_id)
    );
    CREATE INDEX IF NOT EXISTS purchase_owner_created ON purchase_drafts(owner_hash, created_at DESC);
  `);
  const ensureOwner = (req, res) => {
    let token = ownerToken(req);
    if (!token) {
      token = randomBytes(32).toString("hex");
      res.cookie(cookieName, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: secureCookies || req.secure,
        maxAge: 2592000000,
        path: "/",
      });
    }
    return hash(token);
  };
  app.use("/api/purchase-drafts", (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
    next();
  });
  app.get("/api/purchase-drafts/session", (req, res) => {
    const owner = ensureOwner(req, res);
    const latest = db.prepare(
      "SELECT body FROM purchase_drafts WHERE owner_hash=? ORDER BY created_at DESC, id DESC LIMIT 1",
    ).get(owner);
    res.json({ ready: true, latest: latest ? JSON.parse(latest.body) : null });
  });
  app.post("/api/purchase-drafts", (req, res) => {
    const normalized = normalizeRequest(req.body);
    const owner = ensureOwner(req, res);
    const { quote: _quote, ...requestData } = normalized;
    const fingerprint = hash(JSON.stringify(requestData));
    db.exec("BEGIN IMMEDIATE");
    try {
      const old = db.prepare(
        "SELECT body, fingerprint FROM purchase_drafts WHERE owner_hash=? AND request_id=?",
      ).get(owner, normalized.requestId);
      if (old) {
        if (old.fingerprint !== fingerprint)
          fail(409, "Draf dengan identitas ini sudah tersimpan dengan isi berbeda. Buat draf baru untuk perubahan berikutnya.");
        db.exec("COMMIT");
        return res.json(JSON.parse(old.body));
      }
      const createdAt = new Date().toISOString();
      const day = new Date(createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).replaceAll("-", "");
      const draft = {
        id: randomBytes(20).toString("hex"),
        reference: `KK-${day}-${randomBytes(4).toString("hex").toUpperCase()}`,
        status: "draft",
        createdAt,
        ...normalized,
        consentedAt: createdAt,
      };
      db.prepare("INSERT INTO purchase_drafts VALUES(?,?,?,?,?,?)").run(
        draft.id, owner, normalized.requestId, fingerprint, createdAt, JSON.stringify(draft),
      );
      db.exec("COMMIT");
      res.status(201).json(draft);
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK");
      throw error;
    }
  });
  app.get("/api/purchase-drafts/:id", (req, res) => {
    const token = ownerToken(req);
    const draft = token && /^[a-f0-9]{40}$/.test(req.params.id) && db.prepare(
      "SELECT body FROM purchase_drafts WHERE id=? AND owner_hash=?",
    ).get(req.params.id, hash(token));
    if (!draft) fail(404, "Draf pemesanan tidak ditemukan.");
    res.json(JSON.parse(draft.body));
  });
}
