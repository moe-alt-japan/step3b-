import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const host=document.getElementById('viewer'),title=document.getElementById('statusTitle'),detail=document.getElementById('detail');
window.addEventListener('error',e=>{title.textContent='JavaScript error';detail.textContent=(e.message||'Unknown error')+(e.filename?`\n${e.filename}:${e.lineno}`:'');});
window.addEventListener('unhandledrejection',e=>{title.textContent='Promise error';detail.textContent=String(e.reason?.stack||e.reason||'Unknown promise error');});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xcfefff);
const camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,1.25,3.2);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.screenSpacePanning=true;controls.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x708090,2.3));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(3,5,4);scene.add(light);
const ground=new THREE.Mesh(new THREE.CircleGeometry(1.15,64),new THREE.MeshStandardMaterial({color:0xf5f5f5,roughness:.85}));ground.rotation.x=-Math.PI/2;scene.add(ground);
let vrm=null,modelHeight=1.8,wearable=null,wearableSource='';

let poseBase = null;
const poseBoneNames = [
  'hips','spine','chest','upperChest','neck','head',
  'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm',
  'leftLowerArm','rightLowerArm','leftHand','rightHand',
  'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg'
];
function poseBone(name){
  return vrm?.humanoid?.getNormalizedBoneNode?.(name) || vrm?.humanoid?.getRawBoneNode?.(name) || null;
}
function captureBasePose(){
  poseBase = {};
  poseBoneNames.forEach(name=>{
    const bone=poseBone(name);
    if(bone) poseBase[name]=bone.quaternion.clone();
  });
}
function resetPose(){
  if(!vrm || !poseBase) return;
  Object.entries(poseBase).forEach(([name,q])=>{
    const bone=poseBone(name);
    if(bone) bone.quaternion.copy(q);
  });
}
function addBoneRotation(name,x=0,y=0,z=0){
  const bone=poseBone(name);
  if(!bone) return;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
  bone.quaternion.multiply(q);
}
function applyRelaxedPose(){
  if(!vrm) return;
  resetPose();
  // Bring the arms down from the VRM T-pose and add a small natural bend.
  addBoneRotation('leftUpperArm', 0, 0, THREE.MathUtils.degToRad(-62));
  addBoneRotation('rightUpperArm', 0, 0, THREE.MathUtils.degToRad(62));
  addBoneRotation('leftLowerArm', 0, THREE.MathUtils.degToRad(-10), THREE.MathUtils.degToRad(-8));
  addBoneRotation('rightLowerArm', 0, THREE.MathUtils.degToRad(10), THREE.MathUtils.degToRad(8));
  addBoneRotation('leftHand', 0, 0, THREE.MathUtils.degToRad(-4));
  addBoneRotation('rightHand', 0, 0, THREE.MathUtils.degToRad(4));
  addBoneRotation('chest', THREE.MathUtils.degToRad(1.5), 0, 0);
  addBoneRotation('head', THREE.MathUtils.degToRad(-1.5), 0, 0);
  title.textContent='✅ Character loaded • Relaxed pose';
}
function applyTPose(){
  if(!vrm) return;
  resetPose();
  title.textContent='✅ Character loaded • T-pose';
}

