import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// ============================================================
// WORKING VRM LOADER FOUNDATION — kept the same as Step 3B.
// ============================================================
const host=document.getElementById('viewer'),title=document.getElementById('statusTitle'),detail=document.getElementById('detail');
window.addEventListener('error',e=>{title.textContent='JavaScript error';detail.textContent=(e.message||'Unknown error')+(e.filename?`\n${e.filename}:${e.lineno}`:'');});
window.addEventListener('unhandledrejection',e=>{title.textContent='Promise error';detail.textContent=String(e.reason?.stack||e.reason||'Unknown promise error');});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xcfefff);const camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,1.25,3.2);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.screenSpacePanning=true;controls.update();scene.add(new THREE.HemisphereLight(0xffffff,0x708090,2.3));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(3,5,4);scene.add(light);const ground=new THREE.Mesh(new THREE.CircleGeometry(1.15,64),new THREE.MeshStandardMaterial({color:0xf5f5f5,roughness:.85}));ground.rotation.x=-Math.PI/2;scene.add(ground);let vrm=null,modelHeight=1.8;const loader=new GLTFLoader();loader.crossOrigin='anonymous';loader.register(parser=>new VRMLoaderPlugin(parser));
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function fit(model){model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(size.y>0){model.scale.multiplyScalar(1.8/size.y);model.updateMatrixWorld(true);}box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=box.min.y;modelHeight=size.y;setView('front');}
function setView(v){const d=Math.max(2.7,modelHeight*1.65),y=modelHeight*.58;controls.target.set(0,modelHeight*.52,0);if(v==='front')camera.position.set(0,y,d);if(v==='back')camera.position.set(0,y,-d);if(v==='left')camera.position.set(-d,y,0);if(v==='right')camera.position.set(d,y,0);camera.lookAt(controls.target);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.getElementById('resetCamera').onclick=()=>setView('front');
function useGLTF(gltf,label){if(vrm){scene.remove(vrm.scene);VRMUtils.deepDispose(vrm.scene);}vrm=gltf.userData.vrm;if(!vrm)throw new Error('GLTF loaded, but gltf.userData.vrm is empty.');VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);fit(vrm.scene);title.textContent='✅ Character loaded';detail.textContent=`${label} • VRM ${vrm.meta?.metaVersion||'detected'}`;}
function showError(e){console.error(e);title.textContent='❌ Character failed to load';detail.textContent=String(e?.stack||e?.message||e);}
function loadFromUrl(){title.textContent='Loading character…';detail.textContent='Requesting ./moe-beginner.vrm';loader.load('./moe-beginner.vrm?v=5b2',gltf=>{try{useGLTF(gltf,'Loaded from GitHub Pages');}catch(e){showError(e);}},p=>{if(p.total)detail.textContent=`Downloading character… ${Math.round(p.loaded/p.total*100)}%`;else detail.textContent=`Downloading character… ${Math.round(p.loaded/1024/1024)} MB`;},showError);}
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(vrm)vrm.update(dt);controls.update();renderer.render(scene,camera);});

