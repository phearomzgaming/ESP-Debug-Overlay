
const canvas=document.getElementById("screen");
const ctx=canvas.getContext("2d");

const defaults=[
 {x:45,y:100,name:"PLAYER 1",team:"Friendly"},
 {x:190,y:270,name:"PLAYER 2",team:"Enemy"},
 {x:80,y:450,name:"PLAYER 3",team:"Enemy"},
 {x:79.3619052662569,y:271.0138577831035,name:"TEST10",team:"Enemy"}
];

function loadPlayers(){
 try{
  const saved=localStorage.getItem("esp_debug_v10_players");
  if(!saved) return defaults.map(p=>({...p}));
  const data=JSON.parse(saved);
  if(!Array.isArray(data) || data.length>10) throw new Error("Invalid data");
  return data.map(p=>({
   x:Number(p.x)||0,
   y:Number(p.y)||0,
   name:String(p.name||"PLAYER"),
   team:p.team==="Friendly"?"Friendly":"Enemy"
  }));
 }catch(e){
  return defaults.map(p=>({...p}));
 }
}

function savePlayers(){
 try{
  localStorage.setItem("esp_debug_v10_players",JSON.stringify(players));
  updateStats();
 }catch(e){
  setStatus("SAVE FAILED");
 }
}

let players=loadPlayers();

function loadSettings(){
 try{
  const d=JSON.parse(localStorage.getItem("esp_debug_v12_settings")||"{}");
  return {
   zoom:Math.max(0.5,Math.min(2.5,Number(d.zoom)||1)),
   radarVisible:d.radarVisible!==false,
   showNames:d.showNames!==false,
   showBoxes:d.showBoxes!==false,
   showSkeleton:d.showSkeleton!==false
  };
 }catch(e){
  return {zoom:1,radarVisible:true,showNames:true,showBoxes:true,showSkeleton:true};
 }
}

const initialSettings=loadSettings();
let zoom=initialSettings.zoom;
let radarVisible=initialSettings.radarVisible;

function applySettings(d){
 zoom=Math.max(0.5,Math.min(2.5,Number(d.zoom)||1));
 radarVisible=d.radarVisible!==false;
 document.getElementById("showNames").checked=d.showNames!==false;
 document.getElementById("showBoxes").checked=d.showBoxes!==false;
 document.getElementById("showSkeleton").checked=d.showSkeleton!==false;
 updateZoom();
}

function saveSettings(){
 const d={
  zoom:zoom,
  radarVisible:radarVisible,
  showNames:document.getElementById("showNames").checked,
  showBoxes:document.getElementById("showBoxes").checked,
  showSkeleton:document.getElementById("showSkeleton").checked
 };
 localStorage.setItem("esp_debug_v12_settings",JSON.stringify(d));
}

function updateStats(){
 const friendly=players.filter(p=>p.team==="Friendly").length;
 const enemy=players.length-friendly;
 document.getElementById("playerStats").textContent=
  "Total: "+players.length+" | Friendly: "+friendly+" | Enemy: "+enemy;
}
let selected=-1;
let dragging=false;

function setStatus(message){
 document.getElementById("status").textContent=message;
}

function exportPlayers(){
 const backup={
  version:12,
  players:players,
  settings:{
   zoom:zoom,
   radarVisible:radarVisible,
   showNames:document.getElementById("showNames").checked,
   showBoxes:document.getElementById("showBoxes").checked,
   showSkeleton:document.getElementById("showSkeleton").checked
  }
 };
 const blob=new Blob(
  [JSON.stringify(backup,null,2)],
  {type:"application/json"}
 );
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;
 a.download="ESP-Debug-Backup.json";
 a.click();
 URL.revokeObjectURL(url);
 setStatus("BACKUP EXPORTED");
}

