import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApplication } from "../app.mjs";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import { handleAPI } from "../netlify/lib/runtime.mjs";

let directory, runtime, server, base;
async function start() {
  runtime = createApplication({ databasePath: directory + "/drafts.sqlite" });
  server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
}
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  runtime.db.close();
}
before(async () => {
  directory = await mkdtemp(tmpdir() + "/kabarkelas-purchases-");
  await start();
});
after(async () => {
  await stop();
  await rm(directory, { recursive: true, force: true });
});
async function call(visitor, path, body) {
  const response = await fetch(base + path, {
    ...(body !== undefined ? { method: "POST", body: JSON.stringify(body) } : {}),
    headers: { "content-type": "application/json", cookie: visitor.cookie || "" },
  });
  const jar = new Map((visitor.cookie || "").split("; ").filter(Boolean).map((item) => item.split("=")));
  for (const cookie of response.headers.getSetCookie()) {
    const [name, value] = cookie.split(";")[0].split("=");
    jar.set(name, value);
  }
  visitor.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  return { response, status: response.status, body: await response.json() };
}
async function visitor() {
  const buyer = {};
  const result = await call(buyer, "/api/purchase-drafts/session");
  assert.equal(result.status, 200);
  assert.equal(result.body.ready, true);
  assert.equal(result.body.latest, null);
  assert.match(result.response.headers.get("set-cookie"), /kk_buyer=[a-f0-9]{64};.*HttpOnly;.*SameSite=Strict/i);
  assert.match(result.response.headers.get("cache-control"), /private, no-store/);
  return buyer;
}
const payload = (plan = "Pro", students = 350, units = [students]) => ({
  requestId: randomUUID(),
  contact: { name: "Dian Contoh", organization: "Sekolah Contoh", email: "dian@example.test", phone: "+62 812-3456-7890" },
  needs: { plan, students, units, wantsEws: plan !== "Standard" },
  note: "Ingin mendiskusikan jadwal penerapan.",
  consent: true,
});

