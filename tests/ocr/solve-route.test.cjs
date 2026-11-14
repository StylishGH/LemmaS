const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const frontendRequire = createRequire(path.join(root, 'frontend/package.json'));
const ts = frontendRequire('typescript');
const { NextRequest } = frontendRequire('next/server');
let directPayload;
const payload = { veredito: 'incorreto', desenvolvimento_presente: true, resultado_final_correto: false, transcricao_latex: '$8*7/2=17,5$', feedback_latex: 'Erro de transcrição' };
const source = ts.transpileModule(readFileSync(path.join(root,'frontend/app/api/ai/solve/route.ts'),'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText;
const moduleExports = {};
new Function('require','exports',source)((name) => {
  if (name === '@/lib/gemini') return {generateGeminiContent:async()=>({text:JSON.stringify(directPayload),model:'fixture'})};
  if (name === '@/lib/nvidia') return {getNvidiaApiKeys:()=>[],generateNvidiaContent:async()=>{throw Error('unexpected fallback');}};
  if (name === '@/lib/json-safe') return {safeParseJsonWithLatex:JSON.parse};
  return frontendRequire(name);
},moduleExports);
function request(extra = {}) { return new NextRequest('http://localhost/api/ai/solve', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer fixture'},body:JSON.stringify({enunciado:'Diagonais de 5 e 7 cm. Qual a área?',gabarito:'D',imagem_base64:'data:image/png;base64,fixture',...extra})}); }
const originalFetch = global.fetch;
test.after(()=>{global.fetch=originalFetch;});
test('backend OCR review returns immediately without second AI call',async()=>{
  global.fetch=async()=>Response.json({...payload, ocr_review_required:true, precisa_revisao_humana:true, arithmetic_check:{status:'conflict',checks:[]}});
  const data = await (await moduleExports.POST(request())).json();
  assert.equal(data.ocr_review_required,true);
  assert.equal(data.precisa_revisao_humana,true);
});
test('direct model result passes independent Python check even with high confidence',async()=>{
  directPayload={...payload,confianca_diagnostico:'alta'};
  global.fetch=async(url)=>String(url).endsWith('/evaluate') ? new Response('',{status:503}) : Response.json({status:'conflict',checks:[{equal:false}]});
  const data=await (await moduleExports.POST(request())).json();
  assert.equal(data.precisa_revisao_humana,true);
  assert.equal(data.ocr_review_required,true);
  assert.equal(data.transcricao_latex,payload.transcricao_latex);
});
test('confirmed incorrect equality cannot be approved',async()=>{
  directPayload={...payload,veredito:'aprovado',resultado_final_correto:true};
  global.fetch=async(url)=>String(url).endsWith('/evaluate') ? new Response('',{status:503}) : Response.json({status:'conflict',checks:[]});
  const data=await (await moduleExports.POST(request({transcricao_confirmada:'8*7/2=17.5'}))).json();
  assert.equal(data.veredito,'parcial');
  assert.equal(data.resultado_final_correto,false);
  assert.notEqual(data.ocr_review_required,true);
});
test('corrected work is reevaluated and can be approved',async()=>{
  directPayload={...payload,veredito:'aprovado',resultado_final_correto:true,transcricao_latex:'5*7/2=17.5'};
  global.fetch=async(url)=>String(url).endsWith('/evaluate') ? new Response('',{status:503}) : Response.json({status:'consistent',checks:[]});
  const data=await (await moduleExports.POST(request({transcricao_confirmada:'5*7/2=17.5'}))).json();
  assert.equal(data.veredito,'aprovado');
  assert.notEqual(data.precisa_revisao_humana,true);
});
test('missing verifier does not silently approve an image',async()=>{
  directPayload={...payload,veredito:'aprovado'};
  global.fetch=async()=>new Response('',{status:503});
  const data=await (await moduleExports.POST(request())).json();
  assert.equal(data.precisa_revisao_humana,true);
  assert.equal(data.arithmetic_check.status,'unavailable');
});
test('answer-only confirmation still requires development',async()=>{
  const data=await (await moduleExports.POST(request({transcricao_confirmada:'17.5'}))).json();
  assert.equal(data.veredito,'sem_desenvolvimento');
});
