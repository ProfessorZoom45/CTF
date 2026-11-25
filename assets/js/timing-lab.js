(()=>{
  const form=document.getElementById('timing-form');if(!form)return;
  const event=document.getElementById('timing-event'),next=document.getElementById('timing-next'),output=document.getElementById('timing-output'),status=document.getElementById('timing-status');
  const key='ctf:timing-lab';
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.event&&saved?.next){event.value=String(saved.event).slice(0,140);next.value=String(saved.next).slice(0,140);}}catch{}
  function render(){const after=event.value.trim(),before=next.value.trim();output.textContent=after&&before?`After ${after} resolves, before ${before} begins.`:'Choose the resolving event and the next step to define a complete window.';status.textContent='';}
  form.addEventListener('input',render);
  form.addEventListener('submit',e=>{e.preventDefault();if(!event.value.trim()||!next.value.trim())return;try{localStorage.setItem(key,JSON.stringify({event:event.value.trim(),next:next.value.trim(),timing:output.textContent}));status.textContent='Timing window saved in this browser. Use it when writing your triggered card effect.';}catch{status.textContent='Browser storage is unavailable. Copy the timing window above into your card.';}});
  render();
})();
