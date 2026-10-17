import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import { handleAPI } from "../netlify/lib/runtime.mjs";

let directory,
  blobs,
  store,
  cookie = "",
  queued;
const workers = [];
const cookieValues = (response) => [
  ...(response.multiValueHeaders?.["set-cookie"] || []),
  ...(response.headers?.["set-cookie"] ? [response.headers["set-cookie"]] : []),
];
function event(route, body, session = cookie) {
  return {
    httpMethod: body === undefined ? "GET" : "POST",
    path: "/.netlify/functions/api" + route.replace(/^\/api/, ""),
    headers: {
      cookie: session,
      "content-type": "application/json",
      "x-forwarded-proto": "https",
    },
    queryStringParameters: {},
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  };
}
async function call(route, body, session = cookie) {
  const result = await handleAPI(
    event(route, body, session),
    {},
    {
      store,
      triggerWorker: async (request) => {
        queued = request;
        workers.push(request);
      },
    },
  );
  if (session === cookie) {
    for (const value of cookieValues(result)) {
      const [key, v] = value.split(";")[0].split("=");
      const map = new Map(
        cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => c.split("=")),
      );
      map.set(key, v);
      cookie = [...map].map(([k, v]) => `${k}=${v}`).join("; ");
    }
  }
  return {
    ...result,
    data: result.headers?.["content-type"]?.includes("json")
      ? JSON.parse(result.body)
      : undefined,
  };
}
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "kabarkelas-blobs-test-"));
  blobs = new BlobsServer({ directory });
  const address = await blobs.start();
  store = getStore({
    name: "kabarkelas-demo-v1",
    siteID: "local-netlify-test",
    token: "local-test-only",
    apiURL: address.address,
    consistency: "strong",
  });
});
after(async () => {
  await blobs.stop();
  await rm(directory, { recursive: true, force: true });
});

test("Netlify session cookies and compressed snapshots persist across isolated invocations", async () => {
  const unauthenticated = await call("/api/bootstrap");
  assert.equal(unauthenticated.statusCode, 401);
  const login = await call("/api/session", { role: "admin", school: "s1" });
  assert.equal(login.statusCode, 200, login.body);
  assert.match(cookie, /kk_session=/);
  assert.match(cookie, /kk_workspace=/);
  const first = await call("/api/bootstrap");
  assert.equal(first.statusCode, 200, first.body);
  assert.equal(first.data.data.students.length, 192);
  const s = first.data.data.students[0];
  assert.equal(
    (
      await call("/api/students", {
        ...s,
        address: "Alamat tersimpan melalui Netlify Blobs",
      })
    ).statusCode,
    200,
  );
  const restored = await call("/api/bootstrap");
  assert.equal(
    restored.data.data.students.find((st) => st.id === s.id).address,
    "Alamat tersimpan melalui Netlify Blobs",
  );
});
test("independent Netlify visitors do not share edited data or session authority", async () => {
  const own = cookie;
  cookie = "";
  await call("/api/session", { role: "principal", school: "s1" });
  const second = await call("/api/bootstrap");
  assert.notEqual(
    second.data.data.students[0].address,
    "Alamat tersimpan melalui Netlify Blobs",
  );
  const foreign =
    cookie.split("; ").find((c) => c.startsWith("kk_workspace=")) +
    "; " +
    own.split("; ").find((c) => c.startsWith("kk_session="));
  assert.equal(
    (await call("/api/bootstrap", undefined, foreign)).statusCode,
    401,
  );
  cookie = own;
});
test("Netlify optimistic concurrency rejects a stale snapshot instead of losing edits", async () => {
  const current = await call("/api/bootstrap");
  const s = current.data.data.students[1];
  // Hold both conditional writes until each invocation has read the same version.
  let arrivals = 0,
    release;
  const gate = new Promise((resolve) => (release = resolve));
  let writes = Promise.resolve();
  const simultaneous = {
    getWithMetadata: store.getWithMetadata.bind(store),
    list: store.list.bind(store),
    set: async (...args) => {
      if (++arrivals === 2) release();
      await gate;
      // The local emulator checks If-Match before async filesystem writes;
      // serialize its PUTs to model the production atomic write contract.
      const result = writes.then(() => store.set(...args));
      writes = result.catch(() => {});
      return result;
    },
  };
  const results = await Promise.all(
    ["Concurrent A", "Concurrent B"].map((address) =>
      handleAPI(
        event("/api/students", { ...s, address }),
        {},
        { store: simultaneous },
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
});
test("Netlify persists manual receipts and denies family writes", async () => {
  const before = await call("/api/bootstrap");
  const invoice = before.data.data.invoices.find((i) => i.status !== "Lunas");
  const payment = await call("/api/invoices", {
    ...invoice,
    paymentAmount: 100000,
    method: "Tunai",
    paymentDate: "2026-10-17",
  });
  assert.equal(payment.statusCode, 200, payment.body);
  assert.equal(payment.data.paidAmount, 100000);
  await call("/api/session", { role: "parent", school: "s1" });
  const child = await call("/api/bootstrap");
  assert.ok(child.data.data.payments.some((p) => p.invoiceId === invoice.id));
  assert.equal(
    (
      await call("/api/invoices", {
        ...invoice,
        paymentAmount: 1,
        method: "Tunai",
        paymentDate: "2026-10-17",
      })
    ).statusCode,
    403,
  );
  assert.equal((await call("/api/report-jobs")).statusCode, 404);
});
