// Image-only event carousel. Original photographs remain in assets/imgs/.
(() => {
 const viewport=document.getElementById('event-photo-slider');if(!viewport)return;
 const photos=[
  {
    "file": "dsc01419",
    "alt": "무대 위 연사의 뒤로 행사 참석자들이 객석을 가득 채운 모습"
  },
  {
    "file": "dsc01945",
    "alt": "테이블에 둘러앉아 세션에 참여하는 행사 참석자들"
  },
  {
    "file": "dsc03078",
    "alt": "무대 위 두 연사가 대화를 나누는 패널 세션"
  },
  {
    "file": "dsc03374",
    "alt": "야외 행사장에 모여 이야기를 나누는 참석자들"
  },
  {
    "file": "dsc03644",
    "alt": "무대 뒤에서 바라본 패널 연사들과 객석의 모습"
  },
  {
    "file": "ukf-summit-2025-11",
    "alt": "객석을 배경으로 무대 위에서 함께 기념사진을 남기는 참석자들"
  },
  {
    "file": "dsc01974-copy",
    "alt": "극장 무대 위에 모여 단체사진을 촬영한 행사 참석자들"
  },
  {
    "file": "dsc03163",
    "alt": "세 명의 패널 연사가 무대에서 이야기를 나누는 모습"
  },
  {
    "file": "dsc03298",
    "alt": "실내 행사장의 테이블에 앉아 세션에 집중하는 참석자들"
  },
  {
    "file": "dsc03577",
    "alt": "네 명의 연사가 함께하는 무대 위 패널 토론"
  },
  {
    "file": "dsc03642",
    "alt": "행사장 측면에서 바라본 패널 토론과 객석"
  },
  {
    "file": "ukf-summit-2025-07",
    "alt": "밝은 실내 행사장에서 서서 대화를 나누는 참석자들"
  },
  {
    "file": "ukf-summit-2025-09",
    "alt": "어두운 무대 위에서 마이크를 들고 발표하는 연사"
  }
];
 const track=document.getElementById('event-photo-track'),carousel=viewport.closest('.photo-carousel');
 const dialog=document.getElementById('photo-dialog'),image=document.getElementById('photo-full'),counter=document.getElementById('photo-count');
 const position=document.getElementById('photo-slider-count'),pause=document.getElementById('photo-slider-pause');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const asset=(photo,size)=>`assets/event-photos/${photo.file}-${size}.webp`;
 const pauseIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
 const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>';
 let current=0,largeCurrent=0,opener,previousOverflow='',timer=0,settleTimer=0,visible=false,hovered=false,focused=false,paused=false;
 const stop=()=>clearTimeout(timer);
 const canPlay=()=>visible&&!hovered&&!focused&&!paused&&!preference.matches&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]');
 const stride=()=>slides[0].getBoundingClientRect().width+1;
 function schedule(){stop();if(canPlay())timer=setTimeout(()=>{if(canPlay())navigate(1);},3000);}
 function move(index){stop();viewport.scrollTo({left:index*stride(),behavior:preference.matches?'instant':'smooth'});}
 function navigate(delta){
  if(delta<0&&current===0){viewport.scrollTo({left:photos.length*stride(),behavior:'instant'});requestAnimationFrame(()=>move(photos.length-1));}
  else move(current+delta);
 }
 function settle(){
  clearTimeout(settleTimer);const index=Math.round(viewport.scrollLeft/stride());current=index%photos.length;
  if(index>=photos.length)viewport.scrollTo({left:current*stride(),behavior:'instant'});
  position.textContent=`${String(current+1).padStart(2,'0')} / ${photos.length}`;schedule();
 }
 function show(index){largeCurrent=(index+photos.length)%photos.length;const photo=photos[largeCurrent];image.src=asset(photo,1800);image.alt=photo.alt;counter.textContent=`${String(largeCurrent+1).padStart(2,'0')} / ${photos.length}`;}
 function open(index,trigger){opener=trigger;stop();show(index);previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}
 const slides=photos.map((photo,index)=>{
  const slide=document.createElement('button');slide.type='button';slide.className='photo-slide';slide.setAttribute('aria-label',`${photo.alt} — ${index+1} / ${photos.length}, 사진 크게 보기`);slide.setAttribute('aria-haspopup','dialog');slide.setAttribute('aria-controls','photo-dialog');
  const img=document.createElement('img');img.src=asset(photo,720);img.srcset=`${asset(photo,720)} 720w, ${asset(photo,1800)} 1800w`;img.sizes='(max-width:560px) 82vw, (max-width:1000px) 45vw, 33vw';img.alt=photo.alt;img.loading='lazy';img.decoding='async';img.width=720;img.height=480;
  slide.append(img);slide.addEventListener('click',()=>open(index,slide));track.append(slide);return slide;
 });
 // Inert copies allow the forward loop to reset without a visible rewind.
 slides.slice(0,4).forEach(slide=>{const copy=slide.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.tabIndex=-1;copy.inert=true;copy.removeAttribute('aria-haspopup');copy.removeAttribute('aria-controls');track.append(copy);});
 document.getElementById('photo-slider-prev').addEventListener('click',()=>navigate(-1));
 document.getElementById('photo-slider-next').addEventListener('click',()=>navigate(1));
 function updatePause(){pause.innerHTML=paused?playIcon:pauseIcon;pause.setAttribute('aria-label',paused?'사진 자동 재생 시작':'사진 자동 재생 일시정지');pause.setAttribute('aria-pressed',String(paused));pause.hidden=preference.matches;}
 pause.addEventListener('click',()=>{paused=!paused;updatePause();schedule();});updatePause();
 viewport.addEventListener('scroll',()=>{stop();clearTimeout(settleTimer);settleTimer=setTimeout(settle,160);},{passive:true});viewport.addEventListener('scrollend',settle);
 carousel.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;stop();}});
 carousel.addEventListener('pointerleave',()=>{hovered=false;schedule();});
 carousel.addEventListener('pointerdown',stop,{passive:true});carousel.addEventListener('pointerup',schedule,{passive:true});
 carousel.addEventListener('focusin',()=>{focused=true;stop();});carousel.addEventListener('focusout',()=>{focused=carousel.contains(document.activeElement);schedule();});
 viewport.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=event.key==='ArrowRight'?1:-1;slides[(current+delta+photos.length)%photos.length].focus({preventScroll:true});navigate(delta);});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(viewport);
 let previousWidth=0;new ResizeObserver(()=>{const width=viewport.clientWidth;if(Math.abs(width-previousWidth)>1){previousWidth=width;viewport.scrollTo({left:current*stride(),behavior:'instant'});}}).observe(viewport);
 document.addEventListener('visibilitychange',schedule);preference.addEventListener('change',()=>{updatePause();stop();viewport.scrollTo({left:current*stride(),behavior:'instant'});schedule();});
 document.getElementById('photo-close').addEventListener('click',()=>dialog.close());
 document.getElementById('photo-prev').addEventListener('click',()=>show(largeCurrent-1));document.getElementById('photo-next').addEventListener('click',()=>show(largeCurrent+1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(largeCurrent+(event.key==='ArrowRight'?1:-1));}});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;opener.focus({preventScroll:true});schedule();});
})();