// ============================================================
// STEP 3C — progression + shop + inventory/equipment
// ============================================================
const STORAGE_KEY='moeEnglishStep3C_v1',OLD_KEY='moeEnglishStep3B_v1';
const items=[
{id:'white_hoodie',name:'White English Hoodie',icon:'🧥',price:500,type:'top',desc:'A clean reward hoodie for your avatar.'},
{id:'black_cargo',name:'Black Cargo Pants',icon:'👖',price:400,type:'bottom',desc:'A sporty pair of dark cargo pants.'},
{id:'white_sneakers',name:'White Sneakers',icon:'👟',price:350,type:'shoes',desc:'Simple bright sneakers for later outfit swapping.'},
{id:'headphones',name:'Blue Headphones',icon:'🎧',price:650,type:'accessory',desc:'A premium study accessory.'},
{id:'school_bg',name:'School Background',icon:'🏫',price:300,type:'background',desc:'Changes the viewer to a warm school-like sky.'},
{id:'sunset_bg',name:'Sunset Background',icon:'🌇',price:450,type:'background',desc:'Changes the viewer to an evening atmosphere.'}
];
const slotTypes=[['top','Top'],['bottom','Bottom'],['shoes','Shoes'],['accessory','Accessory'],['background','Background']];
let progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&typeof saved==='object')progress={...progress,...saved,owned:Array.isArray(saved.owned)?saved.owned:[],equipped:saved.equipped||{}};else{const old=JSON.parse(localStorage.getItem(OLD_KEY));if(old&&typeof old==='object')progress={...progress,...old,owned:Array.isArray(old.owned)?old.owned:[],equipped:old.equipped||{}};}}catch(_e){}
function xpNeeded(level){return 100+(level-1)*50;}function normalizeProgress(){let need=xpNeeded(progress.level);while(progress.xp>=need){progress.xp-=need;progress.level++;need=xpNeeded(progress.level);}}function saveProgress(){localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}
function getItem(id){return items.find(i=>i.id===id);}function applyBackground(){const bg=progress.equipped.background;if(bg==='school_bg')scene.background=new THREE.Color(0xbfe3ff);else if(bg==='sunset_bg')scene.background=new THREE.Color(0xffc9a8);else scene.background=new THREE.Color(0xcfefff);}
function renderProgress(){normalizeProgress();const need=xpNeeded(progress.level);document.getElementById('level').textContent=progress.level;document.getElementById('xp').textContent=progress.xp;document.getElementById('xpNeed').textContent=need;document.getElementById('xpFill').style.width=`${Math.min(100,progress.xp/need*100)}%`;document.getElementById('headerCoins').textContent=progress.coins.toLocaleString();document.getElementById('coinStat').textContent=progress.coins.toLocaleString();document.getElementById('totalXp').textContent=progress.totalXp.toLocaleString();document.getElementById('shopCoins').textContent=progress.coins.toLocaleString();document.getElementById('ownedCount').textContent=progress.owned.length;applyBackground();saveProgress();renderShop();renderInventory();}
document.getElementById('addXp').onclick=()=>{progress.xp+=25;progress.totalXp+=25;renderProgress();};document.getElementById('addCoins').onclick=()=>{progress.coins+=500;renderProgress();};document.getElementById('resetProgress').onclick=()=>{progress={level:1,xp:0,totalXp:0,coins:0,owned:[],equipped:{}};renderProgress();};
function wireModal(backdropId,openId,closeId){const back=document.getElementById(backdropId);document.getElementById(openId).onclick=()=>{back.classList.add('open');back.setAttribute('aria-hidden','false');renderProgress();};document.getElementById(closeId).onclick=()=>{back.classList.remove('open');back.setAttribute('aria-hidden','true');};back.addEventListener('click',e=>{if(e.target===back)document.getElementById(closeId).click();});}
wireModal('shopBackdrop','openShop','closeShop');wireModal('inventoryBackdrop','openInventory','closeInventory');
function buy(item){if(progress.owned.includes(item.id)||progress.coins<item.price)return;progress.coins-=item.price;progress.owned.push(item.id);renderProgress();}
function equip(item){if(!progress.owned.includes(item.id))return;progress.equipped[item.type]=item.id;renderProgress();}
function unequip(type){delete progress.equipped[type];renderProgress();}
function renderShop(){const grid=document.getElementById('shopGrid');if(!grid)return;grid.innerHTML='';for(const item of items){const owned=progress.owned.includes(item.id),equipped=progress.equipped[item.type]===item.id;const card=document.createElement('article');card.className='item-card';card.innerHTML=`<div class="item-icon">${item.icon}</div><h3>${item.name}</h3><div class="item-desc">${item.desc}</div><div class="price">${owned?'✅ Owned':`${item.price} 🪙`}</div><button class="action-btn ${owned?'owned':''} ${equipped?'equipped':''}">${equipped?'Equipped':owned?'Open Inventory':`Buy • ${item.price} 🪙`}</button>`;const btn=card.querySelector('button');btn.disabled=!owned&&progress.coins<item.price;btn.onclick=()=>{if(owned){document.getElementById('closeShop').click();document.getElementById('openInventory').click();}else buy(item);};grid.appendChild(card);}}
function renderInventory(){const slots=document.getElementById('equipmentSlots'),grid=document.getElementById('inventoryGrid');if(!slots||!grid)return;slots.innerHTML='';for(const [type,label] of slotTypes){const id=progress.equipped[type],item=getItem(id);const slot=document.createElement('div');slot.className='slot';slot.innerHTML=`<div class="slot-label">${label}</div>${item?`<div class="slot-icon">${item.icon}</div><div class="slot-main">${item.name}</div><button data-unequip="${type}">Unequip</button>`:`<div class="slot-main empty">Nothing equipped</div>`}`;slots.appendChild(slot);}slots.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>unequip(b.dataset.unequip));grid.innerHTML='';const ownedItems=items.filter(i=>progress.owned.includes(i.id));if(!ownedItems.length){grid.innerHTML='<div class="empty-inventory">Your inventory is empty.<br>Earn some coins and buy your first reward in the Shop! 🪙</div>';return;}for(const item of ownedItems){const equipped=progress.equipped[item.type]===item.id;const card=document.createElement('article');card.className='item-card';card.innerHTML=`<div class="item-icon">${item.icon}</div><h3>${item.name}</h3><div class="item-desc">${item.desc}</div><div class="price">${equipped?'✅ Currently equipped':'🎒 Owned'}</div><button class="action-btn owned ${equipped?'equipped':''}">${equipped?'Unequip':'Equip'}</button>`;card.querySelector('button').onclick=()=>equipped?unequip(item.type):equip(item);grid.appendChild(card);}}
renderProgress();

