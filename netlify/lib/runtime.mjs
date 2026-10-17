import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import serverless from 'serverless-http';
import { createApplication } from '../../app.mjs';

const workspaceCookie='kk_workspace';
const json=(statusCode,error)=>({statusCode,headers:{'content-type':'application/json','cache-control':'private, no-store'},body:JSON.stringify({error})});
const cookieHeader=event=>Object.entries(event.headers||{}).find(([name])=>name.toLowerCase()==='cookie')?.[1]||'';
const cookies=event=>Object.fromEntries(cookieHeader(event).split(';').map(c=>c.trim().split('=')));
const workspaceFor=event=>/^[a-f0-9]{64}$/.test(cookies(event)[workspaceCookie]||'')?cookies(event)[workspaceCookie]:null;
const snapshotKey=id=>`workspaces/${id}/database.gz`;
const resultKey=(workspace,id)=>`workspaces/${workspace}/jobs/${id}.json`;
const archiveKey=(workspace,id)=>`workspaces/${workspace}/archives/${id}.zip`;
const binary=buffer=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);

async function snapshot(store,key){
  const saved=await store.getWithMetadata(key,{type:'arrayBuffer'});
  if(!saved||saved.etag)return saved;
  // The official local Blobs emulator does not emit ETag on GET. Obtain a
  // stable read using its listing ETag; never accept an unversioned update.
  for(let attempt=0;attempt<3;attempt++){
    const before=(await store.list({prefix:key})).blobs.find(b=>b.key===key)?.etag;
    const data=await store.getWithMetadata(key,{type:'arrayBuffer'});
    const after=(await store.list({prefix:key})).blobs.find(b=>b.key===key)?.etag;
    if(before&&before===after&&data)return {...data,etag:after};
  }
  throw new Error('Could not obtain a consistent storage version.');
}

async function openWorkspace(store,workspace){
  const directory=await mkdtemp(path.join(tmpdir(),'kabarkelas-'));
  let runtime;
  try {
    const saved=await snapshot(store,snapshotKey(workspace));
    const databasePath=path.join(directory,'demo.sqlite');
    if(saved)await writeFile(databasePath,gunzipSync(Buffer.from(saved.data)));
    runtime=createApplication({databasePath,startJobs:false,secureCookies:true});
    return {...runtime,databasePath,directory,etag:saved?.etag,exists:!!saved};
  } catch(error){runtime?.db.close();await rm(directory,{recursive:true,force:true});throw error;}
}
async function closeWorkspace(runtime){try{runtime.db.close();}finally{await rm(runtime.directory,{recursive:true,force:true});}}
async function saveWorkspace(store,workspace,runtime){
  runtime.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  const compressed=gzipSync(await readFile(runtime.databasePath));
  const result=await store.set(snapshotKey(workspace),binary(compressed),{
    ...(runtime.etag?{onlyIfMatch:runtime.etag}:{onlyIfNew:true}),
    metadata:{updatedAt:new Date().toISOString(),format:'sqlite-gzip-v1'},
  });
  if(result.modified)runtime.etag=result.etag;
  return result.modified;
}
function normalizedEvent(event){
  const original=event.path||'/';
  const route=original.startsWith('/.netlify/functions/api')?'/api'+original.slice('/.netlify/functions/api'.length):original;
  return {...event,path:route,rawPath:route,requestContext:{...event.requestContext,http:{...event.requestContext?.http,path:route}}};
}

