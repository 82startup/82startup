// Generate the public documents from the same templates used by the client.
// This avoids an empty #app and late text paint on first load and for social crawlers.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app=await readFile(resolve(root,'public/app.js'),'utf8');
const data=await readFile(resolve(root,'public/event-data.js'),'utf8');
const boundary=app.indexOf('if(document.getElementById(\'app\').dataset.prerendered');
if(boundary<0)throw new Error('Landing template boundary was not found');
const template=app.slice(0,boundary);
const fonts='https://fonts.googleapis.com/css2?family=Zen+Dots&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap';
const image='https://82startup.com/assets/og-startup-week-2027-zen-dots.jpg';
const origin='https://82startup.com';
// Search titles and descriptions, one per page (each description is unique and says what that page offers).
const seo={
 index:{title:'82 Startup Week 2027 · March 15–21, San Francisco',description:'Korean founders, investors and builders meet in San Francisco, March 15–21, 2027: seven events including the 82 Startup Summit and Expo at Fort Mason Center. 한인 창업가·투자자 네트워킹 위크.'},
 schedule:{title:'Schedule · 82 Startup Week 2027 in San Francisco',description:'Day-by-day schedule of 82 Startup Week 2027: Opening Night at Salesforce Tower, the Summit and Expo at Fort Mason Center, Founders & Funders, Community Evening and the VIP After Party.'},
 speakers:{title:'Speakers · 82 Startup Week 2027',description:'82 Startup Summit speakers — 김정상 (IonQ), Edward Kim (Gusto), Cal Henderson (Slack) and Eric Kim (Good Water Capital). 새로운 관점을 여는 창업가와 빌더들의 이야기.'},
 venue:{title:'Venue · Fort Mason Center | 82 Startup Week 2027',description:'The 82 Startup Summit and Expo take place at Fort Mason Center, 2 Marina Blvd, San Francisco. Venue details, directions and an interactive 3D floor plan.'},
 tickets:{title:'Tickets · 82 Startup Week 2027',description:'Get tickets for 82 Startup Week 2027 on Luma: the Summit, free Expo registration, Opening Night, Founders & Funders, Community Evening and the VIP After Party.'},
};
const program=vm.runInContext(data+'\nsummitProgram',vm.createContext({}),{timeout:1000});
const escapeAttr=v=>v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const organization={'@type':'Organization','@id':`${origin}/#organization`,name:'82 Startup',url:`${origin}/`,logo:`${origin}/assets/82startup-symbol.svg`};
const eventLd=e=>({'@type':'Event','@id':`${origin}/#${e.id}`,name:e.title,description:e.summary,startDate:e.start,endDate:e.end,eventStatus:'https://schema.org/EventScheduled',eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',location:{'@type':'Place',name:e.venue,address:{'@type':'PostalAddress',streetAddress:e.address.split(',')[0],addressLocality:'San Francisco',addressRegion:'CA',postalCode:(e.address.match(/\b\d{5}\b/)||[''])[0],addressCountry:'US'}},image:[`${origin}/assets/og-startup-week-2027-zen-dots.jpg`],organizer:{'@id':`${origin}/#organization`},offers:e.prices.map(([name,price])=>({'@type':'Offer',name,price,priceCurrency:'USD',url:e.ticketUrl,availability:'https://schema.org/InStock'}))});
// Structured data: the organization and site on the homepage, and the seven events wherever they are listed.
const structured=route=>{
 const graph=[organization];
 if(route==='index')graph.push({'@type':'WebSite','@id':`${origin}/#website`,name:'82 Startup Week 2027',url:`${origin}/`,inLanguage:['ko','en'],publisher:{'@id':`${origin}/#organization`}});
 if(['index','schedule','tickets'].includes(route))graph.push(...program.events.map(eventLd));
 return JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
};
for(const route of ['index','schedule','speakers','venue','tickets']){
 const file=resolve(root,`public/${route}.html`);
 let html=await readFile(file,'utf8');
 const context=vm.createContext({location:{pathname:`/${route}.html`}});
 const markup=vm.runInContext(data+'\n'+template+'\nheader + `<main id="main" class="${route===\'index\'?\'\':\'inner-page\'} fade-in">${pages[route] || home}</main>` + footer',context,{timeout:1000});
 const content=`<!-- summit:start --><div id="app" data-prerendered="${route}">${markup}</div><!-- summit:end -->`;
 html=html.includes('<!-- summit:start -->')?html.replace(/<!-- summit:start -->[\s\S]*?<!-- summit:end -->/,content):html.replace('<div id="app"></div>',content);
 html=html.replace(/<!-- social:start -->[\s\S]*?<!-- social:end -->/,'');
 const title=escapeAttr(seo[route].title);
 const description=escapeAttr(seo[route].description);
 html=html.replace(/<title>.*?<\/title>/,`<title>${title}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`);
 const url=`${origin}/${route==='index'?'':route+'.html'}`;
 const social=`<!-- social:start --><link rel="canonical" href="${url}"><meta name="robots" content="index, follow, max-image-preview:large"><meta property="og:locale" content="ko_KR"><meta property="og:locale:alternate" content="en_US"><meta property="og:type" content="website"><meta property="og:site_name" content="82 Startup Week 2027"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="82 Startup Week 2027 — March 15–21, SF Bay Area"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="82 Startup Week 2027 — March 15–21, SF Bay Area"><script type="application/ld+json">${structured(route)}</script><!-- social:end -->`;
 html=html.replace('</head>',social+'</head>');
 if(!html.includes('fonts.googleapis.com/css2'))html=html.replace('<link rel="stylesheet" href="style.css',`<link rel="stylesheet" href="${fonts}"><link rel="stylesheet" href="style.css`);
 if(route!=='index')html=html.replace(/<script src="(?:glyph-ember-preview|event-photos|hero-glitch)\.js[^>]*><\/script>/g,'');
 if(!html.includes('src="company-logos.js'))html=html.replace('</head>','<script src="company-logos.js?v=3" defer></script></head>');
 html=html.replace('style.css?v=106','style.css?v=107').replace('app.js?v=89','app.js?v=90').replace('glyph-ember-preview.js?v=13','glyph-ember-preview.js?v=14');
 await writeFile(file,html);
 console.log(`${route}.html: prerendered + social metadata`);
}
