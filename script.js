import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// ============================================================
// WORKING VRM LOADER FOUNDATION — unchanged from the verified Step 3B/3C loader.
// ============================================================
const host=document.getElementById('viewer'),title=document.getElementById('statusTitle'),detail=document.getElementById('detail');
window.addEventListener('error',e=>{title.textContent='JavaScript error';detail.textContent=(e.message||'Unknown error')+(e.filename?`\n${e.filename}:${e.lineno}`:'');});
window.addEventListener('unhandledrejection',e=>{title.textContent='Promise error';detail.textContent=String(e.reason?.stack||e.reason||'Unknown promise error');});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xcfefff);const camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,1.25,3.2);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.screenSpacePanning=true;controls.update();scene.add(new THREE.HemisphereLight(0xffffff,0x708090,2.3));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(3,5,4);scene.add(light);const ground=new THREE.Mesh(new THREE.CircleGeometry(1.15,64),new THREE.MeshStandardMaterial({color:0xf5f5f5,roughness:.85}));ground.rotation.x=-Math.PI/2;scene.add(ground);let vrm=null,modelHeight=1.8;const loader=new GLTFLoader();loader.crossOrigin='anonymous';loader.register(parser=>new VRMLoaderPlugin(parser));
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function fit(model){model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(size.y>0){model.scale.multiplyScalar(1.8/size.y);model.updateMatrixWorld(true);}box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=box.min.y;modelHeight=size.y;setView('front');}
function setView(v){const d=Math.max(2.7,modelHeight*1.65),y=modelHeight*.58;controls.target.set(0,modelHeight*.52,0);if(v==='front')camera.position.set(0,y,d);if(v==='back')camera.position.set(0,y,-d);if(v==='left')camera.position.set(-d,y,0);if(v==='right')camera.position.set(d,y,0);camera.lookAt(controls.target);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.getElementById('resetCamera').onclick=()=>setView('front');
let materialDefaults=new Map(),headphoneGroup=null;
function rememberMaterialDefaults(){
  materialDefaults.clear();
  if(!vrm)return;
  vrm.scene.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m||materialDefaults.has(m))continue;materialDefaults.set(m,{map:m.map||null,color:m.color?m.color.clone():null});}});
}
function restoreAvatarMaterials(){
  for(const [m,d] of materialDefaults){if('map' in m)m.map=d.map;if(m.color&&d.color)m.color.copy(d.color);m.needsUpdate=true;}
}
function overrideMaterial(match,color){
  if(!vrm)return;
  vrm.scene.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m||!String(m.name||'').includes(match))continue;if('map' in m)m.map=null;if(m.color)m.color.set(color);m.needsUpdate=true;}});
}
function removeHeadphones(){if(headphoneGroup){headphoneGroup.removeFromParent();headphoneGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});headphoneGroup=null;}}
function addHeadphones(){
  removeHeadphones(); if(!vrm||progress?.equipped?.accessory!=='headphones')return;
  const head=vrm.humanoid?.getNormalizedBoneNode?.('head')||vrm.humanoid?.getRawBoneNode?.('head'); if(!head)return;
  const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x2a76d2,roughness:.45,metalness:.08});
  const band=new THREE.Mesh(new THREE.TorusGeometry(.135,.016,10,36,Math.PI),mat);band.position.set(0,.07,.015);g.add(band);
  const cupGeo=new THREE.BoxGeometry(.038,.085,.045);const l=new THREE.Mesh(cupGeo,mat),r=l.clone();l.position.set(-.14,.015,.018);r.position.set(.14,.015,.018);g.add(l,r);
  head.add(g);headphoneGroup=g;
}
function applyVisibleEquipment(){
  if(!vrm)return;restoreAvatarMaterials();
  if(progress?.equipped?.top==='white_hoodie'){overrideMaterial('Tops',0xf7f7f7);}
  if(progress?.equipped?.bottom==='black_cargo'){overrideMaterial('Onepiece',0x15171c);}
  if(progress?.equipped?.shoes==='white_sneakers'){overrideMaterial('Shoes',0xf4f4f4);}
  if(progress?.equipped?.accessory==='headphones')addHeadphones();else removeHeadphones();
}
function useGLTF(gltf,label){if(vrm){removeHeadphones();scene.remove(vrm.scene);VRMUtils.deepDispose(vrm.scene);}vrm=gltf.userData.vrm;if(!vrm)throw new Error('GLTF loaded, but gltf.userData.vrm is empty.');VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);fit(vrm.scene);rememberMaterialDefaults();applyVisibleEquipment();title.textContent='✅ Character loaded';detail.textContent=`${label} • VRM ${vrm.meta?.metaVersion||'detected'} • visible equipment ready`; }
function showError(e){console.error(e);title.textContent='❌ Character failed to load';detail.textContent=String(e?.stack||e?.message||e);}
function loadFromUrl(){title.textContent='Loading character…';detail.textContent='Requesting ./moe-beginner.vrm';loader.load('./moe-beginner.vrm?v=3c1',gltf=>{try{useGLTF(gltf,'Loaded from GitHub Pages');}catch(e){showError(e);}},p=>{if(p.total)detail.textContent=`Downloading character… ${Math.round(p.loaded/p.total*100)}%`;else detail.textContent=`Downloading character… ${Math.round(p.loaded/1024/1024)} MB`;},showError);}
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(vrm)vrm.update(dt);controls.update();renderer.render(scene,camera);});

