import React, {useState, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider, useTheme} from '@/components/theme-provider';
import SpenSmartCanvas from '@/components/lousa/SpenSmartCanvas';
import ImmersiveFocusOverlay from '@/components/bancada/ImmersiveFocusOverlay';
import {createCanvasDocument} from '@/lib/canvas-document';
function Harness(){
 const [focus,setFocus]=useState(false), [index,setIndex]=useState(0), [engine,setEngine]=useState('spen-dual');
 const docs=useRef([createCanvasDocument(), createCanvasDocument()]);
 const [longQuestion,setLongQuestion]=useState(false);window.setLongQuestion=setLongQuestion;
 const exportRef=useRef(null); const {toggleTheme}=useTheme();
 window.testDocs=docs.current; window.exportDrawing=()=>exportRef.current?.(); window.testIndex=index;
 const question={id:index+1,enunciado:(longQuestion ? 'Texto da questão com desenvolvimento. '.repeat(180) : '')+'Resolva $x^2 + 2x + 1 = 0$.\nA) $x = -1$\nB) $x = 1$',gabarito:'A', banca:'Teste'};
 return <><button id="open" onClick={()=>setFocus(true)}>Foco</button><button id="theme" onClick={toggleTheme}>Tema</button><button id="question" onClick={()=>setIndex(1-index)}>Questão</button>
 <div style={{width:600,height:650}}>{!focus && <SpenSmartCanvas key={index} documentState={docs.current[index]} onEvaluateOcr={async()=>{}} exportCanvasRef={exportRef}/>}</div>
 {focus && <ImmersiveFocusOverlay question={question} currentIndex={index} totalQuestions={2} activeEngine={engine} onChangeEngine={setEngine} onNext={index===0 ? ()=>setIndex(1) : undefined} onPrev={index===1 ? ()=>setIndex(0) : undefined} lousaDocument={docs.current[index]} onLousaStrokesChange={()=>{}} geometricCommands={[]} onGeometricCommandsChange={()=>{}} onEvaluateDiscursive={async()=>{}} isEvaluating={false} socraticTutor={<input id="typing"/>} onClose={()=>setFocus(false)}/>}
 </>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ThemeProvider><Harness/></ThemeProvider></React.StrictMode>);
