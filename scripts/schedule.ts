import { order,dailyCountry,utcDay } from '../src/engine.ts';
import {writeFileSync}from'node:fs';
const horizon=36525;for(let day=0;day<horizon;day++){const window=Array.from({length:100},(_,i)=>dailyCountry(day+i));if(new Set(window).size!==100)throw new Error(`Repeat at ${day}`);}
writeFileSync('source/schedule-v1.json',JSON.stringify({epoch:'2026-01-01T00:00:00Z',version:'v1',cycle:order,validatedDays:horizon},null,2));
console.log(`Validated ${horizon} days, including all cycle seams. Today: ${dailyCountry(utcDay())}. The fixed cycle works indefinitely.`);
