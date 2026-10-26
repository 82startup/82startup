// Illustrative tech-company marks; this strip does not assert event affiliation.
(() => {
 const strip=document.querySelector('.logo-marquee');if(!strip)return;
 const control=document.getElementById('company-logo-pause');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const pauseIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
 const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>';
 let visible=false,paused=false;
 function sync(){strip.classList.toggle('is-running',visible&&!paused&&!preference.matches&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]'));control.hidden=preference.matches;}
 control.addEventListener('click',()=>{paused=!paused;control.innerHTML=paused?playIcon:pauseIcon;control.setAttribute('aria-pressed',String(paused));control.setAttribute('aria-label',paused?'로고 슬라이드 재생':'로고 슬라이드 일시정지');sync();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1}).observe(strip);
 document.addEventListener('visibilitychange',sync);document.addEventListener('toggle',sync,true);document.addEventListener('close',sync,true);preference.addEventListener('change',sync);sync();
})();