test("public buyers save server-priced annual drafts without creating academic authority", async () => {
  const buyer = await visitor();
  const before = ["s1", "s2", "s3"].map((id) => runtime.all(id, "settings")[0].plan);
  const input = payload();
  const saved = await call(buyer, "/api/purchase-drafts", {
    ...input,
    role: "admin",
    status: "paid",
    quote: { annual: 1, customQuote: false },
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.status, "draft");
  assert.equal(saved.body.quote.annual, 7_000_000);
  assert.equal(saved.body.quote.students, 350);
  assert.equal(saved.body.quote.customQuote, false);
  assert.equal(saved.body.contact.email, input.contact.email);
  assert.match(saved.body.reference, /^KK-\d{8}-[A-F0-9]{8}$/);
  assert.equal(saved.body.role, undefined);
  assert.equal((await call(buyer, "/api/bootstrap")).status, 401);
  assert.deepEqual(["s1", "s2", "s3"].map((id) => runtime.all(id, "settings")[0].plan), before);
  const row = runtime.db.prepare("SELECT owner_hash FROM purchase_drafts WHERE id=?").get(saved.body.id);
  assert.match(row.owner_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(row.owner_hash, buyer.cookie.split("=")[1]);
});

test("drafts are readable only by their visitor and survive demo role changes", async () => {
  const first = await visitor(), second = await visitor();
  const saved = await call(first, "/api/purchase-drafts", payload("Standard"));
  assert.equal(saved.status, 201);
  assert.equal(saved.body.quote.annual, 4_500_000);
  assert.deepEqual((await call(first, "/api/purchase-drafts/" + saved.body.id)).body, saved.body);
  const denied = await call(second, "/api/purchase-drafts/" + saved.body.id);
  assert.equal(denied.status, 404);
  assert.doesNotMatch(JSON.stringify(denied.body), /Dian|example\.test/);
  assert.equal((await call({}, "/api/purchase-drafts/" + saved.body.id)).status, 404);
  assert.equal((await call(second, "/api/purchase-drafts/session")).body.latest, null);
  for (const role of ["security", "admin", "foundation"]) {
    assert.equal((await call(first, "/api/session", { role })).status, 200);
    assert.deepEqual((await call(first, "/api/purchase-drafts/" + saved.body.id)).body, saved.body);
    assert.equal((await call(second, "/api/purchase-drafts/" + saved.body.id)).status, 404);
  }
  const bootstrap = await call(first, "/api/bootstrap");
  assert.equal(JSON.stringify(bootstrap.body).includes(saved.body.contact.email), false);
  assert.equal((await call(second, "/api/session", { role: "admin" })).status, 200);
  const backup = await call(second, "/api/backup");
  assert.equal(JSON.stringify(backup.body).includes(saved.body.contact.email), false);
});

test("same request retries are idempotent and changed payloads conflict", async () => {
  const buyer = await visitor();
  const input = payload();
  const first = await call(buyer, "/api/purchase-drafts", input);
  const retry = await call(buyer, "/api/purchase-drafts", { ...input, quote: { annual: -1 } });
  assert.equal(retry.status, 200);
  assert.deepEqual(retry.body, first.body);
  const changed = await call(buyer, "/api/purchase-drafts", { ...input, note: "Catatan berubah" });
  assert.equal(changed.status, 409);
  assert.equal(runtime.db.prepare("SELECT COUNT(*) AS n FROM purchase_drafts WHERE request_id=?").get(input.requestId).n, 1);
  assert.deepEqual((await call(buyer, "/api/purchase-drafts/" + first.body.id)).body, first.body);
  const newDraft = await call(buyer, "/api/purchase-drafts", { ...input, requestId: randomUUID(), note: "Catatan baru" });
  assert.equal(newDraft.status, 201);
  assert.notEqual(newDraft.body.id, first.body.id);
});

test("Yayasan quotes sum each unit once and custom counts remain unpriced", async () => {
  const buyer = await visitor();
  const foundation = await call(buyer, "/api/purchase-drafts", payload("Yayasan", 1, [500, 500, 500]));
  assert.equal(foundation.status, 201);
  assert.equal(foundation.body.needs.students, 1500);
  assert.equal(foundation.body.quote.students, 1500);
  assert.equal(foundation.body.quote.proAnnual, 25_500_000);
  assert.equal(foundation.body.quote.managementAnnual, 4_500_000);
  assert.equal(foundation.body.quote.annual, 30_000_000);
  assert.equal(foundation.body.quote.units.length, 3);
  const custom = await call(buyer, "/api/purchase-drafts", payload("Pro", 2001));
  assert.equal(custom.status, 201);
  assert.equal(custom.body.quote.annual, null);
  assert.equal(custom.body.quote.customQuote, true);
  const mixed = await call(buyer, "/api/purchase-drafts", payload("Yayasan", 0, [350, 2001]));
  assert.equal(mixed.status, 201);
  assert.equal(mixed.body.quote.annual, null);
  assert.equal(mixed.body.quote.proAnnual, null);
  assert.equal(mixed.body.quote.managementAnnual, 3_000_000);
  assert.equal(mixed.body.quote.students, 2351);
});

test("validation rejects missing consent, invalid contacts and incompatible package needs", async () => {
  const buyer = await visitor();
  const valid = payload();
  for (const invalid of [
    { ...valid, consent: false },
    { ...valid, requestId: "not-a-uuid" },
    { ...valid, contact: { ...valid.contact, name: "" } },
    { ...valid, contact: { ...valid.contact, email: "bad-email" } },
    { ...valid, contact: { ...valid.contact, phone: "call-me" } },
    { ...valid, contact: { ...valid.contact, organization: "x".repeat(201) } },
    { ...valid, needs: { ...valid.needs, plan: "Standard", wantsEws: true } },
    { ...valid, needs: { ...valid.needs, plan: "Yayasan", units: [500] } },
    { ...valid, needs: { ...valid.needs, plan: "Yayasan", units: [500, -1] } },
    { ...valid, needs: { ...valid.needs, plan: "Yayasan", units: Array(101).fill(500) } },
    { ...valid, needs: { ...valid.needs, students: 0 } },
    { ...valid, needs: { ...valid.needs, students: 350.5 } },
    { ...valid, needs: { ...valid.needs, units: [200, 300] } },
    { ...valid, note: "x".repeat(2001) },
  ]) {
    const result = await call(buyer, "/api/purchase-drafts", invalid);
    assert.equal(result.status, 400, JSON.stringify(invalid.needs));
  }
  assert.equal((await call(buyer, "/api/purchase-drafts/session")).body.latest, null);
});

test("draft and owner scope persist after the application restarts", async () => {
  const buyer = await visitor(), other = await visitor();
  const saved = await call(buyer, "/api/purchase-drafts", payload());
  await stop();
  await start();
  assert.deepEqual((await call(buyer, "/api/purchase-drafts/session")).body.latest, saved.body);
  assert.deepEqual((await call(buyer, "/api/purchase-drafts/" + saved.body.id)).body, saved.body);
  assert.equal((await call(other, "/api/purchase-drafts/" + saved.body.id)).status, 404);
});

test("Netlify snapshots preserve buyer cookies and drafts across isolated invocations", async () => {
  const storagePath = await mkdtemp(tmpdir() + "/kabarkelas-purchase-blobs-");
  const blobs = new BlobsServer({ directory: storagePath });
  try {
    const address = await blobs.start();
    const store = getStore({ name: "purchase-test", siteID: "purchase-test", token: "local-test-only", apiURL: address.address, consistency: "strong" });
    const invoke = async (jar, route, body) => {
      const response = await handleAPI({
        httpMethod: body === undefined ? "GET" : "POST",
        path: "/.netlify/functions/api" + route.replace(/^\/api/, ""),
        headers: { cookie: jar.cookie || "", "content-type": "application/json", "x-forwarded-proto": "https" },
        queryStringParameters: {},
        body: body === undefined ? undefined : JSON.stringify(body),
        isBase64Encoded: false,
      }, {}, { store });
      const cookies = [
        ...(response.multiValueHeaders?.["set-cookie"] || []),
        ...(response.headers?.["set-cookie"] ? [response.headers["set-cookie"]] : []),
      ];
      const map = new Map((jar.cookie || "").split("; ").filter(Boolean).map((item) => item.split("=")));
      for (const value of cookies) {
        const [name, token] = value.split(";")[0].split("=");
        map.set(name, token);
      }
      jar.cookie = [...map].map(([name, value]) => `${name}=${value}`).join("; ");
      return { status: response.statusCode, body: JSON.parse(response.body), cookies };
    };
    const first = {}, second = {};
    const setup = await invoke(first, "/api/purchase-drafts/session");
    assert.equal(setup.status, 200);
    assert.match(first.cookie, /kk_buyer=[a-f0-9]{64}/);
    assert.match(first.cookie, /kk_workspace=[a-f0-9]{64}/);
    assert.ok(setup.cookies.some((cookie) => cookie.startsWith("kk_buyer=") && cookie.includes("Secure") && cookie.includes("HttpOnly")));
    const saved = await invoke(first, "/api/purchase-drafts", payload("Standard"));
    assert.equal(saved.status, 201);
    assert.equal(saved.body.quote.annual, 4_500_000);
    const reopened = await invoke(first, "/api/purchase-drafts/" + saved.body.id);
    assert.equal(reopened.status, 200);
    assert.deepEqual(reopened.body, saved.body);
    assert.deepEqual((await invoke(first, "/api/purchase-drafts/session")).body.latest, saved.body);
    assert.equal((await invoke(second, "/api/purchase-drafts/session")).status, 200);
    assert.equal((await invoke(second, "/api/purchase-drafts/" + saved.body.id)).status, 404);
    assert.equal((await invoke(first, "/api/bootstrap")).status, 401);
  } finally {
    await blobs.stop();
    await rm(storagePath, { recursive: true, force: true });
  }
});
