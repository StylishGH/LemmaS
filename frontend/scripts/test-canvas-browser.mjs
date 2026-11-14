// Isolated browser regression suite: real components and CSS, no backend/account access.
// Run from frontend: node scripts/test-canvas-browser.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = fs.mkdtempSync(path.join(root, '.canvas-test-'));
const screenshotDir = process.env.CANVAS_TEST_OUTPUT || dir;
fs.mkdirSync(screenshotDir, { recursive: true });
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
try {
  fs.writeFileSync(path.join(dir, 'loader.cjs'), `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
  fs.writeFileSync(path.join(dir, 'ignore.cjs'), 'module.exports=function(){return ""}');
  const compiler = webpack({
    mode: 'development', devtool: false,
    entry: path.join(root, 'scripts/fixtures/canvas-harness.jsx'),
    output: { path: dir, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js'], alias: { '@': root }, modules: [path.join(root, 'node_modules')] },
    module: { rules: [
      { test: /\.[jt]sx?$/, exclude: /node_modules/, use: path.join(dir, 'loader.cjs') },
      { test: /\.css$/, use: path.join(dir, 'ignore.cjs') },
    ] },
    plugins: [new webpack.DefinePlugin({
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(''),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(''),
    })],
  });
  await new Promise((resolve, reject) => compiler.run((error, stats) => {
    compiler.close(() => {});
    if (error || stats.hasErrors()) reject(error || new Error(stats.toString({ all: false, errors: true })));
    else resolve();
  }));
  const css = await postcss([tailwind({ base: root })]).process(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), { from: path.join(root, 'app/globals.css') });
  fs.writeFileSync(path.join(dir, 'style.css'), css.css + fs.readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="style.css"><div id="root"></div><script src="bundle.js"></script>');
 const server=http.createServer((req,res)=>{const p=req.url.startsWith('/fonts/') ? path.join(path.dirname(require.resolve('katex/dist/katex.min.css')),req.url) : path.join(dir,req.url==='/'?'index.html':req.url); if(!fs.existsSync(p)){res.writeHead(404).end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,userDataDir:path.join(dir,'chrome-profile'),args:['--no-sandbox','--disable-dev-shm-usage']}).catch(error=>{server.close();throw error;});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.waitForSelector('canvas');
 await page.waitForFunction(()=>document.querySelector('canvas').width>300);
 await page.evaluate(()=>{const c=document.querySelectorAll('canvas')[1],vp=c.parentElement.parentElement,cr=c.getBoundingClientRect(),vr=vp.getBoundingClientRect();if(Math.abs(cr.top-vr.top)>=3||Math.abs(cr.left-vr.left)>=3)throw new Error(`Canvas displaced inside viewport: canvas=(${cr.left},${cr.top}) viewport=(${vr.left},${vr.top})`);const hit=document.elementFromPoint(vr.left+60,vr.top+60);if(hit!==c)throw new Error(`Top-left of lousa hit ${hit?.tagName} instead of ink canvas`);});
 const stroke=async(points,pointerType='pen')=>page.evaluate((points,pointerType)=>{const c=document.querySelectorAll('canvas')[1],r=c.getBoundingClientRect();points.forEach(([x,y,pressure=.7],i)=>c.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===points.length-1?'pointerup':'pointermove',{bubbles:true,pointerId:1,pointerType,button:0,buttons:i===points.length-1?0:1,clientX:r.left+x,clientY:r.top+y,pressure})));},points,pointerType);
 const count=()=>page.evaluate(()=>window.testDocs[window.testIndex].strokes.length);
 const clickTitle=title=>page.click(`button[title="${title}"]`);
 const pixel=(x,y)=>page.evaluate((x,y)=>Array.from(document.querySelector('canvas').getContext('2d').getImageData(x,y,1,1).data),x,y);
 await stroke([[20,30],[150,30]]);
 assert.equal(await count(),1); assert.ok((await pixel(100,30))[3]>0,'two-point stroke remains a line');
 await clickTitle('Desfazer');assert.equal(await count(),0);await clickTitle('Refazer');assert.equal(await count(),1);
 console.log('PASS short stroke, endpoint, undo/redo');
 await page.click('#open'); await page.waitForSelector('button[title="Minimizar"]');
 assert.equal(await page.$$eval('canvas',c=>c.length),2); assert.equal(await count(),1);
 await stroke([[20,150],[1100,150]]);
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Sair do Modo Foco')).click());
 await page.waitForSelector('#open');await page.waitForFunction(()=>document.querySelector('canvas').width>1100);
 assert.equal(await count(),2);assert.ok((await pixel(1050,150))[3]>0);
 assert.ok(await page.evaluate(()=>document.querySelector('canvas').parentElement.parentElement.scrollWidth>1000));
 const exported=await page.evaluate(async()=>{const img=new Image();img.src=window.exportDrawing();await img.decode();return {width:img.width,height:img.height};});assert.ok(exported.width>1100);
 console.log('PASS immediate focus roundtrip, single canvas pair, complete export and scrollable extent');
 await page.click('#question');assert.equal(await count(),0);await page.click('#question');assert.equal(await count(),2);
 await clickTitle('Limpar Lousa');assert.equal(await count(),0);await clickTitle('Desfazer');assert.equal(await count(),2);
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Borracha').click());
 await stroke([[85,30],[85,30]]);assert.equal(await count(),1);await clickTitle('Desfazer');assert.equal(await count(),2);
 console.log('PASS question isolation, retained history, reversible clear and segment eraser');
 await clickTitle('Desfazer'); await page.click('#theme'); await clickTitle('Refazer');
 assert.equal(await page.evaluate(()=>window.testDocs[0].strokes.at(-1).color),'#1A1A1A');
 await page.click('#open');await page.waitForSelector('[title="Arrastar"]');
 await page.screenshot({path:path.join(screenshotDir,'focus-light.png')});
 const colors=await page.evaluate(()=>{const formula=document.querySelector('.katex');const panel=document.querySelector('[title="Minimizar"]').closest('.rounded-2xl');return {math:getComputedStyle(formula).color,panel:getComputedStyle(panel).backgroundColor};});
 console.log('Light colors',colors);assert.equal(colors.panel,'rgb(255, 255, 255)');
 const grip=await page.$('[title="Arrastar"]');const before=await grip.boundingBox();
 await page.mouse.move(before.x+8,before.y+8);await page.mouse.down();await page.mouse.move(before.x-90,before.y+40,{steps:4});await page.mouse.up();await page.evaluate(()=>new Promise(requestAnimationFrame));
 const after=await grip.boundingBox();assert.ok(Math.abs(after.y-(before.y+32))<3,'HUD drag has no header-offset jump');
 await page.mouse.move(after.x+8,after.y+8);await page.mouse.down();await page.mouse.move(-200,-200,{steps:3});await page.mouse.up();const bound=await grip.boundingBox();assert.ok(bound.x>=0&&bound.y>=0);
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-controls') === 'focus-socratic-tutor').click());
 await page.focus('#typing');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>window.testIndex),0);
 console.log('PASS light theme, theme-aware redo, HUD drag bounds, input navigation isolation');
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-controls')==='focus-socratic-tutor').click());
 await clickTitle('Limpar Lousa');
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Caneta').click());
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='8px').click());
 await page.evaluate(()=>{
   const c=document.querySelectorAll('canvas')[1],r=c.getBoundingClientRect();
   const ev=(type,x,pressure,pointerId=5,pointerType='pen')=>new PointerEvent(type,{bubbles:true,pointerId,pointerType,button:0,buttons:1,clientX:r.left+x,clientY:r.top+250,pressure});
   c.dispatchEvent(ev('pointerdown',20,.2));
   c.dispatchEvent(ev('pointerdown',25,.7,6,'touch'));
   c.dispatchEvent(ev('pointerup',35,.7,6,'touch'));
   const move=ev('pointermove',200,.9);window.coalescedCalls=0;
   Object.defineProperty(move,'getCoalescedEvents',{value:()=>{window.coalescedCalls++;return [ev('pointermove',100,.2),ev('pointermove',200,.9)];}});
   c.dispatchEvent(move);c.dispatchEvent(ev('pointerup',250,0));
 });
 assert.equal(await count(),1);
 assert.deepEqual(await page.evaluate(()=>({calls:window.coalescedCalls,pressures:window.testDocs[0].strokes[0].points.map(p=>Number(p.pressure.toFixed(3)))})),{calls:1,pressures:[.2,.2,.9,.9]});
 const thickness=await page.evaluate(()=>{const c=document.querySelector('canvas'),ctx=c.getContext('2d');return [40,230].map(x=>{const d=ctx.getImageData(x,235,1,30).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>128)n++;return n;});});
 assert.ok(thickness[1]>thickness[0], 'replayed pen retains pressure thickness');
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Toque + Caneta')).click());
 await stroke([[30,300],[150,300]],'touch');assert.equal(await count(),1);
 await page.evaluate(()=>{const c=document.querySelectorAll('canvas')[1],r=c.getBoundingClientRect();for(const [type,x] of [['pointerdown',20],['pointermove',200],['pointercancel',0]])c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'pen',button:0,buttons:1,clientX:r.left+x,clientY:r.top+300,pressure:.7}));});
 assert.equal(await count(),2);assert.equal(await page.evaluate(()=>window.testDocs[0].strokes[1].points.at(-1).x),200);
 console.log('PASS coalesced samples, pressure replay, palm rejection and pointer cancellation');
 await page.evaluate(()=>{const c=document.querySelectorAll('canvas')[1],r=c.getBoundingClientRect();for(const [type,x] of [['pointerdown',30],['pointermove',180]])c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'pen',button:0,buttons:1,clientX:r.left+x,clientY:r.top+350,pressure:.7}));});
 await page.setViewport({width:1024,height:768,deviceScaleFactor:2});
 await page.waitForFunction(()=>document.querySelector('canvas').width>=1900);
 await page.evaluate(()=>{const c=document.querySelectorAll('canvas')[1],r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'pen',button:0,clientX:r.left+240,clientY:r.top+350,pressure:0}));});
 assert.equal(await count(),3);
 await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Sair do Modo Foco')).click());
 assert.ok(await page.evaluate(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Palma ATIVA'))));
 await page.click('#open');
 await page.setViewport({width:390,height:844,deviceScaleFactor:2});
 await page.waitForFunction(()=>document.querySelector('[title="Arrastar"]').getBoundingClientRect().x<390);
 await page.screenshot({path:path.join(screenshotDir,'focus-mobile.png')});
 console.log('Mobile HUD',await page.$eval('[title="Minimizar"]',b=>{const r=b.closest('.rounded-2xl').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};}));
 await page.evaluate(()=>window.setLongQuestion(true));
 await page.waitForFunction(()=>document.querySelector('[title="Minimizar"]').closest('.rounded-2xl').textContent.length>1000);
 const longPanel=await page.$eval('[title="Minimizar"]',b=>b.closest('.rounded-2xl').getBoundingClientRect().bottom);
 assert.ok(longPanel<=844, 'long question stays within mobile viewport');
 console.log('PASS resize during stroke, DPR change, retained pen settings and long mobile questions');
 assert.deepEqual(errors,[]);console.log('ALL BROWSER CHECKS PASSED');
 }finally{await browser.close();server.close();}

} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
