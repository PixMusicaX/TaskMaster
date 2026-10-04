import { ERAS } from "./eras";
import { DEV_TOOLS_ENABLED } from "./dev-xp";
import { DEV_PERSONA_KEY, PERSONA_FONTS_URL, PERSONA_FORCED_THEME, pickPersonaDays } from "./persona";

const ERA_LABELS = Object.fromEntries(ERAS.map(e => [e.id, [e.numeral, e.name]]));

// Runs in <head> before first paint so the page never flashes the wrong theme, rank or era.
// Theme follows the clock on every load; a stored rank or era only applies within the month it was
// set (a new season starts at Novice, and the era is placed again once the pace data loads).
// A rank saved before v6 has no period; it's shown until the profile loads and re-saves it.
// The rank name, era numeral and era name are also published as CSS variables, so their labels
// (.tm-rank-label / .tm-era-label / .tm-era-name) are right before the app hydrates.
// On a Persona day (lib/persona.ts) it also sets data-persona, pins that style's theme and starts
// loading its fonts.
export const themeInitScript = `(function(){try{
var d=document.documentElement,n=new Date(),h=n.getHours();
var pick=${pickPersonaDays.toString()};
var ps=pick(n.getFullYear(),n.getMonth())[n.getDate()]||null;
if(${JSON.stringify(DEV_TOOLS_ENABLED)}){var o=localStorage.getItem(${JSON.stringify(DEV_PERSONA_KEY)});if(o==='off')ps=null;else if(o==='p3'||o==='p4'||o==='p5')ps=o;}
var pt=ps?${JSON.stringify(PERSONA_FORCED_THEME)}[ps]:null;
d.classList.toggle('dark',pt?pt==='dark':(h<6||h>=18));
if(ps){d.setAttribute('data-persona',ps);var f=document.createElement('link');f.rel='stylesheet';f.href=${JSON.stringify(PERSONA_FONTS_URL)};document.head.appendChild(f);}else d.removeAttribute('data-persona');
var p=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');
var r=localStorage.getItem('rank');
var rp=localStorage.getItem('rank_period');
if(!r||(rp&&rp!==p))r='Novice';
d.setAttribute('data-rank',r);
var e=localStorage.getItem('era');
if(!e||localStorage.getItem('era_period')!==p)e='forge';
d.setAttribute('data-era',e);
d.style.setProperty('--tm-rank-label',JSON.stringify(r));
var l=${JSON.stringify(ERA_LABELS)}[e]||['I','Forge'];
d.style.setProperty('--tm-era-label',JSON.stringify(l[0]));
d.style.setProperty('--tm-era-name',JSON.stringify(l[1]));
}catch(e){}})();`;