const vrmLoader=new GLTFLoader();vrmLoader.crossOrigin='anonymous';vrmLoader.register(parser=>new VRMLoaderPlugin(parser));
const glbLoader=new GLTFLoader();glbLoader.crossOrigin='anonymous';
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function fit(model){model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(size.y>0){model.scale.multiplyScalar(1.8/size.y);model.updateMatrixWorld(true);}box=new THREE.Box3().setFromObject(model);size=box.getSize(new THREE.Vector3());const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=box.min.y;modelHeight=size.y;setView('front');}
function setView(v){const d=Math.max(2.7,modelHeight*1.65),y=modelHeight*.58;controls.target.set(0,modelHeight*.52,0);if(v==='front')camera.position.set(0,y,d);if(v==='back')camera.position.set(0,y,-d);if(v==='left')camera.position.set(-d,y,0);if(v==='right')camera.position.set(d,y,0);camera.lookAt(controls.target);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.getElementById('resetCamera').onclick=()=>setView('front');
document.getElementById('relaxedPose').onclick=applyRelaxedPose;document.getElementById('tPose').onclick=applyTPose;
function useVRM(gltf,label){vrm=gltf.userData.vrm;if(!vrm)throw new Error('GLTF loaded, but gltf.userData.vrm is empty.');VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);fit(vrm.scene);captureBasePose();applyRelaxedPose();detail.textContent=`${label} • VRM ${vrm.meta?.metaVersion||'detected'} • relaxed pose enabled`;tryAutoWearable();}
function showError(e,prefix='Character failed to load'){console.error(e);title.textContent='❌ '+prefix;detail.textContent=String(e?.stack||e?.message||e);}
vrmLoader.load('./moe-beginner.vrm?v=4b2',gltf=>{try{useVRM(gltf,'Loaded from GitHub Pages');}catch(e){showError(e);}},p=>{if(p.total)detail.textContent=`Downloading character… ${Math.round(p.loaded/p.total*100)}%`;else detail.textContent=`Downloading character… ${Math.round(p.loaded/1024/1024)} MB`;},e=>showError(e));
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(vrm)vrm.update(dt);controls.update();renderer.render(scene,camera);});

const boneSelect=document.getElementById('attachBone'),state=document.getElementById('wearableState');
function getBone(){if(!vrm)return null;const n=boneSelect.value;return vrm.humanoid?.getNormalizedBoneNode?.(n)||vrm.humanoid?.getRawBoneNode?.(n)||vrm.scene;}
function clearWearable(){if(wearable){wearable.removeFromParent();wearable.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose?.());}});wearable=null;}}
function attachWearable(){if(!wearable||!vrm)return;const bone=getBone();if(!bone)return;bone.attach(wearable);applyFit();state.textContent=`Loaded: ${wearableSource} • attached to ${boneSelect.value}`;state.classList.remove('warn');}
function applyFit(){if(!wearable)return;const s=Number(document.getElementById('scale').value);wearable.scale.setScalar(s);wearable.position.set(Number(document.getElementById('x').value),Number(document.getElementById('y').value),Number(document.getElementById('z').value));wearable.rotation.set(0,THREE.MathUtils.degToRad(Number(document.getElementById('ry').value)),0);['scale','x','y','z','ry'].forEach(id=>document.getElementById(id+'Val').textContent=id==='ry'?document.getElementById(id).value:Number(document.getElementById(id).value).toFixed(2));}
['scale','x','y','z','ry'].forEach(id=>document.getElementById(id).addEventListener('input',applyFit));
document.getElementById('reattach').onclick=attachWearable;document.getElementById('equip').onclick=()=>{if(wearable){wearable.visible=true;state.textContent=`Equipped: ${wearableSource}`;}};document.getElementById('unequip').onclick=()=>{if(wearable){wearable.visible=false;state.textContent=`Unequipped: ${wearableSource}`;}};
document.getElementById('resetFit').onclick=()=>{document.getElementById('scale').value='1';document.getElementById('x').value='0';document.getElementById('y').value='0';document.getElementById('z').value='0';document.getElementById('ry').value='0';applyFit();};
function useWearableGLTF(gltf,label){clearWearable();wearable=gltf.scene;wearableSource=label;wearable.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});attachWearable();}
function loadWearableUrl(url,label,onFail){glbLoader.load(url,gltf=>{try{useWearableGLTF(gltf,label);}catch(e){state.textContent='Wearable error: '+e.message;state.classList.add('warn');}},undefined,e=>{if(onFail)onFail(e);else{state.textContent='Could not load wearable: '+(e?.message||e);state.classList.add('warn');}});}
function tryAutoWearable(){loadWearableUrl('./wearables/english-hoodie.glb?v=4b2','english-hoodie.glb',()=>{state.textContent='No bundled hoodie yet. Choose a .glb wearable from your computer when you have one.';state.classList.add('warn');});}
document.getElementById('wearableFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);loadWearableUrl(url,f.name,()=>{});});