function importPlayers(input){
 const file=input.files && input.files[0];

 if(!file){
  setStatus("NO FILE SELECTED");
  return;
 }

 setStatus("READING BACKUP...");

 const reader=new FileReader();

 reader.onload=function(){
  try{
   const data=JSON.parse(reader.result);
   const list=Array.isArray(data)?data:data.players;

   if(!Array.isArray(list)||list.length>10)
    throw new Error("Invalid player list");

   const clean=list.map(p=>{
    if(!p || typeof p!=="object")
     throw new Error("Invalid player");

    const x=Number(p.x);
    const y=Number(p.y);

    if(!Number.isFinite(x)||!Number.isFinite(y))
     throw new Error("Invalid position");

    if(p.team!=="Friendly" && p.team!=="Enemy")
     throw new Error("Invalid team");

    return {
     x:Math.max(0,Math.min(295,x)),
     y:Math.max(0,Math.min(520,y)),
     name:String(p.name||"PLAYER").slice(0,40),
     team:p.team
    };
   });

   let cleanSettings=null;

   if(data.settings!==undefined){
    if(!data.settings || typeof data.settings!=="object"
       || Array.isArray(data.settings))
     throw new Error("Invalid settings");

    const d=data.settings;
    const z=Number(d.zoom);

    cleanSettings={
     zoom:Number.isFinite(z)?Math.max(0.5,Math.min(2.5,z)):zoom,
     radarVisible:typeof d.radarVisible==="boolean"
       ?d.radarVisible:radarVisible,
     showNames:typeof d.showNames==="boolean"
       ?d.showNames:document.getElementById("showNames").checked,
     showBoxes:typeof d.showBoxes==="boolean"
       ?d.showBoxes:document.getElementById("showBoxes").checked,
     showSkeleton:typeof d.showSkeleton==="boolean"
       ?d.showSkeleton:document.getElementById("showSkeleton").checked
    };
   }

   players=clean;

   if(cleanSettings){
    applySettings(cleanSettings);
    saveSettings();
   }
   savePlayers();
   renderList();
   draw();
   setStatus("BACKUP IMPORTED - "+players.length+" PLAYERS");

  }catch(e){
   setStatus("IMPORT ERROR: "+e.message);
  }

  input.value="";
 };

 reader.onerror=function(){
  setStatus("FILE READ FAILED");
  input.value="";
 };

 reader.readAsText(file);
}

function addPlayer(){
 if(players.length>=10){
  setStatus("MAXIMUM 10 DEMO PLAYERS");
  return;
 }
 const name=document.getElementById("newName").value.trim()
  ||"PLAYER "+(players.length+1);
 const team=document.getElementById("newTeam").value;

 players.push({
  x:30+(players.length*25)%220,
  y:80+(players.length*90)%450,
  name:name,
  team:team
 });

 savePlayers();
 document.getElementById("newName").value="";
 renderList();
 draw();
 setStatus("PLAYER ADDED");
}

function deletePlayer(index){
 players.splice(index,1);
 savePlayers();
 renderList();
 draw();
 setStatus("PLAYER DELETED");
}

function renamePlayer(index,value){
 players[index].name=value;
 savePlayers();
 draw();
}

function changeTeam(index,value){
 players[index].team=value;
 savePlayers();
 draw();
 renderList();
}

function renderList(){
 const root=document.getElementById("playerList");
 root.innerHTML="";

 players.forEach((p,i)=>{
  const item=document.createElement("div");
  item.className="player";

  const name=document.createElement("input");
  name.value=p.name;
  name.placeholder="Player name";
  name.addEventListener("change",()=>{
   renamePlayer(i,name.value);
  });

  const team=document.createElement("select");
  ["Friendly","Enemy"].forEach(t=>{
   const option=document.createElement("option");
   option.value=t;
   option.textContent=t;
   team.appendChild(option);
  });
  team.value=p.team;
  team.addEventListener("change",()=>{
   changeTeam(i,team.value);
  });

  const del=document.createElement("button");
  del.textContent="DELETE";
  del.addEventListener("click",()=>deletePlayer(i));

  item.appendChild(document.createTextNode("Player "+(i+1)));
  item.appendChild(document.createElement("br"));
  item.appendChild(name);
  item.appendChild(team);
  item.appendChild(del);
  root.appendChild(item);
 });
}

function zoomIn(){
 zoom=Math.min(2.5,zoom+0.1);
 updateZoom();saveSettings();draw();
}
function zoomOut(){
 zoom=Math.max(0.5,zoom-0.1);
 updateZoom();saveSettings();draw();
}
function updateZoom(){
 document.getElementById("zoomText").textContent=zoom.toFixed(1)+"x";
}
function toggleRadar(){
 radarVisible=!radarVisible;
 saveSettings();
 setStatus(radarVisible?"RADAR ENABLED":"RADAR DISABLED");
 draw();
}
function resetAll(){
 players=defaults.map(p=>({...p}));
 savePlayers();
 zoom=1;
 radarVisible=true;
 saveSettings();
 updateZoom();
 renderList();
 draw();
 setStatus("RESET COMPLETE");
}