// ============================================================
// STEP 5A — first-time character selection
// ============================================================
const CHARACTER_KEY='moeEnglishCharacter_v1';
const characterSelect=document.getElementById('characterSelect');
const boyCard=document.getElementById('boyCard');
const girlCard=document.getElementById('girlCard');
const continueCharacter=document.getElementById('continueCharacter');
const selectMessage=document.getElementById('selectMessage');
const changeCharacter=document.getElementById('changeCharacter');
let selectedCharacter=null;
let characterLoadStarted=false;

function showCharacterSelect(){
  selectedCharacter=null;
  boyCard.classList.remove('selected');
  girlCard.classList.remove('selected');
  continueCharacter.disabled=true;
  selectMessage.textContent='Choose Boy to continue.';
  characterSelect.classList.remove('hidden');
  characterSelect.setAttribute('aria-hidden','false');
}
function hideCharacterSelect(){
  characterSelect.classList.add('hidden');
  characterSelect.setAttribute('aria-hidden','true');
}
function ensureCharacterLoaded(){
  if(characterLoadStarted)return;
  characterLoadStarted=true;
  loadFromUrl();
}
function chooseBoy(){
  selectedCharacter='boy';
  boyCard.classList.add('selected');
  girlCard.classList.remove('selected');
  continueCharacter.disabled=false;
  selectMessage.textContent='Moe selected! Ready to begin.';
}
boyCard.addEventListener('click',chooseBoy);
girlCard.addEventListener('click',()=>{
  girlCard.classList.add('selected');
  boyCard.classList.remove('selected');
  selectedCharacter=null;
  continueCharacter.disabled=true;
  selectMessage.textContent='Girl avatar is coming soon. Please choose Boy for now.';
});
continueCharacter.addEventListener('click',()=>{
  if(selectedCharacter!=='boy')return;
  localStorage.setItem(CHARACTER_KEY,'boy');
  hideCharacterSelect();
  ensureCharacterLoaded();
});
changeCharacter.addEventListener('click',showCharacterSelect);

const savedCharacter=localStorage.getItem(CHARACTER_KEY);
if(savedCharacter==='boy'){
  hideCharacterSelect();
  ensureCharacterLoaded();
}else{
  showCharacterSelect();
}


// STEP 5B — student nickname/profile
const PROFILE_KEY='moeStudentProfileV1';
const profileSetup=document.getElementById('profileSetup');
const nicknameInput=document.getElementById('nicknameInput');
const nicknameNote=document.getElementById('nicknameNote');
const saveNicknameBtn=document.getElementById('saveNickname');
const cancelNicknameBtn=document.getElementById('cancelNickname');
const editProfileBtn=document.getElementById('editProfile');
const studentNameEl=document.getElementById('studentName');
let studentProfile={nickname:''};
try{const x=JSON.parse(localStorage.getItem(PROFILE_KEY));if(x&&typeof x.nickname==='string')studentProfile=x;}catch(_e){}
function cleanNickname(v){return v.trim().replace(/\s+/g,' ').slice(0,16);}
function applyStudentProfile(){studentNameEl.textContent=studentProfile.nickname||'Moe';}
function openProfileSetup(editing=false){
 profileSetup.classList.add('open');profileSetup.setAttribute('aria-hidden','false');
 nicknameInput.value=studentProfile.nickname||''; nicknameInput.focus();
 cancelNicknameBtn.style.display=editing&&studentProfile.nickname?'inline-block':'none';
 saveNicknameBtn.textContent=editing?'Save Nickname':'Start Adventure';
 nicknameNote.textContent='1–16 characters • You can change this later.';
}
function closeProfileSetup(){profileSetup.classList.remove('open');profileSetup.setAttribute('aria-hidden','true');}
function saveNickname(){const n=cleanNickname(nicknameInput.value);if(!n){nicknameNote.textContent='Please enter a nickname first.';nicknameInput.focus();return;}studentProfile.nickname=n;localStorage.setItem(PROFILE_KEY,JSON.stringify(studentProfile));applyStudentProfile();closeProfileSetup();}
saveNicknameBtn?.addEventListener('click',saveNickname);
nicknameInput?.addEventListener('keydown',e=>{if(e.key==='Enter')saveNickname();});
editProfileBtn?.addEventListener('click',()=>openProfileSetup(true));
cancelNicknameBtn?.addEventListener('click',closeProfileSetup);
applyStudentProfile();
// Show nickname setup after a character has been chosen for the first time.
continueCharacter.addEventListener('click',()=>{setTimeout(()=>{if(localStorage.getItem(CHARACTER_KEY)&&!studentProfile.nickname)openProfileSetup(false);},80);});
// Existing Step 5A users get profile setup once on their next visit.
if(localStorage.getItem(CHARACTER_KEY)&&!studentProfile.nickname){setTimeout(()=>openProfileSetup(false),350);}
