export function lowest(points) {
  return points.reduce((best,p)=> p[1]!==null && (best===null||p[1]<best[1]) ? p : best,null);
}
export function sameHour(points,iso) {
  if(!iso)return null;
  const stamp=Date.parse(iso);
  if(!Number.isFinite(stamp))return null;
  return points.find(p=>p[0]===Math.floor(stamp/3600000)*3600)??null;
}
export function asCSV(rows) {
  return rows.map(r=>r.map(s=>'"'+String(s??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
}
