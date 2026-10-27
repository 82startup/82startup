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
const image='https://82startup.vercel.app/assets/og-startup-week-2027-zen-dots.jpg';
for(const route of ['index','schedule','speakers','venue','tickets']){
 const file=resolve(root,`public/${route}.html`);
 let html=await readFile(file,'utf8');
 const context=vm.createContext({location:{pathname:`/${route}.html`}});
 const markup=vm.runInContext(data+'\n'+template+'\nheader + `<main id="main" class="${route===\'index\'?\'\':\'inner-page\'} fade-in">${pages[route] || home}</main>` + footer',context,{timeout:1000});
 const content=`<!-- summit:start --><div id="app" data-prerendered="${route}">${markup}</div><!-- summit:end -->`;
 html=html.includes('<!-- summit:start -->')?html.replace(/<!-- summit:start -->[\s\S]*?<!-- summit:end -->/,content):html.replace('<div id="app"></div>',content);
 html=html.replace(/<!-- social:start -->[\s\S]*?<!-- social:end -->/,'');
 const title=html.match(/<title>(.*?)<\/title>/)[1];
 const description=html.match(/<meta name="description" content="([^"]*)"/)[1];
 const url=`https://82startup.vercel.app/${route==='index'?'':route+'.html'}`;
 const social=`<!-- social:start --><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="82 Startup Week 2027"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="82 Startup Week 2027 — March 16–19, SF Bay Area"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="82 Startup Week 2027 — March 16–19, SF Bay Area"><!-- social:end -->`;
 html=html.replace('</head>',social+'</head>');
 if(!html.includes('fonts.googleapis.com/css2'))html=html.replace('<link rel="stylesheet" href="style.css',`<link rel="stylesheet" href="${fonts}"><link rel="stylesheet" href="style.css`);
 if(route!=='index')html=html.replace(/<script src="(?:glyph-ember-preview|event-photos|hero-glitch)\.js[^>]*><\/script>/g,'');
 if(!html.includes('src="company-logos.js'))html=html.replace('</head>','<script src="company-logos.js?v=3" defer></script></head>');
 html=html.replace('style.css?v=106','style.css?v=107').replace('app.js?v=89','app.js?v=90').replace('glyph-ember-preview.js?v=13','glyph-ember-preview.js?v=14');
 await writeFile(file,html);
 console.log(`${route}.html: prerendered + social metadata`);
}
