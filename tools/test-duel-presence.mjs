import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { RoomService } from '../room-service.mjs';
import { PrivateDuel } from '../match-referee.mjs';
import { IDLE_WINDOW, PRESENCE_TIMEOUT, RECONNECT_WINDOW } from '../duel-presence.mjs';

const catalogue = createContext({window:{}});
runInContext('window=globalThis;', catalogue);
for (const file of ['ctf-config.js','data.js','sets-2026-08-24-patch.js','sets-2026-08-25-patch.js','zf1-tutorial-data.js','deck-utils.js']) {
  runInContext(readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8'),catalogue);
}
const main = Array.from(runInContext(`Array.from(new Map(CTF_CARDS.filter(c=>c.id && c.cardType==='Catalyst' &&
  c.sub!=='Token' && c.level>=1 && c.level<=4 && !CTFDeckUtils.isGreatCard(c) && !/when|activate|face.down|spawn|enter.*field|only|cannot/i.test(c.desc||''))
  .map(c=>[c.name.toLowerCase(),c.id])).values()).slice(0,40)`, catalogue));

const hostedDirectory = process.argv[2];
const hosted = hostedDirectory ? await import(new URL('lib/private-referee/rooms.mjs', hostedDirectory)) : null;
const Sqlite = hosted ? (await import('node:sqlite')).DatabaseSync : null;

// The optional hosted adapter exercises the real SQL and request handler on a
// fresh SQLite database, with D1's bind/first/run surface.
function hostedService(setTime) {
  const url = 'https://professorzoom45.github.io';
  const sqlite = new Sqlite(':memory:');
  sqlite.exec(readFileSync(new URL('drizzle/0001_private_friend_rooms.sql',hostedDirectory),'utf8'));
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...params) {
          return { first:async () => statement.get(...params), run:async () => statement.run(...params) };
        }
      };
    }
  };
  async function request(path,token,body) {
    setTime();
    const response = await hosted.handleFriendRooms(new Request(url+'/api/private-multiplayer/'+path,{
      method:body === undefined ? 'GET' : 'POST',
      headers:{
        'Origin':url,
        ...(token ? {'Authorization':'Bearer '+token} : {}),
        ...(body === undefined ? {} : {'Content-Type':'application/json'})
      },
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    }),db);
    return { status:response.status,body:await response.json() };
  }
  return {
    create:() => request('rooms',null,{}),
    join:(code,token) => request('rooms/'+code+'/join',token,{}),
    events:(code,token,after=0) => request('rooms/'+code+'/events?after='+after,token),
    send:(code,token,body) => request('rooms/'+code+'/messages',token,body)
  };
}

const realNow = Date.now;
const mode = hosted ? 'hosted SQL' : 'local';

async function duel() {
  let time = 1_000_000;
  const now = () => time;
  const rooms = hosted ? hostedService(() => {Date.now=now;}) : new RoomService({now,createDuel:() => new PrivateDuel()});
  const host = (await rooms.create()).body;
  const guest = (await rooms.join(host.code)).body;
  const seats = [host,guest];
  const events = (seat,after) => rooms.events(host.code,seats[seat].token,after);
  const join = seat => rooms.join(host.code,seats[seat].token);
  const command = (seat,data) => rooms.send(host.code,seats[seat].token,data);
  const action = (seat,type,revision) => command(seat,{type:'actionRequest',action:{type},revision});
  for (const seat of [0,1]) {
    assert.equal((await command(seat,{type:'deckChoice',deck:{main}})).status,200);
  }
  return { now, elapse:delta => {time+=delta;}, events, join, command, action };
}

try {
  {
    const d=await duel();
    for (let loss=1; loss<=2; loss++) {
      d.elapse(PRESENCE_TIMEOUT-1);
      const stillPresent=await d.events(0);
      assert(stillPresent.body.connected);
      d.elapse(1);
      const paused=await d.events(0);
      assert.equal(paused.body.connected,false);
      assert.equal(paused.body.presence.disconnects[1],loss);
      assert.equal(paused.body.presence.reconnectUntil[1],d.now()+RECONNECT_WINDOW);
      assert.equal((await d.action(0,'advancePhase',paused.body.cursor)).status,409);
      const reopened=await d.join(1);
      assert.equal(reopened.body.presence.disconnects[1],loss);
      assert.equal(reopened.body.presence.reconnectUntil[1],null);
      assert.equal(reopened.body.snapshot.result,null);
    }
    d.elapse(PRESENCE_TIMEOUT-1);
    const before=await d.events(0);
    d.elapse(1);
    const forfeited=await d.events(0,before.body.cursor);
    assert.deepEqual(forfeited.body.view.result,{winner:0,reason:'Third disconnect forfeit'});
    const revision=forfeited.body.cursor;
    for (const seat of [0,1]) {
      const snapshot=(await d.join(seat)).body.snapshot;
      assert.equal(snapshot.result.winner,0);
      assert.equal((await d.command(seat,{type:'rematchRequest',revision:snapshot.revision})).status,200);
    }
    const rematch=(await d.events(0,revision)).body;
    assert.equal(rematch.view.result,null);
    assert.deepEqual(rematch.presence.disconnects,[0,0]);
    console.log('PASS',mode,'timely reconnects, paused requests, third disconnect, and rematch reset');
  }
  {
    const d=await duel();
    for (let step=0; step<4; step++) {d.elapse(20_000);await d.events(0);}
    d.elapse(4_999);
    assert.equal((await d.events(0)).body.view.result,null);
    d.elapse(1);
    assert.deepEqual((await d.join(1)).body.snapshot.result,{winner:0,reason:'Reconnect timeout forfeit'});
    console.log('PASS',mode,'one-seat 60-second timeout persists across a late rejoin');
  }
  {
    const d=await duel();
    d.elapse(10_000);
    await d.events(0);
    d.elapse(PRESENCE_TIMEOUT+RECONNECT_WINDOW);
    assert.deepEqual((await d.join(1)).body.snapshot.result,{winner:-1,reason:'Both reconnect windows expired'});
    console.log('PASS',mode,'both reconnect windows can expire with no active request');
  }
  {
    const d=await duel();
    const original=(await d.events(0)).body.presence.idleUntil;
    d.elapse(20_000); await d.events(0);
    d.elapse(10_000);
    assert.equal((await d.events(0)).body.presence.idleUntil,null);
    d.elapse(10_000);
    const resumed=(await d.join(1)).body.presence;
    assert.equal(resumed.idleUntil,original + 40_000 - PRESENCE_TIMEOUT);
    console.log('PASS',mode,'idle time pauses during reconnect and resumes with the same time remaining');
  }
  {
    const d=await duel();
    async function heartbeatFor(total) {
      while (total>0) {
        const interval=Math.min(total,10_000);
        d.elapse(interval);
        await d.events(0);
        await d.events(1);
        total-=interval;
      }
    }
    await heartbeatFor(IDLE_WINDOW-20_000);
    const current=(await d.events(0)).body;
    assert.equal((await d.action(0,'advancePhase',current.cursor)).status,200);
    await heartbeatFor(IDLE_WINDOW-1);
    assert.equal((await d.events(1)).body.view.result,null);
    d.elapse(1);
    assert.deepEqual((await d.events(0)).body.view.result,{winner:-1,reason:'Neither player acted for five minutes'});
    console.log('PASS',mode,'legal activity resets the five-minute idle deadline and idle ends in a draw');
  }
} finally {
  Date.now=realNow;
}