function clearBackup(){
 if(!confirm("Clear saved Player and Settings data?")) return;
 localStorage.removeItem("esp_debug_v10_players");
 localStorage.removeItem("esp_debug_v12_settings");
 players=defaults.map(p=>({...p}));
 zoom=1;
 radarVisible=true;
 document.getElementById("showNames").checked=true;
 document.getElementById("showBoxes").checked=true;
 document.getElementById("showSkeleton").checked=true;
 renderList();
 updateStats();
 updateZoom();
 draw();
 setStatus("BACKUP CLEARED");
}

function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight;
 const ratio=window.devicePixelRatio||1;
 canvas.width=w*ratio;
 canvas.height=h*ratio;
 ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,w,h);

 const sx=w/360,sy=h/650;

 players.forEach(p=>{
  const x=p.x*sx,y=p.y*sy;
  const bw=65*sx*zoom,bh=120*sy*zoom;
  const color=p.team==="Friendly"?"#00ccff":"#ff5555";

  if(document.getElementById("showBoxes").checked){
   ctx.strokeStyle=color;
   ctx.lineWidth=2;
   ctx.strokeRect(x,y,bw,bh);
  }

  if(document.getElementById("showNames").checked){
   ctx.fillStyle=color;
   ctx.font="13px Arial";
   ctx.fillText(p.name+" ["+p.team+"]",x,y-8);
  }

  if(document.getElementById("showSkeleton").checked){
   const cx=x+bw/2;
   ctx.strokeStyle="#ffffff";
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.arc(cx,y+18*zoom,7*zoom,0,Math.PI*2);
   ctx.stroke();

   ctx.beginPath();
   ctx.moveTo(cx,y+25*zoom);
   ctx.lineTo(cx,y+70*zoom);
   ctx.moveTo(cx,y+40*zoom);
   ctx.lineTo(cx-15*zoom,y+55*zoom);
   ctx.moveTo(cx,y+40*zoom);
   ctx.lineTo(cx+15*zoom,y+55*zoom);
   ctx.moveTo(cx,y+70*zoom);
   ctx.lineTo(cx-12*zoom,y+115*zoom);
   ctx.moveTo(cx,y+70*zoom);
   ctx.lineTo(cx+12*zoom,y+115*zoom);
   ctx.stroke();
  }
 });

 if(radarVisible){
  const r=55,cx=w-r-20,cy=r+20;
  ctx.strokeStyle="#00ff88";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);
  ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);
  ctx.stroke();

  players.forEach(p=>{
   ctx.fillStyle=p.team==="Friendly"?"#00ccff":"#ff5555";
   ctx.beginPath();
   ctx.arc(cx+(p.x-150)/4,cy+(p.y-300)/8,4,0,Math.PI*2);
   ctx.fill();
  });
 }
}

function pointerPosition(e){
 const rect=canvas.getBoundingClientRect();
 return{x:e.clientX-rect.left,y:e.clientY-rect.top};
}

canvas.addEventListener("pointerdown",e=>{
 const pos=pointerPosition(e);
 const sx=canvas.clientWidth/360;
 const sy=canvas.clientHeight/650;
 selected=-1;

 players.forEach((p,i)=>{
  const x=p.x*sx,y=p.y*sy;
  const bw=65*sx*zoom,bh=120*sy*zoom;
  if(pos.x>=x&&pos.x<=x+bw&&pos.y>=y&&pos.y<=y+bh){
   selected=i;
  }
 });

 if(selected!==-1){
  dragging=true;
  canvas.setPointerCapture(e.pointerId);
  setStatus("MOVING "+players[selected].name);
 }
});

canvas.addEventListener("pointermove",e=>{
 if(!dragging||selected<0)return;
 const pos=pointerPosition(e);
 const sx=canvas.clientWidth/360;
 const sy=canvas.clientHeight/650;

 players[selected].x=Math.max(0,Math.min(295,pos.x/sx-32));
 players[selected].y=Math.max(0,Math.min(520,pos.y/sy-60));
 draw();
});

function endDrag(){
 if(dragging){
  savePlayers();
 }
 dragging=false;
 selected=-1;
 setStatus("EDITOR READY");
}
canvas.addEventListener("pointerup",endDrag);
canvas.addEventListener("pointercancel",endDrag);

["showNames","showBoxes","showSkeleton"].forEach(id=>{
 document.getElementById(id).addEventListener("change",()=>{
  saveSettings();
  draw();
 });
});

window.addEventListener("resize",draw);
applySettings(initialSettings);
renderList();
updateStats();
updateZoom();
draw();
setStatus("V12 READY - DATA LOADED");
