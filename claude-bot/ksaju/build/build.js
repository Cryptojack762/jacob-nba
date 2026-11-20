// Builds ksaju/library.json from the app's verified seed + sheet book data. Usage: node build.js <ksaju dir> <lib dir>
const fs=require('fs'),path=require('path');const [dir,lib]=process.argv.slice(2);
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const seedSrc=html.slice(html.indexOf('var SEED = {'),html.indexOf('var STATES='));
const SEED=new Function(seedSrc+'; return SEED;')();
const books=JSON.parse(fs.readFileSync(path.join(lib,'books.json'))), sums=JSON.parse(fs.readFileSync(path.join(lib,'summaries.json')));
const tipMeta=[["C05","T01"],["C04","T03"],["C05","T10"],["C04","T05"],["C05","T01"],["C04","T05"],["C05","T02"],["C06","T07"],["C05","T08"],["C01","T01"],["C05","T01"],["C04","T05"],["C06","T07"],["C05","T08"],["C07","T03"],["C05","T01"],["C04","T05"],["C02","T03"],["C05","T10"],["C02","T03"],["C08","T02"],["C05","T02"],["C04","T05"],["C06","T07"],["C05","T01"],["C03","T01"],["C04","T05"],["C09","T08"],["C05","T02"],["C08","T08"]];
const out={updated:new Date().toISOString(),version:1,source:'K-Saju Wellness Library - Master Data (Verified = Y rows only)',
 categories:SEED.categories.map(c=>({category_id:c.category_id,name:c.name,tier:c.tier})),
 books:books.map((b,i)=>({id:b[0],title:b[1],author:b[2],category_id:b[3],tier:b[4],source_url:b[5],notes:b[6],summary:sums[i]})),
 tips:SEED.tips.map((t,i)=>({id:t.id,tip_trick:t.tip_trick,category_id:tipMeta[i][0],trend:tipMeta[i][1]})),
 states:SEED.states};
fs.writeFileSync(path.join(dir,'library.json'),JSON.stringify(out));
console.log('categories',out.categories.length,'books',out.books.length,'tips',out.tips.length,'states',new Set(out.states.map(s=>s.state)).size,'rows',out.states.length);