// ============================================================
// STEP 3C — progression + shop + inventory/equipment
// ============================================================
const STORAGE_KEY='moeEnglishStep4A_v1',OLD_KEY='moeEnglishStep3C_v1';
const items=[
{id:'white_hoodie',name:'White English Hoodie',icon:'🧥',price:500,type:'top',desc:'Prototype: visibly changes Moe's top to a bright white reward outfit.'},
{id:'black_cargo',name:'Black Cargo Pants',icon:'👖',price:400,type:'bottom',desc:'Prototype: visibly changes Moe's lower outfit to dark black.'},
{id:'white_sneakers',name:'White Sneakers',icon:'👟',price:350,type:'shoes',desc:'Prototype: visibly changes Moe's shoes to white.'},
{id:'headphones',name:'Blue Headphones',icon:'🎧',price:650,type:'accessory',desc:'Prototype: adds a simple blue 3D headphone accessory to Moe.'},
{id:'school_bg',name:'School Background',icon:'🏫',price:300,type:'background',desc:'Changes the viewer to a warm school-like sky.'},
{id:'sunset_bg',name:'Sunset Background',icon:'🌇',price:450,type:'background',desc:'Changes the viewer to an evening atmosphere.'}
];
const slotTypes=[['top','Top'],['bottom','Bottom'],['shoes','Shoes'],['accessory','Accessory'],['background','Background']];
let progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&typeof saved==='object')progress={...progress,...saved,owned:Array.isArray(saved.owned)?saved.owned:[],equipped:saved.equipped||{}};else{const old=JSON.parse(localStorage.getItem(OLD_KEY));if(old&&typeof old==='object')progress={...progress,...old,owned:Array.isArray(old.owned)?old.owned:[],equipped:old.equipped||{}};}}catch(_e){}
function xpNeeded(level){return 100+(level-1)*50;}function normalizeProgress(){let need=xpNeeded(progress.level);while(progress.xp>=need){progress.xp-=need;progress.level++;need=xpNeeded(progress.level);}}function saveProgress(){localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
function getItem(id){return items.find(i=>i.id===id);}function applyBackground(){const bg=progress.equipped.background;if(bg==='school_bg')scene.background=new THREE.Color(0xbfe3ff);else if(bg==='sunset_bg')scene.background=new THREE.Color(0xffc9a8);else scene.background=new THREE.Color(0xcfefff);}
function renderProgress(){normalizeProgress();const need=xpNeeded(progress.level);document.getElementById('level').textContent=progress.level;document.getElementById('xp').textContent=progress.xp;document.getElementById('xpNeed').textContent=need;document.getElementById('xpFill').style.width=`${Math.min(100,progress.xp/need*100)}%`;document.getElementById('headerCoins').textContent=progress.coins.toLocaleString();document.getElementById('coinStat').textContent=progress.coins.toLocaleString();document.getElementById('totalXp').textContent=progress.totalXp.toLocaleString();document.getElementById('shopCoins').textContent=progress.coins.toLocaleString();document.getElementById('ownedCount').textContent=progress.owned.length;applyBackground();applyVisibleEquipment();saveProgress();renderShop();renderInventory();}
document.getElementById('addXp').onclick=()=>{progress.xp+=25;progress.totalXp+=25;renderProgress();};document.getElementById('addCoins').onclick=()=>{progress.coins+=500;renderProgress();};document.getElementById('resetProgress').onclick=()=>{progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};renderProgress();};
function wireModal(backdropId,openId,closeId){const back=document.getElementById(backdropId);document.getElementById(openId).onclick=()=>{back.classList.add('open');back.setAttribute('aria-hidden','false');renderProgress();};document.getElementById(closeId).onclick=()=>{back.classList.remove('open');back.setAttribute('aria-hidden','true');};back.addEventListener('click',e=>{if(e.target===back)document.getElementById(closeId).click();});}
wireModal('shopBackdrop','openShop','closeShop');wireModal('inventoryBackdrop','openInventory','closeInventory');
function buy(item){if(progress.owned.includes(item.id)||progress.coins<item.price)return;progress.coins-=item.price;progress.owned.push(item.id);renderProgress();}
function equip(item){if(!progress.owned.includes(item.id))return;progress.equipped[item.type]=item.id;renderProgress();}
function unequip(type){delete progress.equipped[type];renderProgress();}
function renderShop(){const grid=document.getElementById('shopGrid');if(!grid)return;grid.innerHTML='';for(const item of items){const owned=progress.owned.includes(item.id),equipped=progress.equipped[item.type]===item.id;const card=document.createElement('article');card.className='item-card';card.innerHTML=`<div class="item-icon">${item.icon}</div><h3>${item.name}</h3><div class="item-desc">${item.desc}</div><div class="price">${owned?'✅ Owned':`${item.price} 🪙`}</div><button class="action-btn ${owned?'owned':''} ${equipped?'equipped':''}">${equipped?'Equipped':owned?'Open Inventory':`Buy • ${item.price} 🪙`}</button>`;const btn=card.querySelector('button');btn.disabled=!owned&&progress.coins<item.price;btn.onclick=()=>{if(owned){document.getElementById('closeShop').click();document.getElementById('openInventory').click();}else buy(item);};grid.appendChild(card);}}
function renderInventory(){const slots=document.getElementById('equipmentSlots'),grid=document.getElementById('inventoryGrid');if(!slots||!grid)return;slots.innerHTML='';for(const [type,label] of slotTypes){const id=progress.equipped[type],item=getItem(id);const slot=document.createElement('div');slot.className='slot';slot.innerHTML=`<div class="slot-label">${label}</div>${item?`<div class="slot-icon">${item.icon}</div><div class="slot-main">${item.name}</div><button data-unequip="${type}">Unequip</button>`:`<div class="slot-main empty">Nothing equipped</div>`}`;slots.appendChild(slot);}slots.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>unequip(b.dataset.unequip));grid.innerHTML='';const ownedItems=items.filter(i=>progress.owned.includes(i.id));if(!ownedItems.length){grid.innerHTML='<div class="empty-inventory">Your inventory is empty.<br>Earn some coins and buy your first reward in the Shop! 🪙</div>';return;}for(const item of ownedItems){const equipped=progress.equipped[item.type]===item.id;const card=document.createElement('article');card.className='item-card';card.innerHTML=`<div class="item-icon">${item.icon}</div><h3>${item.name}</h3><div class="item-desc">${item.desc}</div><div class="price">${equipped?'✅ Currently equipped':'🎒 Owned'}</div><button class="action-btn owned ${equipped?'equipped':''}">${equipped?'Unequip':'Equip'}</button>`;card.querySelector('button').onclick=()=>equipped?unequip(item.type):equip(item);grid.appendChild(card);}}
renderProgress();loadFromUrl();
