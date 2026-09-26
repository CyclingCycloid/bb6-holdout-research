import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const types = {'.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.tex':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()){res.writeHead(404);res.end('not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Content-Length':fs.statSync(f).size});
  fs.createReadStream(f).pipe(res);
}).listen(8765,'0.0.0.0',()=>console.log('serving on :8765'));
