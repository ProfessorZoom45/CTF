import crypto from 'node:crypto';

const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const id=()=>crypto.randomBytes(24).toString('base64url');
export class RoomService {
  constructor({now=()=>Date.now(),ttl=2*60*60*1000,maxRooms=200,createDuel}={}){this.now=now;this.ttl=ttl;this.maxRooms=maxRooms;this.rooms=new Map();this.createDuel=createDuel;}
  sweep(){for(const [code,room] of this.rooms)if(this.now()-room.updated>this.ttl)this.rooms.delete(code);}
  create(){
    this.sweep();if(this.rooms.size>=this.maxRooms)return {status:503,body:{error:'The room server is full. Try again shortly.'}};
    let code;do{code=Array.from(crypto.randomBytes(6),byte=>CODE_ALPHABET[byte%CODE_ALPHABET.length]).join('');}while(this.rooms.has(code));
    const token=id(),room={code,updated:this.now(),seq:0,host:{token,seen:this.now(),events:[]},guest:null};
    if(this.createDuel)room.duel=this.createDuel();
    this.rooms.set(code,room);return {status:201,body:{code,token,role:'host'}};
  }
  seat(room,token){return token&&room.host.token===token?'host':token&&room.guest?.token===token?'guest':null;}
  join(code,token){
    this.sweep();const room=this.rooms.get(code);if(!room)return {status:404,body:{error:'Room not found or expired. Ask the host for a new code.'}};
    const role=this.seat(room,token);
    if(role){
      room[role].seen=this.now();room.updated=this.now();
      const snapshot=room.duel ? room.duel.view(role==='host'?0:1) : room.snapshot||null;
      const registered=room.duel?.registered(role==='host'?0:1);
      return {status:200,body:{code,token,role,resumed:true,cursor:room.seq,snapshot,registered}};
    }
    if(room.guest)return {status:409,body:{error:'This room already has two players.'}};
    const guestToken=id();room.guest={token:guestToken,seen:this.now(),events:[]};room.updated=this.now();
    return {status:200,body:{code,token:guestToken,role:'guest'}};
  }
  events(code,token,after=0){
    this.sweep();const room=this.rooms.get(code);if(!room)return {status:404,body:{error:'Room expired. Create a new room.'}};
    const role=this.seat(room,token);if(!role)return {status:403,body:{error:'Invalid room session.'}};
    room.updated=this.now();room[role].seen=this.now();
    const other=room[role==='host'?'guest':'host'];
    const connected=!!other&&this.now()-other.seen<25000;
    if(room.duel){
      const view=room.duel.revision>after ? room.duel.view(role==='host'?0:1) : null;
      return {status:200,body:{role,connected,view,cursor:room.duel.revision}};
    }
    room[role].events=room[role].events.filter(event=>event.seq>after);
    return {status:200,body:{role,connected,events:room[role].events.filter(event=>event.seq>after),cursor:room.seq}};
  }
  send(code,token,data){
    this.sweep();const room=this.rooms.get(code);if(!room)return {status:404,body:{error:'Room expired.'}};
    const role=this.seat(room,token);if(!role)return {status:403,body:{error:'Invalid room session.'}};
    if(room.duel){
      const seat=role==='host'?0:1;
      let result;
      if(data?.type==='deckChoice')result=room.duel.register(seat,data.deck);
      else if(data?.type==='actionRequest')result=room.duel.act(seat,data.action,data.revision);
      else if(data?.type==='rematchRequest')result=room.duel.rematch(seat,data.deck,data.revision);
      else return {status:400,body:{error:'The referee only accepts deck choices and game commands.'}};
      if(result.status===200){
        room.updated=this.now();room[role].seen=this.now();
        room.seq=room.duel.revision;
      }
      return result;
    }
    const types=role==='host'?['requestDeck','authoritativeState','initGame','actionRejected','rematchRequest','stateHash']:['deckChoice','actionRequest','rematchRequest','requestState'];
    if(!data||!types.includes(data.type))return {status:400,body:{error:'This message is not allowed for your seat.'}};
    if(Buffer.byteLength(JSON.stringify(data))>1024*1024)return {status:413,body:{error:'Game update is too large.'}};
    const target=room[role==='host'?'guest':'host'];if(!target)return {status:409,body:{error:'The other player has not joined.'}};
    if(data.type==='authoritativeState'){room.snapshot=structuredClone(data);target.events=target.events.filter(event=>event.data.type!=='authoritativeState');}
    if(target.events.length>=128)return {status:429,body:{error:'The other player is not receiving updates. Wait for reconnection.'}};
    room.updated=this.now();room[role].seen=this.now();target.events.push({seq:++room.seq,data:structuredClone(data)});
    return {status:200,body:{ok:true}};
  }
}