// A new SQLite instance is opened for every invocation. Blobs is the durable store;
// /tmp is only a working copy. Compare-and-set prevents concurrent lost updates.
export async function handleAPI(event,context,{store,triggerWorker}){
  const previous=workspaceFor(event),workspace=previous||randomBytes(32).toString('hex');
  let runtime;
  try {
    runtime=await openWorkspace(store,workspace);
    const e=normalizedEvent(event);
    if(e.path.startsWith('/api/report-jobs')){
      const rows=runtime.db.prepare("SELECT school,body FROM records WHERE kind='jobs'").all();
      await Promise.all(rows.map(async row=>{const job=JSON.parse(row.body);const result=await store.get(resultKey(workspace,job.id),{type:'json'});if(result)runtime.put('jobs',row.school,{...job,...result});}));
    }
    const match=e.path.match(/^\/api\/report-jobs\/([a-zA-Z0-9-]+)\/download$/);
    if(e.httpMethod==='GET'&&match){
      const archive=await store.get(archiveKey(workspace,match[1]),{type:'arrayBuffer'});
      const result=await store.get(resultKey(workspace,match[1]),{type:'json'});
      if(archive&&result?.status==='Selesai'){
        const row=runtime.db.prepare("SELECT school,body FROM records WHERE id=? AND kind='jobs'").get(match[1]);
        if(row){runtime.put('jobs',row.school,{...JSON.parse(row.body),...result});await writeFile(path.join(runtime.generated,match[1]+'.zip'),Buffer.from(archive));}
      }
    }
    const before=runtime.db.prepare('SELECT total_changes() AS count').get().count;
    const response=await serverless(runtime.app,{binary:['application/zip','application/pdf','application/octet-stream']})(e,context);
    const changed=runtime.db.prepare('SELECT total_changes() AS count').get().count!==before;
    if(changed&&response.statusCode<400&&!await saveWorkspace(store,workspace,runtime))return json(409,'Data baru saja diperbarui dari tab lain. Muat ulang lalu ulangi perubahan.');
    if(!previous){
      response.multiValueHeaders??={};
      response.multiValueHeaders['set-cookie']=[...(response.multiValueHeaders['set-cookie']||[]),`${workspaceCookie}=${workspace}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`];
    }
    response.headers={...response.headers,'cache-control':'private, no-store'};
    if(e.httpMethod==='POST'&&e.path==='/api/report-jobs'&&response.statusCode===200){
      const job=JSON.parse(response.body);
      try{await triggerWorker({workspace,jobId:job.id,cookie:cookieHeader(event)});}catch(error){
        const row=runtime.db.prepare("SELECT school FROM records WHERE id=? AND kind='jobs'").get(job.id);
        runtime.put('jobs',row.school,{...job,status:'Gagal',error:'Worker belum tersedia. Coba lagi setelah deploy selesai.'});
        await saveWorkspace(store,workspace,runtime);
        throw error;
      }
    }
    return response;
  }catch(error){console.error('KabarKelas Netlify request:',error.message);return json(503,'Layanan demo belum tersedia. Periksa log Functions dan akses Netlify Blobs, lalu coba lagi.');}
  finally{if(runtime)await closeWorkspace(runtime);}
}

export async function handleReportWorker(event,{store}){
  let runtime,lockKey,acquired=false;
  try {
    const payload=JSON.parse(event.body||'{}'),workspace=workspaceFor(event);
    if(!workspace||payload.workspace!==workspace||!/^s[123]-job-\d+$/.test(payload.jobId||''))return json(400,'Permintaan pekerjaan tidak valid.');
    runtime=await openWorkspace(store,workspace);
    const token=cookies(event).kk_session;
    const row=token&&runtime.db.prepare('SELECT body FROM sessions WHERE token=? AND expires>?').get(token,Date.now());
    if(!row)return json(401,'Sesi demo tidak tersedia.');
    const user=JSON.parse(row.body),job=runtime.all(user.school,'jobs').find(j=>j.id===payload.jobId);
    if(!job||!['admin','principal','teacher','homeroom'].includes(user.role))return json(403,'Pekerjaan tidak tersedia untuk peran ini.');
    if(['teacher','homeroom'].includes(user.role)&&!job.ids.every(id=>runtime.all(user.school,'reports').some(r=>r.id===id&&user.classIds.includes(r.classId))))return json(403,'Pekerjaan di luar kelas Anda.');
    const finished=await store.get(resultKey(workspace,job.id),{type:'json'});
    if(finished?.status==='Selesai')return {statusCode:200,body:'Already completed'};
    lockKey=`workspaces/${workspace}/locks/${job.id}`;
    acquired=(await store.setJSON(lockKey,{startedAt:Date.now()},{onlyIfNew:true})).modified;
    if(!acquired)return {statusCode:202,body:'Already processing'};
    await store.setJSON(resultKey(workspace,job.id),{...job,status:'Berjalan'});
    runtime.progress.onUpdate=async progress=>store.setJSON(resultKey(workspace,job.id),progress);
    await runtime.runJob(job,user.school);
    const result=runtime.all(user.school,'jobs').find(j=>j.id===job.id);
    if(result.status==='Selesai')await store.set(archiveKey(workspace,job.id),binary(await readFile(path.join(runtime.generated,job.id+'.zip'))));
    await store.setJSON(resultKey(workspace,job.id),result);
    return {statusCode:200,body:result.status};
  }catch(error){console.error('KabarKelas report worker:',error.message);return json(500,'Pembuatan arsip gagal. Silakan coba lagi.');}
  finally{if(acquired)await store.delete(lockKey);if(runtime)await closeWorkspace(runtime);}
}
