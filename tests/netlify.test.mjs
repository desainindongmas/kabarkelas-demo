import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import JSZip from 'jszip';
import { handleAPI,handleReportWorker } from '../netlify/lib/runtime.mjs';

let directory,blobs,store,cookie='',queued;
const workers=[];
const cookieValues=response=>[...(response.multiValueHeaders?.['set-cookie']||[]),...(response.headers?.['set-cookie']?[response.headers['set-cookie']]:[])];
function event(route,body,session=cookie){return {httpMethod:body===undefined?'GET':'POST',path:'/.netlify/functions/api'+route.replace(/^\/api/,''),headers:{cookie:session,'content-type':'application/json','x-forwarded-proto':'https'},queryStringParameters:{},body:body===undefined?undefined:JSON.stringify(body),isBase64Encoded:false};}
async function call(route,body,session=cookie){const result=await handleAPI(event(route,body,session),{}, {store,triggerWorker:async request=>{queued=request;workers.push(request);}});if(session===cookie){for(const value of cookieValues(result)){const [key,v]=value.split(';')[0].split('=');const map=new Map(cookie.split('; ').filter(Boolean).map(c=>c.split('=')));map.set(key,v);cookie=[...map].map(([k,v])=>`${k}=${v}`).join('; ');}}return {...result,data:result.headers?.['content-type']?.includes('json')?JSON.parse(result.body):undefined};}
before(async()=>{directory=await mkdtemp(path.join(tmpdir(),'kabarkelas-blobs-test-'));blobs=new BlobsServer({directory});const address=await blobs.start();store=getStore({name:'kabarkelas-demo-v1',siteID:'local-netlify-test',token:'local-test-only',apiURL:address.address,consistency:'strong'});});
after(async()=>{await blobs.stop();await rm(directory,{recursive:true,force:true});});

test('Netlify session cookies and compressed snapshots persist across isolated invocations',async()=>{
  const unauthenticated=await call('/api/bootstrap');assert.equal(unauthenticated.statusCode,401);
  const login=await call('/api/session',{role:'admin',school:'s1'});assert.equal(login.statusCode,200,login.body);assert.match(cookie,/kk_session=/);assert.match(cookie,/kk_workspace=/);
  const first=await call('/api/bootstrap');assert.equal(first.statusCode,200,first.body);assert.equal(first.data.data.students.length,192);
  const s=first.data.data.students[0];assert.equal((await call('/api/students',{...s,address:'Alamat tersimpan melalui Netlify Blobs'})).statusCode,200);
  const restored=await call('/api/bootstrap');assert.equal(restored.data.data.students.find(st=>st.id===s.id).address,'Alamat tersimpan melalui Netlify Blobs');
});
test('independent Netlify visitors do not share edited data or session authority',async()=>{
  const own=cookie;cookie='';await call('/api/session',{role:'principal',school:'s1'});const second=await call('/api/bootstrap');assert.notEqual(second.data.data.students[0].address,'Alamat tersimpan melalui Netlify Blobs');const foreign=cookie.split('; ').find(c=>c.startsWith('kk_workspace='))+'; '+own.split('; ').find(c=>c.startsWith('kk_session='));assert.equal((await call('/api/bootstrap',undefined,foreign)).statusCode,401);cookie=own;
});
test('Netlify optimistic concurrency rejects a stale snapshot instead of losing edits',async()=>{
  const current=await call('/api/bootstrap');const s=current.data.data.students[1];
  const results=await Promise.all([call('/api/students',{...s,address:'Concurrent A'}),call('/api/students',{...s,address:'Concurrent B'})]);
  assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);
});
test('Netlify background worker persists PDF archive and completed jobs allow the next batch',async()=>{
  const b=await call('/api/bootstrap');const ids=b.data.data.reports.slice(0,3).map(r=>r.id);
  const posted=await call('/api/report-jobs',{ids});assert.equal(posted.statusCode,200,posted.body);assert.ok(queued);
  const job=queued;const workEvent={body:JSON.stringify({workspace:job.workspace,jobId:job.jobId}),headers:{cookie}};
  assert.equal((await handleReportWorker(workEvent,{store})).statusCode,200);
  const jobs=await call('/api/report-jobs');assert.equal(jobs.data.find(j=>j.id===job.jobId).status,'Selesai');
  const archive=await call(`/api/report-jobs/${job.jobId}/download`);assert.equal(archive.statusCode,200,archive.body);assert.ok(archive.isBase64Encoded);
  const zip=await JSZip.loadAsync(Buffer.from(archive.body,'base64'));assert.equal(Object.keys(zip.files).length,3);
  for(const file of Object.values(zip.files))assert.equal((await file.async('nodebuffer')).subarray(0,5).toString(),'%PDF-');
  const next=await call('/api/report-jobs',{ids});assert.equal(next.statusCode,200,next.body);
});
test('Netlify failed worker dispatch is retryable and worker rejects unrelated visitors',async()=>{
  const work=queued;const wrong={body:JSON.stringify({workspace:work.workspace,jobId:work.jobId}),headers:{cookie:'kk_workspace='+('a'.repeat(64))}};
  assert.equal((await handleReportWorker(wrong,{store})).statusCode,400);
  await handleReportWorker({body:JSON.stringify({workspace:work.workspace,jobId:work.jobId}),headers:{cookie}},{store});
  const b=await call('/api/bootstrap');const result=await handleAPI(event('/api/report-jobs',{ids:[b.data.data.reports[0].id]}),{}, {store,triggerWorker:async()=>{throw new Error('Simulated worker unavailable');}});
  assert.equal(result.statusCode,503);
  const jobs=await call('/api/report-jobs');assert.ok(jobs.data.some(j=>j.status==='Gagal'));
});
