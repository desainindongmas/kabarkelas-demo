import { getStore } from '@netlify/blobs';
import { handleAPI } from '../lib/runtime.mjs';
import { toLambdaEvent,toResponse,unavailable } from '../lib/http.mjs';

export default async function api(request,context){
  try{
    // Netlify's current runtime injects both edgeURL and uncachedEdgeURL.
    // connectLambda() replaces this context with an incomplete legacy version.
    const store=getStore({name:'kabarkelas-demo-v1',consistency:'strong'});
    const event=await toLambdaEvent(request,context);
    const result=await handleAPI(event,context,{store,triggerWorker:async({workspace,jobId,cookie})=>{
      const response=await fetch(new URL('/.netlify/functions/report-worker-background',request.url),{
        method:'POST',headers:{'content-type':'application/json',cookie},
        body:JSON.stringify({workspace,jobId}),
      });
      if(!response.ok)throw new Error(`Background function returned ${response.status}`);
    }});
    return toResponse(result);
  }catch(error){return unavailable(error,context);}
}
