// Original canvas ASCII field with outward radial waves and drifting embers.
// Not the proprietary React Bits Pro component or source.
(() => {
 const host=document.querySelector('.hero-shell');if(!host)return;
 const canvas=document.createElement('canvas');canvas.className='glyph-ember-canvas';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx){canvas.remove();return;}
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const glyphPools=[".,:;`'\"", "!|/\\-_~^+=<>[]{}()?", "0123456789abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*@"];
 const gray='48,48,48';
 let width=0,height=0,cols=0,rows=0,heat,next,raf=0,last=0,clock=0,visible=true,disposed=false;
 let cellX=9,cellY=12,radialDistances,noise;
 const frameRate=24;
 const pointer={x:-1000,y:-1000},bursts=[],waves=[];
 let waveInitialized=false,nextWaveAt=0;
 const fract=n=>n-Math.floor(n);
 const random=(x,y,t)=>fract(Math.sin(x*127.1+y*311.7+t*17.7)*43758.5453);
 function step(){
  const t=clock;
  const cooling=.82/Math.max(8,rows*.60);
  for(let x=0;x<cols;x++){
   const fuel=.76+.18*Math.sin(x*.23+t*1.3)+.14*random(x,rows,t);
   next[(rows-1)*cols+x]=Math.min(1,Math.max(.28,fuel));
  }
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols;x++){
   const wind=Math.round(Math.sin(y*.17-t*.7)*.8+Math.sin(x*.11+t)*.35);
   const xx=(x+wind+cols)%cols;
   const below=(y+1)*cols;
   let value=heat[below+xx]*.48+heat[below+(xx+1)%cols]*.22+heat[below+(xx+cols-1)%cols]*.22+heat[Math.min(rows-1,y+2)*cols+xx]*.08;
   value-=cooling*(.4+noise[(y*cols+x+Math.floor(t*17))%noise.length]*.9);
   if(pointer.x>-100){const dx=x*cellX-pointer.x,dy=y*cellY-pointer.y;value*=1-.28*Math.exp(-(dx*dx+dy*dy)/4200);}
   for(const burst of bursts){const age=clock-burst.time;if(age<1.2){const dx=x*cellX-burst.x,dy=y*cellY-(height-age*125);value+=Math.exp(-(dx*dx/8000+dy*dy/1700))*.14*(1-age/1.2);}}
   next[y*cols+x]=Math.max(0,Math.min(1,value));
  }
  [heat,next]=[next,heat];
  while(bursts.length&&clock-bursts[0].time>1.2)bursts.shift();
 }
 function createWave(age=0){
  const x=width*.5,y=height*.5;
  return {x,y,born:clock-age,duration:2.6+Math.random()*1.2,
   startRadius:Math.min(width,height)*.055,
   endRadius:Math.hypot(Math.max(x,width-x),Math.max(y,height-y))*1.16,
   band:Math.max(42,Math.min(width,height)*(.13+Math.random()*.04)),strength:.64+Math.random()*.16};
 }
 function outwardWaves(){
  if(!waveInitialized){waves.push(createWave(.65));if(Math.random()<.45)waves.push(createWave(.1));waveInitialized=true;nextWaveAt=clock+.65+Math.random()*.65;}
  let expired=false;
  for(let i=waves.length-1;i>=0;i--)if(clock-waves[i].born>=waves[i].duration){waves.splice(i,1);expired=true;}
  if(expired)nextWaveAt=clock+.25+Math.random()*.45;
  if(!waves.length)nextWaveAt=clock;
  if(waves.length<2&&clock>=nextWaveAt){waves.push(createWave());nextWaveAt=clock+.65+Math.random()*.65;}
  return waves.map(wave=>{
   const progress=Math.max(0,Math.min(1,(clock-wave.born)/wave.duration));
   return {...wave,radius:wave.startRadius+(wave.endRadius-wave.startRadius)*progress,
    fade:Math.min(1,progress/.1)*Math.min(1,(1-progress)/.22)};
  });
 }
 function draw(){
  ctx.clearRect(0,0,width,height);
  // Monochrome atmosphere: only dark grey, with gentle opacity variation.
  for(let i=0;i<3;i++){
   const cx=width*(.18+i*.32)+Math.sin(clock*.4+i*2)*width*.05;
   const cy=height*.96;
   const radius=Math.min(width*.37,height*.68);
   const light=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
   const strength=.018+.009*(.5+.5*Math.sin(clock*.4+i));
   light.addColorStop(0,`rgba(${gray},${strength})`);
   light.addColorStop(.42,`rgba(${gray},${strength*.3})`);
   light.addColorStop(1,`rgba(${gray},0)`);
   ctx.fillStyle=light;ctx.fillRect(0,height-radius*1.1,width,radius*1.1);
  }
  ctx.font='500 12px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
  // One or two broad fronts travel only outward and fade beyond the hero edges.
  const fronts=outwardWaves();
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const px=x*cellX+cellX/2,py=height-(rows-y-1)*cellY;
   let energy=0,offsetX=0,offsetY=0;
   for(const front of fronts){
    const dx=px-front.x,dy=py-front.y,distance=radialDistances[y*cols+x];
    const edge=(distance-front.radius)/front.band;
    const ring=Math.exp(-edge*edge*.5)*front.fade;
    energy+=ring*front.strength;
    if(distance>1){const push=ring*front.band*.14/distance;offsetX+=dx*push;offsetY+=dy*push;}
   }
   const v=Math.min(1,heat[y*cols+x]*.32+energy);if(v<.045)continue;
   const pool=glyphPools[Math.min(glyphPools.length-1,Math.floor(v*glyphPools.length))];
   const variation=noise[(y*cols+x+Math.floor(clock*3))%noise.length];
   const glyph=pool[Math.min(pool.length-1,Math.floor(variation*pool.length))];
   const depth=.72+.28*(.5+.5*Math.sin(x*.065+y*.07+clock*.4));
   const alpha=(.022+v*.21)*depth*1.15;
   ctx.fillStyle=`rgba(${gray},${alpha.toFixed(3)})`;

   ctx.fillText(glyph,px+offsetX,py+offsetY);
  }
  // Floating grey embers vary in alpha instead of hue or white highlights.
  ctx.textBaseline='middle';ctx.lineWidth=.65;
  for(let i=0;i<26;i++){
   const phase=fract(clock*(.11+random(i,4,1)*.055)+random(i,7,3));
   const x=random(i,2,5)*width+Math.sin(phase*9+i)*16;
   const y=height-phase*height*.92;
   const fade=Math.min(1,phase*10)*Math.min(1,(1-phase)*7);
   const pulse=.82+.18*Math.sin(clock*3+i*1.7);
   const alpha=fade*pulse;
   const large=i%4===0;
   const size=large?14:12;
   const symbol=large?'✦':'+';
   ctx.font=`600 ${size}px "IBM Plex Sans",sans-serif`;
   const opacity=alpha*(.16+random(i,9,2)*.18)*1.15;
   ctx.shadowColor=`rgba(${gray},${opacity*.25})`;ctx.shadowBlur=large?8:5;
   ctx.fillStyle=`rgba(${gray},${opacity})`;
   ctx.fillText(symbol,x,y);
   // A faint grey trail follows the rising glyph.
   ctx.shadowBlur=4;ctx.fillStyle=`rgba(${gray},${opacity*.45})`;
   ctx.beginPath();ctx.arc(x-1.2,y+size*.7,large?1.6:1.2,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;

 }
 function wake(){if(!raf&&!disposed&&visible&&!document.hidden&&!reduce.matches){last=0;raf=requestAnimationFrame(frame);}}
 function frame(now){raf=0;if(disposed||!visible||document.hidden||reduce.matches)return;
  if(!last||now-last>=1000/frameRate){clock+=1/frameRate;step();draw();last=now;}
  raf=requestAnimationFrame(frame);
 }
 function resize(){
  width=host.clientWidth;height=host.clientHeight;const density=Math.max(1,Math.sqrt(width*height/(9*12*4000)));cellX=9*density;cellY=12*density;const dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  waves.length=0;waveInitialized=false;nextWaveAt=0;
  cols=Math.ceil(width/cellX);rows=Math.ceil(height/cellY);heat=new Float32Array(cols*rows);next=new Float32Array(cols*rows);
  radialDistances=new Float32Array(cols*rows);noise=new Float32Array(cols*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;radialDistances[i]=Math.hypot(x*cellX+cellX/2-width*.5,height-(rows-y-1)*cellY-height*.5);noise[i]=random(x,y,0);}
  for(let i=0;i<Math.min(16,rows);i++){clock+=.025;step();}draw();wake();
 }
 function move(e){if(reduce.matches)return;const r=host.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;}
 function leave(){pointer.x=pointer.y=-1000;}
 function stoke(e){if(reduce.matches||e.target.closest('a,button,input,select'))return;const r=host.getBoundingClientRect();bursts.push({x:e.clientX-r.left,time:clock});if(bursts.length>4)bursts.shift();}
 function preference(){cancelAnimationFrame(raf);raf=0;leave();draw();wake();}
 const resizer=new ResizeObserver(resize);resizer.observe(host);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(raf);raf=0;}});observer.observe(host);
 host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',stoke,{passive:true});
 document.addEventListener('visibilitychange',wake);reduce.addEventListener('change',preference);
 host.classList.add('has-glyph-ember');resize();
 window.addEventListener('pagehide',e=>{if(e.persisted)return;disposed=true;cancelAnimationFrame(raf);resizer.disconnect();observer.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',stoke);document.removeEventListener('visibilitychange',wake);reduce.removeEventListener('change',preference);});
})();
