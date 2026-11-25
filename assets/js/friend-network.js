// Shared HTTP rooms work across browsers without a direct WebRTC/NAT connection.
(function(){
  class CTFFriendNet {
    constructor(onConnected,onData,onDisconnect,onError){Object.assign(this,{onConnected,onData,onDisconnect,onError,isHost:false,roomCode:'',token:'',cursor:0,connected:false,closed:false,peerNet:null,sendQueue:Promise.resolve(),failures:0});}
    async request(route,options={}){
      const response=await fetch('api/multiplayer'+route,{...options,headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{}),...options.headers},signal:AbortSignal.timeout(10000)});
      let result;try{result=await response.json();}catch{throw Error('The room server did not return a valid response.');}
      if(!response.ok)throw Error(result.error||'Connection failed.');return result;
    }
    async detect(){try{const response=await fetch('api/multiplayer/config',{signal:AbortSignal.timeout(5000)});if(response.ok){this.config=await response.json();return this.config.transport==='relay';}}catch{}return false;}
    usePeer(){this.peerNet=new CTFNet(host=>this.onConnected?.(host),data=>this.onData?.(data),()=>this.onDisconnect?.(),error=>this.onError?.(error));}
    remember(){sessionStorage.setItem('ctf:room:'+this.roomCode,JSON.stringify({token:this.token,role:this.isHost?'host':'guest'}));}
    async createRoom(){
      if(!await this.detect()){this.usePeer();this.isHost=true;return this.peerNet.createRoom().then(code=>{this.roomCode=code;return code;});}
      const room=await this.request('/rooms',{method:'POST',body:'{}'});this.roomCode=room.code;this.token=room.token;this.isHost=true;this.remember();this.poll();return room.code;
    }
    async joinRoom(code){
      this.roomCode=String(code).trim().toUpperCase();
      if(!/^[A-Z0-9]{6}$/.test(this.roomCode))throw Error('Enter the six-character room code.');
      if(!await this.detect()){this.usePeer();this.isHost=false;return this.peerNet.joinRoom(this.roomCode);}
      try{this.token=JSON.parse(sessionStorage.getItem('ctf:room:'+this.roomCode)||'null')?.token||'';}catch{}
      const room=await this.request('/rooms/'+this.roomCode+'/join',{method:'POST',body:'{}'});this.token=room.token;this.isHost=room.role==='host';this.cursor=room.cursor||0;this.remember();
      if(room.snapshot)this.onData?.({...room.snapshot,type:'resumeState',role:room.role});
      this.poll();return room;
    }
    async poll(){
      if(this.closed)return;
      try{
        const result=await this.request('/rooms/'+this.roomCode+'/events?after='+this.cursor);
        const changed=result.connected!==this.connected;this.connected=result.connected;this.failures=0;
        if(changed){if(this.connected)this.onConnected?.(this.isHost);else this.onDisconnect?.();}
        for(const event of result.events){this.onData?.(event.data);this.cursor=Math.max(this.cursor,event.seq);}
        this.cursor=Math.max(this.cursor,result.cursor);
      }catch(error){this.failures++;if(this.failures===2){this.connected=false;this.onDisconnect?.();this.onError?.(error.message);}}
      if(!this.closed)this.timer=setTimeout(()=>this.poll(),700);
    }
    send(data){
      if(this.peerNet)return this.peerNet.send(data);
      if(this.closed)return;
      this.sendQueue=this.sendQueue.then(()=>this.request('/rooms/'+this.roomCode+'/messages',{method:'POST',body:JSON.stringify(data)})).catch(error=>{this.onData?.({type:'transportError',message:error.message});this.onError?.(error.message);});
    }
    getShareUrl(){const base=this.config?.shareUrl||location.href;const url=new URL('play.html',base);url.searchParams.set('room',this.roomCode);return url.href;}
    getNetDebugLog(){return this.peerNet?.getNetDebugLog()||`Shared server room ${this.roomCode}; role ${this.isHost?'host':'guest'}; connected ${this.connected}`;}
    disconnect(){this.closed=true;clearTimeout(this.timer);this.peerNet?.disconnect();}
  }
  window.CTFFriendNet=CTFFriendNet;
})();
