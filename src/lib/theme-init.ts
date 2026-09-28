// Runs in <head> before first paint so the page never flashes the wrong theme or rank.
// Theme follows the clock on every load; a stored rank only applies within the month it was earned.
export const themeInitScript = `(function(){try{
var d=document.documentElement,n=new Date(),h=n.getHours();
d.classList.toggle('dark',h<6||h>=18);
var p=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');
var r=localStorage.getItem('rank');
d.setAttribute('data-rank',r&&localStorage.getItem('rank_period')===p?r:'Novice');
}catch(e){}})();`;
