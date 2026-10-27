const route = location.pathname.split('/').pop().replace('.html', '') || 'index';
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
const closeIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const button = (label,href='tickets.html',cls='') => `<a class="button ${cls}" href="${href}"${/^https?:\/\//.test(href)?' target="_blank" rel="noopener noreferrer"':''}>${label}${arrow}</a>`;
const eyebrow = text => `<div class="eyebrow"><span aria-hidden="true">■</span> ${text}</div>`;
const navItems = [['index','Overview'],['schedule','Schedule'],['speakers','Speakers'],['venue','Venue']];
const eventPrice = event => event.prices.map(([label,price])=>price===0?label:`${label} $${price}`).join(' · ');
const eventTicket = (event,cls='') => `<a class="button ${cls}" href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer" aria-label="${event.title} — Luma ${event.prices.every(([,price])=>price===0)?'무료 등록':'티켓 구매'}">${event.prices.every(([,price])=>price===0)?'Register free':'Get tickets'} ${arrow}</a>`;
const programTitleLines={'opening-night':['Opening','Night'],summit:['Summit','2027'],expo:['Startup','Expo'],'vip-after-party':['82 Night','VIP After Party'],'founders-funders':['Founders &','Funders'],'community-evening':['Community','Evening']};
const eventCard = (event,index) => `<article class="program-card" data-event="${event.id}"><div class="program-timeline-date"><span>MAR</span><strong>${event.days.join("–")}</strong><small>2027</small></div><div class="program-art art-0${index+1}"><span class="index">${event.label}</span><h3 class="program-title">${(programTitleLines[event.id]||[event.cardTitle]).map(line=>`<span>${line}</span>`).join('')}</h3></div><div class="program-content"><p>${event.summary}</p><div class="program-facts"><span>${event.time}</span><span>${event.venue}</span><span class="program-price">${eventPrice(event)}</span></div><div class="program-actions">${eventTicket(event,'program-ticket')}<div class="card-bottom"><a class="program-schedule-link" href="schedule.html?day=${event.days[0]}" aria-label="${event.title} 프로그램 보기"><span>View program</span>${arrow}</a></div></div></div></article>`;
const header = `<a class="skip" href="#main">본문으로 건너뛰기</a><div class="announcement">MARCH ${route==='index'?'15—21':'16—19'}, 2027 <span>✳</span> SF BAY AREA <a href="tickets.html">SEE YOU THERE <span class="arrow" aria-hidden="true">↗</span></a></div><div class="wrap"><header class="header"><a class="logo" href="index.html" aria-label="82 Startup Summit home"><img src="assets/82startup-symbol.svg" alt="82 Startup 심볼" width="44" height="44"></a><nav class="nav" id="navigation" aria-label="Main navigation">${navItems.map(([r,n])=>`<a href="${r}.html" ${route===r?'class="active" aria-current="page"':''}>${n}</a>`).join('')}<a class="nav-community" href="https://open.kakao.com/o/gn88dnPe" target="_blank" rel="noopener noreferrer">Join Kakaotalk</a></nav>${button('Get tickets','tickets.html','small')}<button class="menu-toggle" aria-expanded="false" aria-controls="navigation" aria-label="메뉴 열기">☰</button></header></div>`;
const footer = `<footer class="wrap"><svg class="footer-filter-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><filter id="footer-text-inset" x="-5%" y="-10%" width="110%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="blur"/><feOffset in="blur" dx="0" dy="1.2" result="offset"/><feComposite in="SourceAlpha" in2="offset" operator="out" result="inner-edge"/><feFlood flood-color="#485008" flood-opacity="0.14" result="shadow-color"/><feComposite in="shadow-color" in2="inner-edge" operator="in" result="inner-shadow"/><feComposite in="inner-shadow" in2="SourceGraphic" operator="over"/></filter></defs></svg><div class="footer"><span class="footer-logo">82 STARTUP / SUMMIT 2027</span><nav aria-label="Footer">${navItems.slice(1).map(([r,n])=>`<a href="${r}.html">${n}</a>`).join('')}<a href="tickets.html">Tickets <span class="arrow" aria-hidden="true">↗</span></a></nav><span>© 2027 82 Startup</span></div><div class="footer-word"><span>82 STARTUP WEEK</span></div></footer>`;
const cta = `<section class="cta"><div>${eyebrow('YOUR NEXT CHAPTER')}<h2>Big ideas start<br>with a hello.</h2><p>2027년 3월, 샌프란시스코에서 만나요.</p></div>${button('Get your tickets')}</section>`;
function venueArt(compact=false){return `<figure class="venue-photo"><div class="venue-art"><img src="assets/fort-mason-aerial-christopher-michel.jpg" width="1280" height="959" alt="샌프란시스코 도심과 만을 배경으로 촬영한 Fort Mason Center의 항공사진" loading="lazy"></div><figcaption>${compact?'Photo: Christopher Michel':'Fort Mason Center for Arts & Culture <span>Photo: Christopher Michel</span>'}</figcaption></figure>`;}

