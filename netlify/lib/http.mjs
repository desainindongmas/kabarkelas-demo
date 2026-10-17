// Keep the public Functions entry points on Netlify's current Web Request API.
// serverless-http still receives a Lambda-shaped event inside this adapter;
// it must not reinitialize Netlify's injected Blobs environment.
export async function toLambdaEvent(request,context={}){
  const url=new URL(request.url);
  const headers=Object.fromEntries(request.headers);
  headers['x-forwarded-proto']=url.protocol.slice(0,-1);
  return {
    httpMethod:request.method,
    path:url.pathname,
    rawUrl:url.toString(),
    headers,
    queryStringParameters:Object.fromEntries(url.searchParams),
    multiValueQueryStringParameters:Object.fromEntries([...new Set(url.searchParams.keys())].map(key=>[key,url.searchParams.getAll(key)])),
    body:['GET','HEAD'].includes(request.method)?undefined:await request.text(),
    isBase64Encoded:false,
    requestContext:{identity:{sourceIp:context.ip||'127.0.0.1'}},
  };
}

export function toResponse(result){
  const headers=new Headers();
  const multiple=result.multiValueHeaders||{};
  const multipleNames=new Set(Object.keys(multiple).map(key=>key.toLowerCase()));
  for(const [name,value] of Object.entries(result.headers||{})){
    if(!multipleNames.has(name.toLowerCase()))headers.set(name,String(value));
  }
  for(const [name,values] of Object.entries(multiple)){
    for(const value of values)headers.append(name,String(value));
  }
  const body=[204,304].includes(result.statusCode)?null:result.isBase64Encoded?Buffer.from(result.body,'base64'):result.body;
  return new Response(body,{status:result.statusCode,headers});
}

export function unavailable(error,context={}){
  console.error('KabarKelas Functions initialization:',error.message,'request:',context.requestId||'unknown');
  return Response.json({error:'Layanan data KabarKelas belum tersedia. Silakan coba lagi beberapa saat.'},{status:503,headers:{'cache-control':'private, no-store'}});
}
