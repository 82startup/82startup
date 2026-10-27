// User-authorized NAVER, Altos Ventures and KOVA sponsor logo loop.
(() => {
 const strip=document.querySelector('.logo-marquee');if(!strip)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=false;
 function sync(){strip.classList.toggle('is-running',visible&&!preference.matches&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]'));}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1}).observe(strip);
 document.addEventListener('visibilitychange',sync);document.addEventListener('toggle',sync,true);document.addEventListener('close',sync,true);preference.addEventListener('change',sync);sync();
})();
