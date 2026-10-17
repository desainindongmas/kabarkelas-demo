import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { connectLambda, getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import api from "../netlify/functions/api.mjs";

let directory,
  edge,
  uncached,
  environment,
  cookie = "",
  pending;
const edgeRequests = [],
  strongRequests = [];
const oldGlobal = globalThis.netlifyBlobsContext,
  oldEnvironment = process.env.NETLIFY_BLOBS_CONTEXT;
const actualFetch = globalThis.fetch;
function inject() {
  globalThis.netlifyBlobsContext = Buffer.from(
    JSON.stringify(environment),
  ).toString("base64");
}
function remember(response) {
  const values = new Map(
    cookie
      .split("; ")
      .filter(Boolean)
      .map((value) => value.split("=")),
  );
  for (const header of response.headers.getSetCookie()) {
    const [key, value] = header.split(";")[0].split("=");
    values.set(key, value);
  }
  cookie = [...values].map(([key, value]) => `${key}=${value}`).join("; ");
}
async function call(route, body) {
  const response = await api(
    new Request("https://demo.netlify.app" + route, {
      headers: { cookie, "content-type": "application/json" },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    }),
    { requestId: "functions-regression", ip: "127.0.0.1" },
  );
  remember(response);
  return response;
}
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "kabarkelas-functions-"));
  edge = new BlobsServer({
    directory,
    onRequest: (event) => edgeRequests.push(event),
  });
  uncached = new BlobsServer({
    directory,
    onRequest: (event) => strongRequests.push(event),
  });
  const [cachedAddress, strongAddress] = await Promise.all([
    edge.start(),
    uncached.start(),
  ]);
  environment = {
    siteID: "functions-regression",
    deployID: "test-deploy",
    token: "local-test-only",
    edgeURL: cachedAddress.address,
    uncachedEdgeURL: strongAddress.address,
  };
});
after(async () => {
  globalThis.fetch = actualFetch;
  if (oldGlobal === undefined) delete globalThis.netlifyBlobsContext;
  else globalThis.netlifyBlobsContext = oldGlobal;
  if (oldEnvironment === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT;
  else process.env.NETLIFY_BLOBS_CONTEXT = oldEnvironment;
  await Promise.all([edge.stop(), uncached.stop()]);
  await rm(directory, { recursive: true, force: true });
});

test("legacy Lambda initialization reproduces the deployed strong-consistency failure", async () => {
  delete globalThis.netlifyBlobsContext;
  connectLambda({
    headers: {
      "x-nf-site-id": environment.siteID,
      "x-nf-deploy-id": environment.deployID,
    },
    blobs: Buffer.from(
      JSON.stringify({ url: environment.edgeURL, token: environment.token }),
    ).toString("base64"),
  });
  await assert.rejects(
    () =>
      getStore({ name: "kabarkelas-demo-v1", consistency: "strong" }).get(
        "regression-probe",
      ),
    /uncachedEdgeURL/,
  );
});
test("real Web API entry point preserves injected Blobs context, both cookies, and persisted sessions", async () => {
  inject();
  let response = await call("/api/bootstrap");
  assert.equal(response.status, 401);
  response = await call("/api/session", { role: "admin", school: "s1" });
  assert.equal(response.status, 200, await response.clone().text());
  assert.ok(
    response.headers
      .getSetCookie()
      .some((value) => value.startsWith("kk_session=")),
  );
  assert.match(cookie, /kk_workspace=/);
  assert.match(cookie, /kk_session=/);
  response = await call("/api/bootstrap");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.data.students.length, 192);
  assert.ok(strongRequests.length > 0);
  assert.equal(
    edgeRequests.length,
    0,
    "Strong reads must use the injected uncached endpoint",
  );
});
test("rewritten function URLs and repeated role changes keep the same visitor data", async () => {
  let response = await call("/.netlify/functions/api/bootstrap");
  assert.equal(response.status, 200);
  const initial = await response.json();
  const student = initial.data.students[0];
  response = await call("/api/students", {
    ...student,
    address: "Persisted through the public Netlify entry point",
  });
  assert.equal(response.status, 200);
  response = await call("/api/session", { role: "parent", school: "s1" });
  assert.equal(response.status, 200);
  const next = await (await call("/api/bootstrap")).json();
  assert.equal(next.data.students.length, 1);
  assert.equal(
    next.data.students[0].address,
    "Persisted through the public Netlify entry point",
  );
});
test("real API retains role restrictions and has no report worker endpoint", async () => {
  await call("/api/session", { role: "admin", school: "s1" });
  const admin = await (await call("/api/bootstrap")).json();
  assert.equal(admin.data.grades.length, 0);
  assert.equal(admin.data.interventions.length, 0);
  assert.equal(admin.data.students[0].attendance, undefined);
  assert.equal((await call("/api/messages", { body: "test" })).status, 403);
  assert.equal((await call("/api/report-jobs")).status, 404);
  await call("/api/session", {
    role: "teacher",
    school: "s1",
    isHomeroom: true,
  });
  const teacher = await (await call("/api/bootstrap")).json();
  assert.equal(teacher.user.isHomeroom, true);
  assert.ok(teacher.data.character.length > 0);
});
test("missing platform configuration returns a safe JSON error instead of crashing initialization", async () => {
  delete globalThis.netlifyBlobsContext;
  delete process.env.NETLIFY_BLOBS_CONTEXT;
  const response = await call("/api/bootstrap");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type"), /json/);
  const body = await response.json();
  assert.match(body.error, /Layanan data KabarKelas/);
  assert.doesNotMatch(body.error, /token|siteID|uncachedEdgeURL/);
  inject();
});
