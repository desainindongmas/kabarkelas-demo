import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './app.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const {app}=createApplication({databasePath:process.env.DB_PATH||path.join(root,'data/kabarkelas.sqlite')});
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(root,'dist')));app.get('/{*splat}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));}else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const port=Number(process.env.PORT||3000);app.listen(port,'0.0.0.0',()=>console.log(`KabarKelas ready on port ${port}`));