const venueMapDialog = `<dialog id="venue-map-dialog" aria-labelledby="venue-map-modal-title"><div class="venue-map-modal-layout"><header class="venue-map-modal-header"><h2 id="venue-map-modal-title">Fort Mason · 3D venue map</h2><button type="button" class="modal-close" id="venue-map-close" aria-label="3D 맵 닫기" autofocus>${closeIcon}</button></header><iframe id="venue-map-full" title="Fort Mason 공간 및 층별 3D 지도"></iframe></div></dialog>`;
const techCompanies=[['google','Google'],['meta','Meta'],['nvidia','NVIDIA'],['anthropic','Anthropic'],['figma','Figma'],['github','GitHub'],['stripe','Stripe'],['vercel','Vercel']];
const techCompanyItems=techCompanies.map(([file,name])=>`<div class="company-logo-item" role="listitem"><img src="assets/company-logos/${file}.svg" width="32" height="32" alt="${name}"><span class="company-logo-name" aria-hidden="true">${name}</span></div>`).join('');
const showSponsorSection=false; // Temporarily hidden; enable when the sponsor section is ready.
const companyLogoStrip=`<section class="marquee logo-marquee" aria-label="테크 기업 로고"><div class="company-logo-viewport"><div class="company-logo-track"><div class="company-logo-group" role="list">${techCompanyItems}</div><div class="company-logo-group" role="list" aria-hidden="true" inert>${techCompanyItems}</div></div></div><button type="button" class="company-logo-pause" id="company-logo-pause" aria-label="로고 슬라이드 일시정지" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg></button></section>`;
const home = `<div class="hero-shell"><div class="wrap"><section class="hero"><div class="hero-copy">${eyebrow('MARCH 15—21, 2027 / SF BAY AREA')}<h1><span class="title-event">82 Stratup</span><span class="title-event">Week 2027</span><span class="title-location">in San Francisco.</span></h1><p class="hero-sub">세상을 바꾸는 시작, 그 연결의 한가운데.<br>창업가와 빌더들의 다음 챕터가 샌프란시스코에서 열립니다.</p><div class="hero-actions">${button('Get your tickets')}<a class="text-link" href="schedule.html">Explore the summit <span class="arrow" aria-hidden="true">↗</span></a></div><div class="hero-note">SIX EVENTS. NEW CONNECTIONS. ENDLESS POSSIBILITIES.</div></div></section></div></div>${showSponsorSection?companyLogoStrip:''}<div class="paper"><div class="wrap"><div class="event-strip"><div><span class="meta-label">01 / WHEN</span><strong>March 15—21, 2027</strong><small>6 EVENTS · SUMMIT / MAR 17–18</small></div><div><span class="meta-label">02 / WHERE</span><strong><a class="venue-map-name" href="https://www.google.com/maps/search/?api=1&query=Fort+Mason+Center+for+Arts+%26+Culture+San+Francisco" target="_blank" rel="noopener" aria-label="Fort Mason Center for Arts & Culture — Google Maps에서 보기">Fort Mason Center for Arts & Culture</a></strong><small>San Francisco · Opening Night at Salesforce Tower</small><div class="venue-quick-actions"><a class="text-link map-link" href="https://www.google.com/maps/search/?api=1&query=Fort+Mason+Center+for+Arts+%26+Culture+San+Francisco" target="_blank" rel="noopener">Google Maps ${arrow}</a><button type="button" class="text-link" id="venue-map-quick-open" aria-haspopup="dialog" aria-controls="venue-map-dialog">View 3D map ${arrow}</button></div></div><div><span class="meta-label">03 / WHO</span><strong>Founders. Builders. You.</strong><small>1,500명의 만남을 준비합니다</small></div></div><section class="section intro-grid"><div>${eyebrow('THE SUMMIT')}<h2>Different journeys.<br>Shared ambition.</h2></div><div><p class="body-copy"><span>혼자 품었던 아이디어가 더 큰 가능성이 되는 곳.<br>82 Startup Week는 새로운 도전을 시작하고, 서로의 경험을 나누고, 다음 기회를 함께 만들어가는 자리입니다.</span></p><div class="stats"><div class="stat"><strong>06</strong><span>EVENTS TO CONNECT</span></div><div class="stat"><strong>1,500</strong><span>EXPECTED ATTENDEES</span></div></div></div></section><section class="section program-section"><div class="section-top"><div>${eyebrow('MAKE IT YOUR SUMMIT')}<h2>Six events. More possibilities.</h2></div><a class="text-link" href="schedule.html">View schedule ${arrow}</a></div><div class="program-timeline" aria-label="Event timeline">${summitProgram.events.map(eventCard).join('')}</div></section><section class="section photo-section" aria-labelledby="event-photos-title"><div class="section-top photo-section-heading"><div>${eyebrow('OUR STORY')}<h2 id="event-photos-title">Every connection has a story.</h2></div></div><div class="photo-carousel" role="region" aria-roledescription="carousel" aria-label="지난 행사 사진"><div class="photo-slider" id="event-photo-slider"><div class="photo-track" id="event-photo-track"></div></div><div class="photo-carousel-controls"><span id="photo-slider-count" aria-live="off">01 / 13</span><button type="button" id="photo-slider-prev" aria-label="슬라이드 이전 사진">←</button><button type="button" id="photo-slider-next" aria-label="슬라이드 다음 사진">→</button><button type="button" id="photo-slider-pause" aria-label="사진 자동 재생 일시정지" aria-pressed="false"></button></div></div></section><dialog id="photo-dialog" aria-labelledby="photo-dialog-title"><div class="photo-dialog-layout"><header class="photo-dialog-header"><h2 class="sr-only" id="photo-dialog-title">행사 사진 크게 보기</h2><span id="photo-count" aria-live="polite"></span><button type="button" class="modal-close" id="photo-close" aria-label="사진 닫기" autofocus>${closeIcon}</button></header><div class="photo-view"><img id="photo-full" alt=""><button id="photo-prev" aria-label="이전 사진">←</button><button id="photo-next" aria-label="다음 사진">→</button></div></div></dialog></div><div class="wrap"><section class="section venue-teaser">${venueArt()}<div class="venue-copy">${eyebrow('MEET US BY THE BAY')}<h2>A meeting point.<br>A starting point.</h2><p>샌프란시스코 워터프런트의 Fort Mason.<br>서밋과 저녁 네트워킹이 이어집니다. 오프닝 나이트는 Salesforce Tower에서 만나요.</p><div class="venue-actions"><button type="button" class="text-link" id="venue-map-open" aria-haspopup="dialog" aria-controls="venue-map-dialog">View 3D map ${arrow}</button><a class="text-link" href="venue.html">Explore the venue ${arrow}</a><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=Fort+Mason+Center+for+Arts+%26+Culture+San+Francisco" target="_blank" rel="noopener">Google Maps ${arrow}</a></div></div></section>${venueMapDialog}${cta}</div></div>`;
const pageHead = (label,title,desc)=>`<div class="page-head">${eyebrow(label)}<h1>${title}</h1><p>${desc}</p></div>`;
const schedule = `<div class="wrap">${pageHead('THE PROGRAM','Make room for<br>what’s next.','3월 16–19일, 6개의 이벤트로 이어지는 만남.<br>모든 시간은 샌프란시스코 현지 시간(PDT)입니다.')}<section class="section"><div class="tabs" role="tablist" aria-label="행사 날짜">${[['16','MAR 16 / Opening Night'],['17','MAR 17 / Summit + Expo + Evening'],['18','MAR 18 / Summit + Expo + Closing'],['19','MAR 19 / VIP After Party']].map(([d,n])=>`<button class="tab" role="tab" id="tab-${d}" data-day="${d}" aria-controls="schedule-panel" aria-selected="${d==='16'}">${n}</button>`).join('')}</div><div id="schedule-panel" role="tabpanel" aria-labelledby="tab-16" tabindex="0"></div><div class="notice">세부 서밋 세션과 연사진은 추후 공개됩니다. <a href="${summitProgram.calendarUrl}" target="_blank" rel="noopener noreferrer">Luma 전체 캘린더 보기 ↗</a></div></section>${cta}</div>`;
const speakers = `<div class="wrap">${pageHead('THE PEOPLE','Big ideas.<br>Human voices.','새로운 관점을 여는 이야기, 다음 도전에 영감을 주는 만남.<br>82 Startup Summit 2027의 연사들을 곧 소개합니다.')}<section class="section"><div class="speaker-empty"><div class="speaker-art"><img src="assets/summit-botanical-gradient.webp" alt="" width="1122" height="1402" loading="lazy"></div><div>${eyebrow('LINEUP IN THE MAKING')}<h2>Good things<br>are in the works.</h2><p>연사 라인업을 준비하고 있습니다.<br>확정된 연사와 세션 정보가 이곳에 업데이트될 예정입니다.</p><a class="text-link" href="schedule.html">행사 일정 살펴보기 ${arrow}</a></div></div><div class="notice">연사 명단은 추후 공개됩니다.</div></section>${cta}</div>`;
const venue = `<div class="wrap">${pageHead('THE PLACE','See you<br>in San Francisco.','Fort Mason Center, Salesforce Tower & The Ameswell Hotel.<br>3월 16–19일, SF Bay Area에서 만나요.')}<section class="section venue-details venue-overview" aria-labelledby="venue-overview-title"><div class="venue-overview-photo">${venueArt(true)}</div><div class="venue-visit"><div class="venue-visit-heading">${eyebrow('PLAN YOUR VISIT')}<h2 id="venue-overview-title">Fort Mason Center for Arts & Culture</h2></div><p class="body-copy venue-intro">샌프란시스코 북쪽 워터프런트, Aquatic Park와 Marina Green 사이에 위치한 문화 공간입니다. 행사장 세부 입구와 체크인 위치는 추후 안내합니다.</p><div class="venue-facts"><div class="detail-row"><h3>ADDRESS</h3><p>2 Marina Boulevard<br>San Francisco, CA 94109</p></div><div class="detail-row"><h3>DATES</h3><p>March 17—18, 2027<br><small>Summit & evening events</small></p></div></div><div class="venue-links">${button('Open in Google Maps','https://www.google.com/maps/search/?api=1&query=Fort+Mason+Center+for+Arts+%26+Culture+San+Francisco','outline')}<a class="text-link" href="https://fortmason.org/visit/" target="_blank" rel="noopener">Official venue & directions ${arrow}</a></div></div></section><section class="section venue-map" aria-labelledby="venue-map-title"><div class="section-top"><div><h2 id="venue-map-title">3D venue map</h2><p class="map-caption">행사 배치 참고용 · 실제 운영 배치는 변경될 수 있습니다.</p></div><button type="button" class="text-link" id="venue-map-open" aria-haspopup="dialog" aria-controls="venue-map-dialog">전체 화면으로 보기 ${arrow}</button></div><div class="venue-map-frame venue-map-preview"><iframe data-src="venue-map/index.html?v=21&preview=1" title="Fort Mason 3D 지도 미리보기" loading="lazy" tabindex="-1" aria-hidden="true"></iframe><button type="button" class="venue-map-open" id="venue-map-preview-open" aria-haspopup="dialog" aria-controls="venue-map-dialog" aria-label="3D 맵 전체 화면으로 열기"></button></div></section>${venueMapDialog}${cta}</div>`;
const tickets = `<div class="wrap">${pageHead('YOUR WAY IN','Find your<br>next connection.','3월 16–19일, 4일간 이어지는 6개의 이벤트.<br>원하는 행사를 선택하면 Luma에서 티켓을 구매할 수 있습니다.')}<section class="section event-ticket-section"><div class="event-ticket-note"><span>PRICES IN USD · TIMES IN PDT</span><a class="text-link" href="${summitProgram.calendarUrl}" target="_blank" rel="noopener noreferrer">Full calendar ${arrow}</a></div><div class="event-ticket-timeline">${summitProgram.events.map(event=>`<article class="event-ticket" id="ticket-${event.id}"><div class="ticket-timeline-date"><span>MAR</span><strong>${event.days.join('–')}</strong><small>2027</small></div><div class="ticket-timeline-content"><span class="meta-label">${event.label.split(' / ')[1]}</span><h2>${event.title}</h2><p>${event.summary}</p><dl><div><dt>WHEN</dt><dd>${event.date}<br>${event.time}</dd></div><div><dt>WHERE</dt><dd><a class="ticket-location-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue+' '+event.address)}" target="_blank" rel="noopener noreferrer" aria-label="${event.venue} — Google Maps에서 보기">${event.venue} ${arrow}<br><small>${event.address}</small></a></dd></div></dl></div><div class="ticket-timeline-action"><span class="meta-label">TICKETS / USD</span>${event.prices.map(([label,price])=>`<span class="event-price-tier">${label} <strong>${price===0?'Free':'$'+price}</strong></span>`).join('')}${eventTicket(event)}</div></article>`).join('')}</div><p class="event-ticket-footnote">티켓 종류와 최종 결제 금액은 각 Luma 이벤트 페이지에서 확인하세요.</p></section></div>`;
const pages = {index:home,schedule,speakers,venue,tickets};
if(document.getElementById('app').dataset.prerendered!==route) document.getElementById('app').innerHTML = header + `<main id="main" class="${route==='index'?'':'inner-page'} fade-in">${pages[route] || home}</main>` + footer;
// Load the venue preview only when it approaches the viewport.
const previewFrame=document.querySelector('.venue-map-preview iframe[data-src]');
if(previewFrame){const previewObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){previewFrame.src=previewFrame.dataset.src;previewObserver.disconnect();}},{rootMargin:'100px'});previewObserver.observe(previewFrame);}
document.querySelector('.menu-toggle').addEventListener('click', e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');document.querySelector('.nav').classList.toggle('open',open);});
if(document.getElementById('venue-map-dialog')){
 const mapDialog=document.getElementById('venue-map-dialog'),mapOpens=document.querySelectorAll('[aria-controls="venue-map-dialog"]'),mapClose=document.getElementById('venue-map-close'),mapFrame=document.getElementById('venue-map-full');
 let previousOverflow='',mapOpener=mapOpens[0];
 const signalMap=visible=>mapFrame.contentWindow?.postMessage({type:'venue-map-visibility',visible},location.origin);
 mapOpens.forEach(trigger=>trigger.addEventListener('click',()=>{if(mapDialog.open)return;mapOpener=trigger;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';mapDialog.showModal();if(!mapFrame.getAttribute('src'))mapFrame.src='venue-map/index.html?v=21';else signalMap(true);}));
 mapClose.addEventListener('click',()=>mapDialog.close());
 mapFrame.addEventListener('load',()=>signalMap(mapDialog.open));
 mapDialog.addEventListener('close',()=>{signalMap(false);document.body.style.overflow=previousOverflow;mapOpener.focus({preventScroll:true});});
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===mapFrame.contentWindow&&event.data?.type==='venue-map-close'&&mapDialog.open)mapDialog.close();});
}
if(route==='schedule'){
 const panel=document.getElementById('schedule-panel');const dates=['16','17','18','19'];
 function selectDay(day){
  document.querySelectorAll('.tab').forEach(tab=>{tab.setAttribute('aria-selected',String(tab.dataset.day===day));tab.tabIndex=tab.dataset.day===day?0:-1;});panel.setAttribute('aria-labelledby','tab-'+day);
  panel.innerHTML=summitProgram.events.filter(event=>event.days.includes(day)).map(event=>{
   const time=event.id==='summit'?(day==='17'?'09:00 시작':'18:00 종료'):event.time.replace(' PDT','');
   return `<article class="calendar-event"><div class="calendar-event-time">${time}<small>MAR ${day} · PDT</small></div><div><h3>${event.title}</h3><p class="calendar-event-location">${event.date} · ${event.venue}</p><p>${event.summary}</p>${event.id==='summit'?'<small>3/17 09:00 시작 · 3/18 18:00 종료 · 상세 세션 시간은 추후 공개</small>':''}</div><div class="calendar-event-actions"><span>${eventPrice(event)}</span>${eventTicket(event)}</div></article>`;
  }).join('');
 }
 const tabs=[...document.querySelectorAll('.tab')];tabs.forEach(tab=>{tab.addEventListener('click',()=>selectDay(tab.dataset.day));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;selectDay(tabs[next].dataset.day);tabs[next].focus();});});
 const initial=new URLSearchParams(location.search).get('day');selectDay(dates.includes(initial)?initial:'16');
}

