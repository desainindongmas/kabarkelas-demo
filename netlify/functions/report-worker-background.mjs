import { getStore } from '@netlify/blobs';
import { handleReportWorker } from '../lib/runtime.mjs';
import { toLambdaEvent,toResponse,unavailable } from '../lib/http.mjs';

export default async function reportWorker(request,context){
  try{
    const store=getStore({name:'kabarkelas-demo-v1',consistency:'strong'});
    return toResponse(await handleReportWorker(await toLambdaEvent(request,context),{store}));
  }catch(error){return unavailable(error,context);}
}
