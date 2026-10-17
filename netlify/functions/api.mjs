import { connectLambda, getStore } from '@netlify/blobs';
import { handleAPI } from '../lib/runtime.mjs';

export async function handler(event,context){
  connectLambda(event);
  const store=getStore({name:'kabarkelas-demo-v1',consistency:'strong'});
  return handleAPI(event,context,{store,triggerWorker:async({workspace,jobId,cookie})=>{
    const site=process.env.DEPLOY_PRIME_URL||process.env.URL;
    if(!site)throw new Error('Netlify site URL is not available.');
    const response=await fetch(new URL('/.netlify/functions/report-worker-background',site),{
      method:'POST',headers:{'content-type':'application/json',cookie},
      body:JSON.stringify({workspace,jobId}),
    });
    if(!response.ok)throw new Error(`Background function returned ${response.status}`);
  }});
}
