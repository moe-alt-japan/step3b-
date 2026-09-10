import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// ============================================================
// WORKING VRM LOADER FOUNDATION — intentionally kept unchanged
// from the successful Step 3A build, except for a background hook.
// ============================================================
const host = document.getElementById('viewer');
const title = document.getElementById('statusTitle');
const detail = document.getElementById('detail');

window.addEventListener('error', e => {
  title.textContent='JavaScript error';
  detail.textContent=(e.message||'Unknown error') + (e.filename ? `\n${e.filename}:${e.lineno}` : '');
});
window.addEventListener('unhandledrejection', e => {
  title.textContent='Promise error';
  detail.textContent=String(e.reason?.stack || e.reason || 'Unknown promise error');
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfefff);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 1.25, 3.2);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0); controls.enableDamping = true; controls.screenSpacePanning = true; controls.update();
scene.add(new THREE.HemisphereLight(0xffffff, 0x708090, 2.3));
const light = new THREE.DirectionalLight(0xffffff, 2.4); light.position.set(3,5,4); scene.add(light);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1.15,64),new THREE.MeshStandardMaterial({color:0xf5f5f5,roughness:.85}));
ground.rotation.x=-Math.PI/2; scene.add(ground);
let vrm = null; let modelHeight = 1.8;
const loader = new GLTFLoader(); loader.crossOrigin = 'anonymous'; loader.register(parser => new VRMLoaderPlugin(parser));
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize); resize();
function fit(model){model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model);let size=box.getSize(new THREE.Vector3());if(size.y>0){model.scale.multiplyScalar(1.8/size.y);model.updateMatrixWorld(true);}box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=box.min.y;modelHeight=size.y;setView('front');}
function setView(v){const d=Math.max(2.7,modelHeight*1.65),y=modelHeight*.58;controls.target.set(0,modelHeight*.52,0);if(v==='front')camera.position.set(0,y,d);if(v==='back')camera.position.set(0,y,-d);if(v==='left')camera.position.set(-d,y,0);if(v==='right')camera.position.set(d,y,0);camera.lookAt(controls.target);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.getElementById('resetCamera').onclick=()=>setView('front');
function useGLTF(gltf,label){if(vrm){scene.remove(vrm.scene);VRMUtils.deepDispose(vrm.scene);}vrm=gltf.userData.vrm;if(!vrm)throw new Error('GLTF loaded, but gltf.userData.vrm is empty.');VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);fit(vrm.scene);title.textContent='✅ Character loaded';detail.textContent=`${label} • VRM ${vrm.meta?.metaVersion || 'detected'}`;}
function showError(e){console.error(e);title.textContent='❌ Character failed to load';detail.textContent=String(e?.stack||e?.message||e);}
function loadFromUrl(){title.textContent='Loading character…';detail.textContent='Requesting ./moe-beginner.vrm';loader.load('./moe-beginner.vrm?v=3b1',gltf=>{try{useGLTF(gltf,'Loaded from GitHub Pages');}catch(e){showError(e);}},p=>{if(p.total)detail.textContent=`Downloading character… ${Math.round(p.loaded/p.total*100)}%`;else detail.textContent=`Downloading character… ${Math.round(p.loaded/1024/1024)} MB`;},showError);}
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(vrm)vrm.update(dt);controls.update();renderer.render(scene,camera);});

