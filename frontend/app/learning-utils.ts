import type {Catalog} from './types';
export function readTheme():boolean {
  try { return localStorage.getItem('codegrove-theme') === 'dark'; } catch { return false; }
}
export function searchCatalog(catalog:Catalog,query:string) {
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches=(text:string)=>words.every(word=>text.toLowerCase().includes(word));
  const topic=(id:string)=>catalog.topics.find(t=>t.id===id)?.title||id;
  return {
    lessons:catalog.lessons.filter(l=>matches(`tutorials lessons ${l.title} ${l.topic} ${topic(l.topic)} ${l.intro}`)),
    courses:catalog.courses.filter(c=>matches(`courses ${c.title} ${c.topic} ${topic(c.topic)} ${c.subtitle}`)),
    problems:catalog.problems.filter(p=>matches(`practice problems exercises ${p.title} ${p.topic} ${p.description}`)),
  };
}
