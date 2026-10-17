import { connectLambda, getStore } from '@netlify/blobs';
import { handleReportWorker } from '../lib/runtime.mjs';

export async function handler(event){
  connectLambda(event);
  const store=getStore({name:'kabarkelas-demo-v1',consistency:'strong'});
  return handleReportWorker(event,{store});
}