// ============================================================
// STEP 3B — progression + isolated shop state
// ============================================================
const STORAGE_KEY='moeEnglishStep3B_v1';
const OLD_KEY='moeEnglishStep3A_v1';
const items=[
  {id:'white_hoodie',name:'White English Hoodie',icon:'🧥',price:500,type:'top',desc:'A clean reward hoodie for your avatar.'},
  {id:'black_cargo',name:'Black Cargo Pants',icon:'👖',price:400,type:'bottom',desc:'A sporty pair of dark cargo pants.'},
  {id:'white_sneakers',name:'White Sneakers',icon:'👟',price:350,type:'shoes',desc:'Simple bright sneakers for later outfit swapping.'},
  {id:'headphones',name:'Blue Headphones',icon:'🎧',price:650,type:'accessory',desc:'A premium study accessory.'},
  {id:'school_bg',name:'School Background',icon:'🏫',price:300,type:'background',desc:'Changes the viewer to a warm school-like sky.'},
  {id:'sunset_bg',name:'Sunset Background',icon:'🌇',price:450,type:'background',desc:'Changes the viewer to an evening atmosphere.'}
];
let progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(saved&&typeof saved==='object') progress={...progress,...saved,owned:Array.isArray(saved.owned)?saved.owned:[],equipped:saved.equipped||{}};
  else {
    const old=JSON.parse(localStorage.getItem(OLD_KEY));
    if(old&&typeof old==='object') progress={...progress,level:old.level||1,xp:old.xp||0,totalXp:old.totalXp||0,coins:old.coins||0};
  }
}catch(_e){}
function xpNeeded(level){return 100+(level-1)*50;}
function normalizeProgress(){let need=xpNeeded(progress.level);while(progress.xp>=need){progress.xp-=need;progress.level++;need=xpNeeded(progress.level);}}
function saveProgress(){localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
function applyBackground(){const bg=progress.equipped.background;if(bg==='school_bg')scene.background=new THREE.Color(0xbfe3ff);else if(bg==='sunset_bg')scene.background=new THREE.Color(0xffc9a8);else scene.background=new THREE.Color(0xcfefff);}
function renderProgress(){normalizeProgress();const need=xpNeeded(progress.level);document.getElementById('level').textContent=progress.level;document.getElementById('xp').textContent=progress.xp;document.getElementById('xpNeed').textContent=need;document.getElementById('xpFill').style.width=`${Math.min(100,progress.xp/need*100)}%`;document.getElementById('headerCoins').textContent=progress.coins.toLocaleString();document.getElementById('coinStat').textContent=progress.coins.toLocaleString();document.getElementById('totalXp').textContent=progress.totalXp.toLocaleString();document.getElementById('shopCoins').textContent=progress.coins.toLocaleString();document.getElementById('ownedCount').textContent=progress.owned.length;applyBackground();saveProgress();renderShop();}
document.getElementById('addXp').onclick=()=>{progress.xp+=25;progress.totalXp+=25;renderProgress();};
document.getElementById('addCoins').onclick=()=>{progress.coins+=500;renderProgress();};
document.getElementById('resetProgress').onclick=()=>{progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};renderProgress();};

const shopBackdrop=document.getElementById('shopBackdrop');
document.getElementById('openShop').onclick=()=>{shopBackdrop.classList.add('open');shopBackdrop.setAttribute('aria-hidden','false');renderShop();};
document.getElementById('closeShop').onclick=()=>{shopBackdrop.classList.remove('open');shopBackdrop.setAttribute('aria-hidden','true');};
shopBackdrop.addEventListener('click',e=>{if(e.target===shopBackdrop)document.getElementById('closeShop').click();});
function buyOrEquip(item){
  const owned=progress.owned.includes(item.id);
  if(!owned){if(progress.coins<item.price)return;progress.coins-=item.price;progress.owned.push(item.id);}
  progress.equipped[item.type]=item.id;
  renderProgress();
}
function renderShop(){
  const grid=document.getElementById('shopGrid'); if(!grid)return;
  grid.innerHTML='';
  for(const item of items){
    const owned=progress.owned.includes(item.id); const equipped=progress.equipped[item.type]===item.id;
    const card=document.createElement('article'); card.className='item-card';
    const btnLabel=equipped?'Equipped':owned?'Equip':`Buy • ${item.price} 🪙`;
    card.innerHTML=`<div class="item-icon">${item.icon}</div><h3>${item.name}</h3><div class="item-desc">${item.desc}</div><div class="price">${owned?'✅ Owned':`${item.price} 🪙`}</div><button class="buy-btn ${owned?'owned':''} ${equipped?'equipped':''}">${btnLabel}</button>`;
    const btn=card.querySelector('button'); btn.disabled=!owned&&progress.coins<item.price; btn.onclick=()=>buyOrEquip(item); grid.appendChild(card);
  }
}

renderProgress();
loadFromUrl();
