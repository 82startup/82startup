// Distort a few random glyphs while preserving the original title's shaping/layout.
(() => {
 const title=document.querySelector('.hero h1');if(!title)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const candidates=[];
 [...title.children].forEach(line=>{
  const text=line.textContent,face=document.createElement('span');face.className='hero-glitch';
  const node=document.createTextNode(text);face.append(node);line.replaceChildren(face);
  for(let index=0;index<text.length;index++)if(/[a-z0-9]/i.test(text[index]))candidates.push({face,node,text,index});
 });
 let visible=false,timer=0,reset=0;
 function clearBurst(){title.classList.remove('is-glitching');title.querySelectorAll('.glitch-layer').forEach(layer=>layer.remove());}
 const stop=()=>{clearTimeout(timer);clearTimeout(reset);clearBurst();};
 const active=()=>visible&&!preference.matches&&document.visibilityState==='visible';
 function burst(){
  clearBurst();const available=[...candidates],count=Math.min(available.length,2+Math.floor(Math.random()*4));
  const range=document.createRange();
  for(let i=0;i<count;i++){
   const chosen=available.splice(Math.floor(Math.random()*available.length),1)[0];
   range.setStart(chosen.node,chosen.index);range.setEnd(chosen.node,chosen.index+1);
   const glyph=range.getBoundingClientRect(),face=chosen.face.getBoundingClientRect();
   if(!glyph.width||!face.width)continue;
   const left=Math.max(0,glyph.left-face.left-1),right=Math.max(0,face.right-glyph.right-1);
   const delay=Math.round(Math.random()*90);
   ['a','b'].forEach(variant=>{
    const layer=document.createElement('span');layer.className=`glitch-layer glitch-layer--${variant}`;
    layer.setAttribute('aria-hidden','true');layer.textContent=chosen.text;
    layer.style.setProperty('--glyph-left',`${left}px`);layer.style.setProperty('--glyph-right',`${right}px`);layer.style.setProperty('--glitch-delay',`${delay}ms`);
    chosen.face.append(layer);
   });
  }
  title.classList.add('is-glitching');reset=setTimeout(clearBurst,560);
 }
 function schedule(first=false){
  clearTimeout(timer);if(!active())return;
  timer=setTimeout(()=>{if(!active())return;if(!document.querySelector('dialog[open]'))burst();schedule();},first?1300+Math.random()*500:900+Math.random()*900);
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;stop();schedule(true);},{threshold:.04}).observe(title);
 document.addEventListener('visibilitychange',()=>{stop();schedule(true);});
 preference.addEventListener('change',()=>{stop();schedule(true);});
 window.addEventListener('resize',()=>{stop();schedule(true);});
})();
