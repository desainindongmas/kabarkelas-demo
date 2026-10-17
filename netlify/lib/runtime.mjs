import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import serverless from "serverless-http";
import { createApplication } from "../../app.mjs";

const workspaceCookie = "kk_workspace";
const json = (statusCode, error) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "private, no-store",
  },
  body: JSON.stringify({ error }),
});
const cookieHeader = (event) =>
  Object.entries(event.headers || {}).find(
    ([name]) => name.toLowerCase() === "cookie",
  )?.[1] || "";
const cookies = (event) =>
  Object.fromEntries(
    cookieHeader(event)
      .split(";")
      .map((c) => c.trim().split("=")),
  );
const workspaceFor = (event) =>
  /^[a-f0-9]{64}$/.test(cookies(event)[workspaceCookie] || "")
    ? cookies(event)[workspaceCookie]
    : null;
const snapshotKey = (id) => `workspaces/${id}/database.gz`;
const binary = (buffer) =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

async function snapshot(store, key) {
  const saved = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!saved || saved.etag) return saved;
  // The official local Blobs emulator does not emit ETag on GET. Obtain a
  // stable read using its listing ETag; never accept an unversioned update.
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = (await store.list({ prefix: key })).blobs.find(
      (b) => b.key === key,
    )?.etag;
    const data = await store.getWithMetadata(key, { type: "arrayBuffer" });
    const after = (await store.list({ prefix: key })).blobs.find(
      (b) => b.key === key,
    )?.etag;
    if (before && before === after && data) return { ...data, etag: after };
  }
  throw new Error("Could not obtain a consistent storage version.");
}

async function openWorkspace(store, workspace) {
  const directory = await mkdtemp(path.join(tmpdir(), "kabarkelas-"));
  let runtime;
  try {
    const saved = await snapshot(store, snapshotKey(workspace));
    const databasePath = path.join(directory, "demo.sqlite");
    if (saved)
      await writeFile(databasePath, gunzipSync(Buffer.from(saved.data)));
    runtime = createApplication({ databasePath, secureCookies: true });
    return {
      ...runtime,
      databasePath,
      directory,
      etag: saved?.etag,
      exists: !!saved,
    };
  } catch (error) {
    runtime?.db.close();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
async function closeWorkspace(runtime) {
  try {
    runtime.db.close();
  } finally {
    await rm(runtime.directory, { recursive: true, force: true });
  }
}
async function saveWorkspace(store, workspace, runtime) {
  runtime.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  const compressed = gzipSync(await readFile(runtime.databasePath));
  const result = await store.set(snapshotKey(workspace), binary(compressed), {
    ...(runtime.etag ? { onlyIfMatch: runtime.etag } : { onlyIfNew: true }),
    metadata: { updatedAt: new Date().toISOString(), format: "sqlite-gzip-v1" },
  });
  if (result.modified) runtime.etag = result.etag;
  return result.modified;
}
function normalizedEvent(event) {
  const original = event.path || "/";
  const route = original.startsWith("/.netlify/functions/api")
    ? "/api" + original.slice("/.netlify/functions/api".length)
    : original;
  return {
    ...event,
    path: route,
    rawPath: route,
    requestContext: {
      ...event.requestContext,
      http: { ...event.requestContext?.http, path: route },
    },
  };
}

// A new SQLite instance is opened for every invocation. Blobs is the durable store;
// /tmp is only a working copy. Compare-and-set prevents concurrent lost updates.
export async function handleAPI(event, context, { store }) {
  const previous = workspaceFor(event),
    workspace = previous || randomBytes(32).toString("hex");
  let runtime;
  try {
    runtime = await openWorkspace(store, workspace);
    const e = normalizedEvent(event);
    const before = runtime.db
      .prepare("SELECT total_changes() AS count")
      .get().count;
    const response = await serverless(runtime.app, {
      binary: [
        "application/zip",
        "application/pdf",
        "application/octet-stream",
      ],
    })(e, context);
    const changed =
      runtime.db.prepare("SELECT total_changes() AS count").get().count !==
      before;
    if (
      (changed || runtime.migrated) &&
      response.statusCode < 400 &&
      !(await saveWorkspace(store, workspace, runtime))
    )
      return json(
        409,
        "Data baru saja diperbarui dari tab lain. Muat ulang lalu ulangi perubahan.",
      );
    if (!previous) {
      response.multiValueHeaders ??= {};
      response.multiValueHeaders["set-cookie"] = [
        ...(response.multiValueHeaders["set-cookie"] || []),
        `${workspaceCookie}=${workspace}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
      ];
    }
    response.headers = {
      ...response.headers,
      "cache-control": "private, no-store",
    };
    return response;
  } catch (error) {
    console.error("KabarKelas Netlify request:", error.message);
    return json(
      503,
      "Layanan demo belum tersedia. Periksa log Functions dan akses Netlify Blobs, lalu coba lagi.",
    );
  } finally {
    if (runtime) await closeWorkspace(runtime);
  }
}
