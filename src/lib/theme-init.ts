import { ERAS } from "./eras";
import { DEV_TOOLS_ENABLED } from "./dev-xp";
import { DEV_PERSONA_KEY, PERSONA_ON_KEY, PERSONA_FONTS_URL, PERSONA_FORCED_THEME, pickPersonaDays } from "./persona";
import { DEV_SPECIAL_KEY, SPECIAL_FONTS_URL, SPECIAL_FORCED_THEME, SPECIAL_IDS, SPECIAL_OFF_KEY, SPECIAL_SWAPS_THEME, pickSpecialDay } from "./special-days";

const ERA_LABELS = Object.fromEntries(ERAS.map(e => [e.id, [e.numeral, e.name]]));

// Runs in <head> before first paint so the page never flashes the wrong theme, rank or era.
// Theme follows the clock on every load, except on the signed-out pages (/ and /login), which
// follow the browser's light/dark setting (see useBrowserTheme). A stored rank or era only applies
// within the month it was set (a new season starts at Novice, and the era is placed again once
// the pace data loads).
// A rank saved before v6 has no period; it's shown until the profile loads and re-saves it.
// The rank name, era numeral and era name are also published as CSS variables, so their labels
// (.tm-rank-label / .tm-era-label / .tm-era-name) are right before the app hydrates.
// On a Persona day (lib/persona.ts), if the player turned them on, it also sets data-persona,
// pins that style's theme and starts loading its fonts. The month's special day
// (lib/special-days.ts) does the same with data-special, and takes the day from a Persona day.
export const themeInitScript = `(function(){try{
var d=document.documentElement,n=new Date(),h=n.getHours();
var pick=${pickPersonaDays.toString()};
var pd=pick(n.getFullYear(),n.getMonth());
var ps=localStorage.getItem(${JSON.stringify(PERSONA_ON_KEY)})==='1'?(pd[n.getDate()]||null):null;
var o=${JSON.stringify(DEV_TOOLS_ENABLED)}?localStorage.getItem(${JSON.stringify(DEV_PERSONA_KEY)}):null;
var po=o==='p3'||o==='p4'||o==='p5';
var spick=${pickSpecialDay.toString()};
var ids=${JSON.stringify(SPECIAL_IDS)};
var ss=localStorage.getItem(${JSON.stringify(SPECIAL_OFF_KEY)})==='1'||po?null:(spick(n.getFullYear(),n.getMonth(),pd)===n.getDate()?ids[n.getMonth()]:null);
var so=${JSON.stringify(DEV_TOOLS_ENABLED)}?localStorage.getItem(${JSON.stringify(DEV_SPECIAL_KEY)}):null;
if(so==='off')ss=null;else if(ids.indexOf(so)>-1)ss=so;
if(ids.indexOf(so)>-1)ps=null;else if(o==='off')ps=null;else if(po)ps=o;else if(ss)ps=null;
var pt=ps?${JSON.stringify(PERSONA_FORCED_THEME)}[ps]:ss?${JSON.stringify(SPECIAL_FORCED_THEME)}[ss]:null;
var pub=location.pathname==='/'||location.pathname==='/login';
var sys=pub&&window.matchMedia?matchMedia('(prefers-color-scheme: dark)').matches:null;
var dk=sys!==null?sys:(h<6||h>=18);
if(ss===${JSON.stringify(SPECIAL_SWAPS_THEME)})dk=!dk;
d.classList.toggle('dark',pt?pt==='dark':dk);
if(ps){d.setAttribute('data-persona',ps);var f=document.createElement('link');f.rel='stylesheet';f.href=${JSON.stringify(PERSONA_FONTS_URL)};document.head.appendChild(f);}else d.removeAttribute('data-persona');
if(ss){d.setAttribute('data-special',ss);var sf=document.createElement('link');sf.rel='stylesheet';sf.href=${JSON.stringify(SPECIAL_FONTS_URL)};document.head.appendChild(sf);}else d.removeAttribute('data-special');
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
