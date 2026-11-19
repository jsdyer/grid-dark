import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {lowest,sameHour,asCSV} from '../web/model.mjs';
const c=JSON.parse(readFileSync('web/events.json')).cases;
test('Reported time maps to the hour including half-hours and gaps stay unavailable',()=>{
 const p=c.island.signals['ping-slash24'].points;assert.equal(sameHour(p,c.island.bulletins[1].time)[0],Date.parse('2024-11-20T14:00Z')/1000);assert.equal(sameHour(p,undefined),null);assert.equal(lowest([[1,null],[2,0]])[1],0)
});
test('Fiona case has complete provincial comparisons and independently dated reports',()=>{
 assert.equal(c.fiona.bulletins.length,4);assert.equal(c.island.bulletins.length,6);assert.ok(lowest(c.fiona.signals['ping-slash24'].points)[1]<60);assert.ok(lowest(c.fiona.signals.bgp.points)[1]>80);assert.match(asCSV([['a,b','say "ok"']]),/"say ""ok"""/)
});