// One page-wide drawing owns structural rules, so endpoints cannot drift apart.
const gridRoot = document.getElementById('app');
const gridSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
gridSvg.classList.add('page-line-overlay');
gridSvg.setAttribute('aria-hidden','true');gridSvg.setAttribute('focusable','false');
gridRoot.append(gridSvg);
let gridFrame=0;
function drawPageGrid(){
 const origin=gridRoot.getBoundingClientRect();
 const width=gridRoot.clientWidth;
 const footerBoundary=document.querySelector('footer');
 const height=Math.round(footerBoundary?footerBoundary.getBoundingClientRect().top-origin.top:origin.height);
 const bounds=e=>{const r=e.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width};};
 const snap=n=>Math.round(n)+.5;
 const anchor=document.querySelector('.hero,.page-head');if(!anchor)return;
 const frame=bounds(anchor),left=snap(frame.left),right=snap(frame.right-1);
 const rows=new Set(),segments=[];
 const row=y=>{if(y>0&&y<height)rows.add(Math.round(y));};
 const vertical=(x,top,bottom)=>segments.push(`<path d="M${snap(x)} ${snap(top)}V${snap(bottom)}"/>`);
 document.querySelectorAll('.header,.hero,.event-strip,.section,.cta,.page-head,.marquee,.section-top,.stats').forEach(e=>{const r=bounds(e);row(r.top);row(r.bottom);});
 // The footer is intentionally outside the structural grid.
 const strip=document.querySelector('.event-strip');
 if(strip){const r=bounds(strip),cells=[...strip.children].filter(e=>e.tagName==='DIV');cells.slice(1).forEach(cell=>{const c=bounds(cell);if(innerWidth<=800)row(c.top);else vertical(c.left,r.top,r.bottom);});}
 document.querySelectorAll('.stats').forEach(e=>{const r=bounds(e);[...e.children].slice(1).forEach(cell=>vertical(bounds(cell).left,r.top,r.bottom));});
 document.querySelectorAll('.program-cards').forEach(e=>{const cards=[...e.children],r=bounds(e);row(r.bottom);cards.forEach(card=>{const art=card.querySelector('.program-art'),action=card.querySelector('.card-bottom');if(art)row(bounds(art).bottom);if(action)row(bounds(action).top);});const columns=new Set();cards.forEach(card=>{const c=bounds(card);if(c.top>r.top+1)row(c.top);if(c.left>r.left+1)columns.add(Math.round(c.left));});columns.forEach(x=>vertical(x,r.top,r.bottom));});
 document.querySelectorAll('.photo-slider').forEach(slider=>{const r=bounds(slider);row(r.top);row(r.bottom);});
 if(innerWidth>800)document.querySelectorAll('.intro-grid,.venue-teaser').forEach(e=>{const children=[...e.children].filter(c=>!c.classList.contains('grid-junctions'));if(children.length>=2){const a=bounds(children[0]),b=bounds(e.matches('.intro-grid')?e.querySelector('.body-copy'):children[1]),r=bounds(e);const stats=e.matches('.intro-grid')?e.querySelector('.stats'):null;vertical((a.right+b.left)/2,r.top,stats?bounds(stats).top:r.bottom);}});
 const rules=[`<path d="M${left} 0V${height}M${right} 0V${height}"/>`,...[...rows].sort((a,b)=>a-b).map(y=>`<path d="M0 ${y+.5}H${width}"/>`),...segments].join('');
 const points=[...rows].flatMap(y=>[left,right].map(x=>`<path d="M${x-4} ${y+.5}h8M${x} ${y-3.5}v8"/>`)).join('');
 gridSvg.setAttribute('width',String(width));gridSvg.setAttribute('height',String(height));
 gridSvg.innerHTML=`<g class="page-grid-rules" fill="none" stroke-width="1">${rules}</g><g class="page-grid-points" fill="none" stroke-width="1">${points}</g>`;
}
function scheduleGrid(){if(!gridFrame)gridFrame=requestAnimationFrame(()=>{gridFrame=0;drawPageGrid();});}
new ResizeObserver(scheduleGrid).observe(gridRoot);
window.addEventListener('resize',scheduleGrid);
document.fonts.ready.then(scheduleGrid);
document.querySelectorAll('img').forEach(img=>img.addEventListener('load',scheduleGrid));
scheduleGrid();

