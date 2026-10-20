(() => {
  'use strict';
  const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
  const scenes=[
    {name:'Prato Assetato',boss:'La quercia delle scintille',kind:'tree',sky:'#75d5f0',grass:'#6bc585',path:'#f7dfac',leaf:'#3cb785',hp:260},
    {name:'Giardino delle Bolle',boss:'Il carretto fumante',kind:'cart',sky:'#87dcee',grass:'#72c9a1',path:'#ead7af',leaf:'#41ae85',hp:310},
    {name:'Parco delle Fontane',boss:'La torre di fiammelle',kind:'tower',sky:'#92d9f5',grass:'#7ec49c',path:'#dce6d6',leaf:'#3b9d90',hp:360},
    {name:'Spiaggia Splendente',boss:'Il grande falò della spiaggia',kind:'camp',sky:'#70d5eb',grass:'#edd391',path:'#ffeac0',leaf:'#40b8a3',hp:410},
    {name:'Festa dell’Arcobaleno',boss:'Il vulcanetto di brace',kind:'volcano',sky:'#b7d9fb',grass:'#95cca4',path:'#f4d6be',leaf:'#7aaa98',hp:470}
  ];
  let W=0,H=0,CW=0,CX=0,DPR=1,clock=0,last=0,mode='menu',pausedMode='playing';
  let level=0,progress=0,playerX=.5,goalX=.5,number=5,water=0,events=[],particles=[],floating=[],decor=[];
  let boss=null,boost={turbo:0,wide:0},savedFires=0,hitTimer=0,celebrateTime=0,impactTimer=0,rewarded=false;
  const keys=new Set();
  let save;
  try{save=JSON.parse(localStorage.getItem('aquaRushSave'));}catch(e){}
  if(!save||typeof save!=='object')save={};
  save.unlocked=clamp(Math.floor(Number(save.unlocked)||0),0,4);
  save.water=Math.max(0,Math.floor(Number(save.water)||0));
  save.upgrades=Array.from({length:3},(_,i)=>clamp(Math.floor(Number(save.upgrades?.[i])||0),0,3));
  level=save.unlocked;
  const store=()=>{try{localStorage.setItem('aquaRushSave',JSON.stringify(save));}catch(e){}};
  const px=x=>CX+CW*x,active=()=>mode==='playing'||mode==='boss';
  const power=()=>(24+Math.min(number,45)*.6)*(1+save.upgrades[1]*.35)*(boost.turbo>0?2:1);
  const spread=()=>.075+save.upgrades[2]*.022+(boost.wide>0?.095:0);

  function show(id){
    for(const x of ['main','result','villagePage','paused','bossIntro'])$('#'+x).classList.add('hidden');
    const playing=id==='playing';$('#hud').classList.toggle('hidden',!playing);$('#hint').classList.toggle('hidden',!playing);
    $('#bossHud').classList.toggle('hidden',!playing||mode!=='boss');
    if(!playing&&id!=='none')$('#'+id).classList.remove('hidden');
  }
  function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,3,Math.sqrt(4000000/(W*H)));CW=Math.min(W,660);CX=(W-CW)/2;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  addEventListener('resize',resize);resize();
  function rr(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else{r=Math.min(r,w/2,h/2);ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);}ctx.closePath();ctx.fill();}
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);ctx.fill();}
  function text(s,x,y,size=20,color='#fff',stroke='#1b6e8d'){ctx.font=`900 ${size}px system-ui`;ctx.lineJoin='round';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=Math.max(2,size/5);if(stroke){ctx.strokeStyle=stroke;ctx.strokeText(String(s),x,y);}ctx.fillStyle=color;ctx.fillText(String(s),x,y);}
  function line(x1,y1,x2,y2,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function drop(x,y,r,shade=0){ctx.save();ctx.translate(x,y);let g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#d8ffff');g.addColorStop(.4,shade?'#55d6eb':'#58c8ff');g.addColorStop(1,'#167bc9');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-r*1.35);ctx.bezierCurveTo(r*.2,-r*.75,r*.85,-r*.35,r*.85,r*.18);ctx.bezierCurveTo(r*.85,r*1.3,-r*.85,r*1.3,-r*.85,r*.18);ctx.bezierCurveTo(-r*.85,-r*.35,-r*.18,-r*.85,0,-r*1.35);ctx.fill();ellipse(-r*.24,-r*.2,r*.13,r*.23,'#fff');ellipse(r*.22,-r*.2,r*.13,r*.23,'#fff');ellipse(-r*.2,-r*.16,r*.065,r*.13,'#154a71');ellipse(r*.25,-r*.16,r*.065,r*.13,'#154a71');ctx.strokeStyle='#175a8a';ctx.lineWidth=Math.max(1,r*.07);ctx.beginPath();ctx.arc(0,r*.18,r*.27,.13,Math.PI-.13);ctx.stroke();ellipse(-r*.43,r*.12,r*.12,r*.08,'#ffacd1b2');ellipse(r*.43,r*.12,r*.12,r*.08,'#ffacd1b2');ctx.restore()}

  function renderMenu(){
    $('#progress').textContent=Array.from({length:5},(_,i)=>i<=save.unlocked?'●':'○').join(' ');$('#levelSelect').innerHTML='';
    scenes.forEach((s,i)=>{const b=document.createElement('button');b.textContent=i<=save.unlocked?String(i+1):'🔒';b.disabled=i>save.unlocked;b.className=i===level?'selected':'';b.setAttribute('aria-label',`Livello ${i+1}: ${s.name}${b.disabled?', bloccato':''}`);b.setAttribute('aria-pressed',String(i===level));b.onclick=()=>{level=i;renderMenu();};$('#levelSelect').append(b);});
    $('#play').textContent=`▶ GIOCA · ${level+1}`;
  }
  function build(){
    progress=0;playerX=goalX=.5;number=5+save.upgrades[0]*3;water=0;savedFires=0;
    particles=[];floating=[];events=[];decor=[];boss=null;boost={turbo:0,wide:0};hitTimer=0;rewarded=false;keys.clear();
    const sequence=[
      [.08,'gate',.5,5],[.17,'fire',.22,'bush'],[.22,'log',.78],
      [.29,'power',.5,'turbo'],[.36,'fire',.5,'tree'],[.41,'mud',.22],
      [.49,'gate',.78,8],[.55,'fire',.78,'logs'],[.60,'sponge',.5],
      [.67,'power',.22,'wide'],[.75,'fire',.22,'bush'],[.81,'log',.78],
      [.87,'gate',.5,5],[.94,'fire',.5,'tree']
    ];
    events=sequence.map(([t,type,x,val],i)=>{if(level%2&&x!==.5)x=1-x;const hp=38+level*9+(val==='tree'?14:0);return{t,type,x,val,hp,maxHp:hp,hit:false,out:false,seed:i};});
    for(let i=0;i<34;i++)decor.push({t:i/34,side:i%2?-1:1,kind:i%4});updateHud();
  }
  function start(){mode='playing';build();show('playing');}
  function updateHud(){
    $('#hudLevel').textContent=`${mode==='boss'?'🔥':'🌱'} ${level+1} / 5`;$('#hudCount').textContent='💧 '+number;
    $('#hudPower').textContent='💦 ×'+(power()/27).toFixed(1);
    $('#missionText').textContent=mode==='boss'?'Ultima missione: punta sulle fiamme':`${scenes[level].name} · ${savedFires} incendi spenti`;
    $('#routeFill').style.width=(progress*100)+'%';
    const boosts=[];if(boost.turbo>0)boosts.push(`TURBO ${Math.ceil(boost.turbo)}s`);if(boost.wide>0)boosts.push(`VENTAGLIO ${Math.ceil(boost.wide)}s`);
    $('#boostStatus').textContent=boosts.length?'✨ '+boosts.join(' · '):'Spruzzo automatico · Trascina per mirare';
    if(boss){const percent=Math.ceil(100*boss.hp/boss.maxHp);$('#bossFill').style.width=percent+'%';$('#bossMeter').setAttribute('aria-valuenow',String(percent));$('#bossPercent').textContent=`Fuoco rimasto: ${percent}%`;}
  }
  function enterFinal(){
    progress=1;mode='bossIntro';keys.clear();boss={hp:scenes[level].hp,maxHp:scenes[level].hp,x:.5,time:0,warnings:[],nextWarning:4};
    $('#introTitle').textContent=scenes[level].boss;$('#bossName').textContent=scenes[level].boss;updateHud();show('bossIntro');
  }
  function finish(){
    if(rewarded)return;rewarded=true;mode='ending';water+=number*3+50+level*10;save.water+=water;
    save.unlocked=Math.max(save.unlocked,Math.min(4,level+1));store();
    $('#resEmoji').textContent=['🌳🌸✨','🌷🛒✨','⛲🌱✨','🐚🌊✨','🌈🎉✨'][level];
    $('#resTitle').textContent=level===4?'Tutti gli incendi spenti!':'Missione compiuta!';
    $('#resText').textContent=`${scenes[level].boss}: spento! Hai spento anche ${savedFires} incendi lungo il percorso. +${water} acqua per il villaggio!`;
    $('#resStars').textContent=number>=15?'⭐⭐⭐':number>=7?'⭐⭐':'⭐';$('#next').textContent=level===4?'↻ RICOMINCIA':'▶ PROSSIMO LIVELLO';show('result');
  }
  function village(){
    mode='village';keys.clear();$('#currency').textContent='💧 '+save.water+' acqua';
    const names=['🌷 Squadra più grande','💦 Pompa turbo','🌊 Spruzzo a ventaglio'],effects=['+3 gocce alla partenza per livello','+35% di forza per livello','Getto più largo per livello'];
    $('#villagePreview').textContent='💧 '+['🌷','⛲','🏡'].map((e,i)=>save.upgrades[i]?e:'▫️').join(' ');$('#upgrades').innerHTML='';
    names.forEach((n,i)=>{const cost=30*(save.upgrades[i]+1)*(i+1),el=document.createElement('div');el.className='upgrade';el.innerHTML=`<span>${n}<small>${effects[i]}<br>Livello ${save.upgrades[i]}/3</small></span>`;
      const b=document.createElement('button');b.textContent=save.upgrades[i]>=3?'✓ MAX':'💧 '+cost;b.disabled=save.upgrades[i]>=3||save.water<cost;
      b.onclick=()=>{if(save.upgrades[i]>=3||save.water<cost)return;save.water-=cost;save.upgrades[i]++;store();village();};el.append(b);$('#upgrades').append(el);
    });show('villagePage');
  }

  // Shapes are drawn at the screen's native pixel density; no enlarged bitmap sprites.
  function tree(x,y,r,color,flowers=false){
    ellipse(x,y+7,r*.65,r*.18,'#216d6240');rr(x-r*.1,y-r*.65,r*.2,r*.75,r*.07,'#92694b');line(x,y-r*.4,x-r*.28,y-r*.8,r*.1,'#92694b');
    ellipse(x-r*.3,y-r*.85,r*.5,r*.48,color);ellipse(x+r*.27,y-r*.87,r*.48,r*.45,color);ellipse(x,y-r*1.15,r*.57,r*.51,color);ellipse(x-r*.16,y-r*1.32,r*.27,r*.12,'#ffffff25');
    if(flowers)for(let i=0;i<6;i++){const a=i*2.4;flower(x+Math.cos(a)*r*.52,y-r+Math.sin(a)*r*.36,r*.11);}
  }
  function flower(x,y,r){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6,r*.45,r*.45,'#fff1c4');}ellipse(x,y,r*.35,r*.35,'#ffbc46');}
  function ground(){
    const s=scenes[level],sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,s.sky);sky.addColorStop(.27,'#e8faf6');sky.addColorStop(.28,s.grass);sky.addColorStop(1,s.grass);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ellipse(W*.83,H*.12,27,27,'#fff4a3');
    for(let i=0;i<4;i++){const x=(W*(.12+i*.28)+Math.sin(clock*.08+i)*20)%(W+130)-30,y=H*(.12+(i%2)*.06);ellipse(x,y,42,13,'#ffffffbb');ellipse(x-15,y-9,22,17,'#ffffffbb');ellipse(x+15,y-4,27,17,'#ffffffbb');}
    ellipse(W*.14,H*.31,W*.45,H*.10,s.leaf+'66');ellipse(W*.9,H*.31,W*.45,H*.09,s.leaf+'55');
    if(level===3){ctx.fillStyle='#46c3d9';ctx.fillRect(0,H*.28,W,H*.075);line(0,H*.34,W,H*.34,4,'#e0ffff');}
    if(level===4)for(let i=0;i<5;i++){ctx.strokeStyle=['#ffada0','#ffd777','#c2ed8b','#8de3ef','#b9b4f4'][i];ctx.lineWidth=7;ctx.beginPath();ctx.arc(px(.5),H*.36,CW*.43-i*9,Math.PI,Math.PI*2);ctx.stroke();}
    polygon([[px(.34),H*.265],[px(.66),H*.265],[px(1.08),H*1.15],[px(-.08),H*1.15]],'#ffffff96');
    polygon([[px(.36),H*.265],[px(.64),H*.265],[px(1.02),H*1.15],[px(-.02),H*1.15]],s.path);
    for(let i=0;i<14;i++){const z=(i/14+progress*3)%1,y=H*(.28+.84*z*z),edge=CW*(.12+.5*z);for(const side of [-1,1]){const x=px(.5)+side*edge;ellipse(x,y,3+z*4,2+z*2,'#c2b58977');const xx=px(.5)+side*edge*.32;line(xx,y,xx+side*2,y+4+z*8,1+z*2,'#ffffff72');}}
    decor.forEach(d=>{const z=(d.t+progress*.63)%1,y=H*(.28+z*.81),x=px(.5)+d.side*CW*(.19+.51*z),r=9+z*33;if(d.kind<2)tree(x,y,r,s.leaf);else{line(x,y,x,y-12*z,2,'#3aa279');flower(x,y-12*z,3+z*5);}});
    if(mode==='menu'||mode==='village')for(let i=0;i<7;i++)drop(px(.12+i*.126),H*(.73+Math.sin(clock*2+i)*.025),12+i%3*3);
  }
  function project(e){const z=1-(e.t-progress)/.4;if(z<0||z>1.12)return null;return{x:px(.5+(e.x-.5)*(.45+.55*z)),y:H*(.265+.525*z),z,scale:.4+z*.7};}
  function fireInRange(e){const p=project(e);return p&&e.t>progress&&e.t-progress<.31&&Math.abs(px(playerX)-p.x)<CW*spread()+23*p.scale;}
  function logShape(x,y,s){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.12);ellipse(0,9*s,43*s,10*s,'#2d54433c');rr(-41*s,-25*s,82*s,33*s,12*s,'#77503a');rr(-36*s,-21*s,71*s,7*s,3*s,'#ab7950');
    for(const xx of [-30,-6,19])line(xx*s,-10*s,(xx+14)*s,-10*s,3*s,'#4b382d');ellipse(37*s,-8*s,11*s,16*s,'#f0c389');ellipse(37*s,-8*s,6*s,10*s,'#d6a269');ellipse(37*s,-8*s,2*s,4*s,'#987048');ctx.restore();
  }
  function flame(x,y,r,phase){
    const sway=Math.sin(clock*9+phase)*r*.12;ctx.save();ctx.translate(x,y);ctx.fillStyle='#ef6735';ctx.beginPath();ctx.moveTo(-r*.58,0);ctx.bezierCurveTo(-r,-r*.55,-r*.18,-r*.93,-r*.2+sway,-r*1.55);ctx.bezierCurveTo(r*.08,-r*1.38,r*.42,-r*.86,r*.35,-r*.58);ctx.bezierCurveTo(r*.72,-r*.86,r*.82,-r*.45,r*.65,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffac37';ctx.beginPath();ctx.moveTo(-r*.38,0);ctx.bezierCurveTo(-r*.6,-r*.45,r*.02+sway,-r*.84,r*.05,-r*1.18);ctx.bezierCurveTo(r*.33,-r*.73,r*.52,-r*.35,r*.4,0);ctx.closePath();ctx.fill();ellipse(0,-r*.13,r*.24,r*.34,'#fff0a2');ctx.restore();
  }
  function fireObject(x,y,size,kind,heat,seed=0){
    const s=size/75;ellipse(x,y+7*s,57*s,14*s,'#47785642');
    if(kind==='tree')tree(x,y,56*s,heat>0?'#75ad62':scenes[level].leaf,heat<=0);
    else if(kind==='cart'){
      line(x-48*s,y-7*s,x+49*s,y-7*s,8*s,'#765039');for(const a of [-30,28]){ellipse(x+a*s,y+4*s,14*s,14*s,'#4c5260');ellipse(x+a*s,y+4*s,7*s,7*s,'#d7c2a4');}
      rr(x-46*s,y-53*s,88*s,40*s,5*s,'#c9945b');for(let i=0;i<3;i++)line(x-41*s,y-(24+i*11)*s,x+38*s,y-(24+i*11)*s,2*s,'#94643f');line(x+44*s,y-24*s,x+64*s,y-46*s,6*s,'#765039');tree(x-8*s,y-39*s,29*s,heat>0?'#b9a065':'#58c998',heat<=0);
    }else if(kind==='tower'){
      for(let row=0;row<3;row++){const yy=y-row*28*s;rr(x-(45-row*7)*s,yy-25*s,(90-row*14)*s,25*s,6*s,'#b77b4d');for(const a of [-25,0,25])ellipse(x+a*s*(1-row*.13),yy-12*s,9*s,9*s,'#edc286');}if(heat<=0)tree(x,y-66*s,21*s,'#57be8a',true);
    }else if(kind==='volcano'){
      polygon([[x-66*s,y],[x-33*s,y-65*s],[x-19*s,y-73*s],[x+21*s,y-73*s],[x+36*s,y-63*s],[x+67*s,y]],heat>0?'#a78f89':'#7eac9e');polygon([[x-60*s,y],[x-24*s,y-62*s],[x-17*s,y-61*s],[x-32*s,y]],'#ffffff25');ellipse(x,y-65*s,25*s,9*s,heat>0?'#ff943f':'#80ddec');line(x+9*s,y-54*s,x+28*s,y-28*s,7*s,heat>0?'#f6ad44':'#a4f6ea');if(heat<=0)for(const a of [-36,35])flower(x+a*s,y-8*s,9*s);
    }else if(kind==='bush'){
      ellipse(x-21*s,y-13*s,26*s,25*s,heat>0?'#acaa54':'#59c18b');ellipse(x+19*s,y-15*s,30*s,27*s,heat>0?'#b5ae55':'#6dcd91');ellipse(x,y-32*s,30*s,26*s,heat>0?'#c2b469':'#47ad80');if(heat<=0)for(const a of [-25,0,25])flower(x+a*s,y-25*s,7*s);
    }else{logShape(x,y-2*s,.8*s);ctx.save();ctx.translate(x,y);ctx.rotate(.9);logShape(0,-8*s,.72*s);ctx.restore();for(let i=0;i<7;i++)ellipse(x+(i-3)*15*s,y+9*s,9*s,6*s,'#a4aaa1');}
    if(heat>0){const baseY=kind==='tree'?y-10*s:kind==='cart'?y-33*s:kind==='tower'?y-49*s:kind==='volcano'?y-61*s:y-7*s,r=(kind==='tree'?16+12*heat:22+19*heat)*s;
      for(let i=0;i<5;i++)flame(x+(i-2)*16*s,baseY-Math.sin(i*2)*5*s,r*(i===2?1.2:.72),seed+i);
      for(let i=0;i<4;i++){const p=(clock*.5+i*.24)%1;ellipse(x+Math.sin(i+clock)*20*s,baseY-r-p*45*s,(5+p*7)*s,(5+p*5)*s,`rgba(110,112,112,${.18*(1-p)})`);}
    }
  }
  function healthBar(x,y,w,fraction){rr(x-w/2-2,y-2,w+4,12,6,'#fffef6');rr(x-w/2,y,w,8,4,'#e0dac9');rr(x-w/2,y,Math.max(.1,w*fraction),8,4,fraction>0?'#f9773d':'#38c6a3');}
  function drawEvent(e,p){
    const u=clamp(CW/390,.83,1.2)*p.scale,x=p.x,y=p.y;
    if(e.type==='fire'){fireObject(x,y,66*u,e.val,e.out?0:e.hp/e.maxHp,e.seed);if(!e.out){healthBar(x,y-109*u,65*u,e.hp/e.maxHp);if(p.z>.42)text('SPEGNI',x,y-122*u,10*u,'#a44b22','#fff');}else if(p.z>.3)text('SPENTO ✓',x,y-84*u,11*u,'#178e76','#fff');return;}
    if(e.type==='log')logShape(x,y,u);
    else if(e.type==='mud'){ellipse(x,y,43*u,22*u,'#986844');ellipse(x-6*u,y-4*u,34*u,14*u,'#bc925e');for(let i=0;i<3;i++)ellipse(x+(-18+i*18)*u,y+(i%2?4:-6)*u,6*u,3*u,'#72533d');}
    else if(e.type==='sponge'){ellipse(x,y+6*u,41*u,10*u,'#6d805e3d');rr(x-35*u,y-49*u,70*u,51*u,10*u,'#df9e22');rr(x-34*u,y-51*u,68*u,41*u,9*u,'#ffdf58');for(let i=0;i<8;i++)ellipse(x+(-24+(i%4)*16)*u,y-(19+Math.floor(i/4)*18)*u,4*u,3*u,'#d6a42c');}
    else if(e.type==='gate'){ellipse(x,y+8*u,37*u,10*u,'#2f9c9b30');rr(x-35*u,y-60*u,70*u,60*u,15*u,'#087baf');rr(x-31*u,y-57*u,62*u,50*u,12*u,'#5dcff2');text('+'+e.val,x,y-31*u,25*u,'#fff','#0878b2');text('G O C C E',x,y-11*u,7*u,'#fff',null);return;}
    else if(e.type==='power'){const bob=Math.sin(clock*4+e.seed)*4*u;ellipse(x,y+6*u,30*u,8*u,'#3199ab30');ctx.strokeStyle='#fff9';ctx.lineWidth=3*u;ctx.beginPath();ctx.arc(x,y-31*u+bob,29*u,0,Math.PI*2);ctx.stroke();ellipse(x,y-31*u+bob,24*u,24*u,e.val==='turbo'?'#ffcf46':'#8fe9ee');text(e.val==='turbo'?'×2':'≋',x,y-33*u+bob,23*u,e.val==='turbo'?'#8b5b13':'#137faa',null);if(p.z>.35)text(e.val==='turbo'?'TURBO':'VENTAGLIO',x,y-70*u,10*u,'#176b8c','#fff');return;}
    if(p.z>.27){const title=e.type==='log'?'TRONCO':e.type==='mud'?'FANGO':'SPUGNA';rr(x-29*u,y-75*u,58*u,18*u,7*u,'#fff6ed');text(title,x,y-66*u,9*u,'#9f5230',null);if(p.z>.68)text('↔ SCHIVA',x,y+24*u,10*u,'#b05229','#fff');}
  }
  function bossPosition(){return{x:px(boss.x),y:H*.56};}
  function drawBoss(){const p=bossPosition(),size=clamp(CW*.31,108,168);ellipse(p.x,H*.59,CW*.27,H*.04,'#fff8d9aa');fireObject(p.x,p.y,size,scenes[level].kind,boss.hp/boss.maxHp);
    if(mode==='boss'){const aimed=Math.abs(playerX-boss.x)<spread()+.10;if(boss.hp>0)text(aimed?'💦 OTTIMA MIRA!':'↔ SEGUI LE FIAMME',px(.5),H*.64,clamp(CW*.032,11,17),aimed?'#0d86ab':'#9d5d2c','#fff');for(const w of boss.warnings){const x=px(w.x),y=H*.79,flash=.35+.25*Math.sin(clock*15);ellipse(x,y,CW*.105,H*.028,`rgba(255,149,48,${flash})`);text(w.time<.9?'!':'SCINTILLE',x,y-24,12,'#a95528','#fff');}}
  }
  function targetInSpray(){
    if(mode==='boss'&&boss.hp>0&&Math.abs(playerX-boss.x)<spread()+.10){const p=bossPosition();return{x:px(playerX),y:p.y-H*.065};}
    if(mode!=='playing')return null;const list=events.filter(e=>e.type==='fire'&&!e.out&&!e.hit&&fireInRange(e)).sort((a,b)=>a.t-b.t);if(!list.length)return null;const p=project(list[0]);return{x:px(playerX),y:p.y-32*p.scale};
  }
  function waterJets(){
    const x=px(playerX),sy=H*.728,target=targetInSpray(),ty=target?target.y:H*.285,fan=save.upgrades[2]>0||boost.wide>0,branches=fan?3:1,base=clamp(CW*.034,10,20)*(boost.turbo>0?1.22:1);ctx.save();ctx.lineCap='round';
    for(let j=0;j<branches;j++){
      const side=fan?j-1:0,ex=x+side*CW*spread()*.78,ey=ty+Math.abs(side)*H*.045,cx=x+side*CW*spread()*.45+Math.sin(clock*9+j)*3;
      const path=()=>{ctx.beginPath();ctx.moveTo(x,sy);ctx.quadraticCurveTo(cx,(sy+ey)*.5,ex,ey);};
      ctx.strokeStyle=boost.turbo>0?'#ffd675aa':'#0b81bc55';ctx.lineWidth=base*1.75;path();ctx.stroke();ctx.strokeStyle='#27bbf2dd';ctx.lineWidth=base;path();ctx.stroke();ctx.strokeStyle='#ccf9ff';ctx.lineWidth=base*.42;path();ctx.stroke();
      for(let i=0;i<9;i++){const a=(clock*1.6+i/9)%1,b=1-a,bx=b*b*x+2*b*a*cx+a*a*ex,by=sy+(ey-sy)*a;ellipse(bx+Math.sin(a*30+clock*6)*2,by,base*(.16+a*.12),base*(.34+a*.12),'#f0ffffe8');}
      if(target){ellipse(ex,ey,base*(.8+Math.sin(clock*19)*.15),base*.42,'#e1ffffbb');for(let i=0;i<4;i++){const a=clock*4+i*1.7;line(ex,ey,ex+Math.cos(a)*base*1.5,ey+Math.sin(a)*base,2,'#aaf1ff');}}
    }ctx.restore();
  }
  function drawSquad(){
    const x=px(playerX),count=Math.min(12,number),r=clamp(CW*.028,9,16);ellipse(x,H*.841,CW*.11,H*.018,'#236e7045');
    for(let i=count-1;i>=1;i--){const col=(i-1)%4,row=Math.floor((i-1)/4);drop(x+(col-1.5)*r*1.65,H*.795+row*r*1.35+Math.sin(clock*8+i)*2,r*.78,i%3===0?1:0);}
    ctx.globalAlpha=hitTimer>0&&Math.sin(clock*22)>.3?.5:1;drop(x,H*.769,r*1.48);ctx.globalAlpha=1;ellipse(x-r*.45,H*.735,r*.24,r*.13,'#fff');
  }
  function burst(x,y,n,color){for(let i=0;i<n&&particles.length<240;i++)particles.push({x,y,vx:rand(-100,100),vy:rand(-155,35),life:rand(.4,.9),r:rand(2,5),color});}
  function float(s,color='#187f9f',x=px(playerX),y=H*.67){floating.push({s,color,age:0,x,y});}
  function damage(n){if(hitTimer>0)return;const before=number;number=Math.max(3,number-n);hitTimer=.85;float(before>number?'OOPS! −'+(before-number)+' 💧':'SCHIVA!','#bb6a32');burst(px(playerX),H*.78,10,'#f2c08d');}
  function encounter(e){e.hit=true;if(Math.abs(playerX-e.x)>.12)return;
    if(e.type==='gate'){number=Math.min(90,number+e.val);float('+'+e.val+' GOCCE!');burst(px(playerX),H*.74,15,'#93e8ff');}
    else if(e.type==='power'){boost[e.val]=10;float(e.val==='turbo'?'TURBO!':'VENTAGLIO!','#077faf');burst(px(playerX),H*.72,20,'#e6fbff');}
    else if(e.type==='fire'){if(!e.out)damage(3);}else damage(e.type==='sponge'?5:3);
  }
  function extinguish(e){e.out=true;e.hp=0;savedFires++;water+=12;const p=project(e);if(p){burst(p.x,p.y-30,20,'#b2f5f6');float('SPENTO! +12 💧','#16886e',p.x,p.y-62);}}
  function update(dt){
    clock+=dt;if(mode==='paused')return;
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=210*dt;if(p.life<=0)particles.splice(i,1);}
    for(let i=floating.length-1;i>=0;i--){floating[i].age+=dt;if(floating[i].age>1.2)floating.splice(i,1);}
    if(mode==='celebrating'){celebrateTime+=dt;if(celebrateTime>1.8)finish();return;}if(!active())return;
    const dir=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);if(dir)goalX=clamp(goalX+dir*dt*.7,.14,.86);
    playerX+=(goalX-playerX)*Math.min(1,dt*12);hitTimer=Math.max(0,hitTimer-dt);boost.turbo=Math.max(0,boost.turbo-dt);boost.wide=Math.max(0,boost.wide-dt);impactTimer-=dt;
    if(mode==='playing'){
      progress=Math.min(1,progress+dt*(.029+level*.0008));
      for(const e of events){if(e.type==='fire'&&!e.out&&!e.hit&&fireInRange(e)){e.hp=Math.max(0,e.hp-power()*dt);if(e.hp===0)extinguish(e);else if(impactTimer<0){const p=project(e);burst(p.x,p.y-32*p.scale,3,'#b4f5ff');}}if(!e.hit&&progress>=e.t)encounter(e);}
      if(progress>=1)enterFinal();
    }else{
      boss.time+=dt;boss.x=.5+Math.sin(boss.time*.57)*(.16+level*.012);const aimed=Math.abs(playerX-boss.x)<spread()+.10;
      if(aimed){boss.hp=Math.max(0,boss.hp-power()*dt);if(impactTimer<0){const p=bossPosition();burst(px(playerX),p.y-H*.065,5,'#baf7ff');}}
      if(boss.time>=boss.nextWarning){boss.nextWarning+=4.5;boss.warnings.push({x:[.22,.5,.78][Math.floor(rand(0,3))],time:0,hit:false});}
      for(let i=boss.warnings.length-1;i>=0;i--){const w=boss.warnings[i];w.time+=dt;if(w.time>=1.25&&!w.hit){w.hit=true;if(Math.abs(playerX-w.x)<.11)damage(3);}if(w.time>2.1)boss.warnings.splice(i,1);}
      if(boss.hp<=0){mode='celebrating';celebrateTime=0;boss.warnings=[];show('none');for(let i=0;i<5;i++)burst(px(.2+i*.15),H*.45,26,['#9aeaf7','#ffe378','#a6e6ab'][i%3]);float('INCENDIO SPENTO!','#15987a',px(.5),H*.36);}
    }
    if(impactTimer<0)impactTimer=.075;updateHud();
  }
  function draw(){
    ctx.clearRect(0,0,W,H);ground();if(mode==='menu'||mode==='village')return;
    if(!boss)events.map(e=>({e,p:project(e)})).filter(o=>o.p&&(!o.e.hit||o.e.type==='fire')).sort((a,b)=>a.p.z-b.p.z).forEach(({e,p})=>drawEvent(e,p));else drawBoss();
    if(mode==='playing'||mode==='boss')waterJets();drawSquad();particles.forEach(p=>ellipse(p.x,p.y,p.r,p.r,p.color));floating.forEach(f=>text(f.s,f.x,f.y-f.age*35,clamp(CW*.046,14,23),f.color,'#fff'));
    if(mode==='celebrating')text('BRAVISSIMO!',px(.5),H*.64,clamp(CW*.07,23,38),'#188d8b','#fff');
  }
  function frame(t){const dt=Math.min((t-last)/1000||.016,.05);last=t;update(dt);draw();requestAnimationFrame(frame);}
  function pointer(e){if(active())goalX=clamp((e.clientX-CX)/CW,.14,.86);}
  canvas.addEventListener('pointerdown',e=>{if(active()){canvas.setPointerCapture(e.pointerId);pointer(e);}});canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')pointer(e);});
  function pause(){if(!active())return;pausedMode=mode;mode='paused';keys.clear();show('paused');}
  function home(){mode='menu';boss=null;keys.clear();renderMenu();show('main');}
  $('#play').onclick=start;$('#next').onclick=()=>{level=(level+1)%5;start();};$('#village').onclick=village;$('#goVillage').onclick=village;$('#back').onclick=home;
  $('#startBoss').onclick=()=>{mode='boss';updateHud();show('playing');};$('#pauseBtn').onclick=pause;$('#resume').onclick=()=>{mode=pausedMode;show('playing');};$('#home').onclick=home;
  addEventListener('keydown',e=>{if(e.key==='Escape')pause();if(['ArrowLeft','ArrowRight','a','d'].includes(e.key)&&active()){e.preventDefault();keys.add(e.key);}});addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>{keys.clear();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});renderMenu();show('main');requestAnimationFrame(frame);
})();