// Scroll motion lives inside panels; measured grid boundaries never move.
(() => {
 const preference = matchMedia('(prefers-reduced-motion: reduce)');
 let observer, frame = 0, teardown = () => {};
 function setupMotion() {
  teardown();
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('.section h2,.section .eyebrow,.body-copy,.stat,.program-content h3,.program-content p,.page-head h1,.page-head p,.cta h2,.cta p,.speaker-empty h2,.venue-photo figcaption,.footer-word')];
  targets.forEach(el => {
   const group = el.closest('.program-card,.stat');
   const index = group ? [...group.parentElement.children].indexOf(group) : 0;
   el.style.setProperty('--reveal-delay', `${Math.min(index, 2) * 90}ms`);
   if (el.matches('.hero h1>span')) el.style.setProperty('--reveal-delay', `${[...el.parentElement.children].indexOf(el) * 110}ms`);
   el.classList.add('motion-reveal');
  });
  observer = new IntersectionObserver(entries => {
   entries.forEach(({target,isIntersecting}) => {
    if (!isIntersecting) return;
    target.classList.add('is-revealed');
    observer.unobserve(target);
   });
  }, {threshold: 0.08, rootMargin: '0px 0px -24px 0px'});
  targets.forEach(el => observer.observe(el));
  const images = [...document.querySelectorAll('.program-art img')];
  images.forEach(el => el.classList.add('scroll-art'));
  function paint() {
   frame = 0;
   images.forEach(img => {
    const rect = img.parentElement.getBoundingClientRect();
    if (rect.bottom < -80 || rect.top > innerHeight + 80) return;
    const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / (innerHeight / 2 + rect.height / 2)));
    img.style.setProperty('--art-offset', `${(progress * 10).toFixed(2)}px`);
   });
  }
  function requestPaint() { if (!frame) frame = requestAnimationFrame(paint); }
  function revealFocus(event) {
   const reveal = event.target.closest('.motion-reveal');
   if (reveal) reveal.classList.add('is-revealed');
  }
  window.addEventListener('scroll', requestPaint, {passive: true});
  window.addEventListener('resize', requestPaint);
  document.addEventListener('focusin', revealFocus);
  requestPaint();
  teardown = () => {
   observer.disconnect();
   cancelAnimationFrame(frame); frame = 0;
   window.removeEventListener('scroll', requestPaint);
   window.removeEventListener('resize', requestPaint);
   document.removeEventListener('focusin', revealFocus);
   targets.forEach(el => el.classList.remove('motion-reveal','is-revealed'));
   images.forEach(el => {el.classList.remove('scroll-art');el.style.removeProperty('--art-offset');});
  };
 }
 preference.addEventListener('change', setupMotion);
 setupMotion();
})();
