import {PoseStabilizer} from './pose-stabilizer.mjs?v=5';
import {trackingSettings,surfaceBounds,coverUV} from './surface.mjs?v=5';
const $=s=>document.querySelector(s);
const campaigns=await fetch(new URL('campaigns.json?v=5',import.meta.url)).then(r=>r.json());
const slug=location.pathname.split('/').filter(Boolean).at(-1),c=campaigns[slug];
if(!c){
 $('#home header').hidden=true;
 $('#cards').innerHTML=Object.entries(campaigns).map(([id,c])=>`<a class="card" href="${id}/"><img src="${c.poster}" alt="${c.name} campaign"><h2>${c.name}</h2><p>${c.tagline}</p></a>`).join('');
}else{
 $('#home').hidden=true;$('#viewer').hidden=false;$('.back')?.remove();$('#brand').textContent=c.name;
 $('.brand h2').textContent=c.tagline;document.title=c.name+' — '+c.tagline;
 $('#sound')?.remove();$('#start').textContent='Start experience';
 const video=$('#film');video.removeAttribute('muted');video.defaultMuted=false;video.muted=false;video.volume=1;
 video.hidden=false;video.className='texture-source';video.crossOrigin='anonymous';video.preload='auto';video.src=c.video;video.poster=c.poster;video.load();
 let mind,texture,material,geometry,mesh,tracked=false,wantsPlay=true,starting=false,generation=0,cameraStream=null,resizeObserver=null,poseStabilizer=null,displayGroup=null;
 const status=t=>$('#status').textContent=t;
 const deadline=(promise,ms,message)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));};
 const cameraError=e=>({NotAllowedError:'Camera access is blocked. Allow Camera for this website in Safari or Chrome site settings, then tap Open camera.',NotFoundError:'No camera was found. Use a phone or connect a webcam.',NotReadableError:'The camera is busy or unavailable. Close other camera apps or tabs, then retry.',SecurityError:'Camera access is restricted by this browser. Open the link directly in Safari or Chrome.',OverconstrainedError:'This camera could not use the requested settings. Retry with the default camera.'}[e?.name]||e?.message||'Camera access failed. Open this link directly in Safari or Chrome.');
 status('Opening camera… Allow access, then point at the image.');
 const play=async()=>{video.muted=false;video.volume=1;try{await video.play();video.dataset.audioBlocked='';$('#play').textContent='Pause';}catch(e){if(e.name==='NotAllowedError'){video.dataset.audioBlocked='true';status('Tap Play to start the campaign with audio.');$('#play').textContent='Play';}else status('Video is loading. Keep the page in view, or use Watch video directly.');}};
 const stop=()=>{
  generation++;tracked=false;resizeObserver?.disconnect();resizeObserver=null;poseStabilizer?.reset();poseStabilizer=null;displayGroup=null;video.pause();cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;const instance=mind;mind=null;
  if(instance){instance.renderer.setAnimationLoop(null);instance.controller?.stopProcessVideo();instance.video?.srcObject?.getTracks().forEach(t=>t.stop());instance.video?.remove();instance.renderer.dispose();}
  texture?.dispose();material?.dispose();geometry?.dispose();$('#camera').replaceChildren();document.body.classList.remove('ar');$('#start').hidden=false;$('#controls').hidden=true;starting=false;$('#start').disabled=false;status('Camera closed. Tap Start experience to scan again.');
 };
 $('#start').onclick=async event=>{
  if(starting)return;starting=true;const token=++generation;$('#start').disabled=true;
  // Call play synchronously inside the human tap to authorise this same element's audio.
  video.muted=false;video.volume=1;
  const audioUnlock=event.isTrusted?video.play().then(()=>{if(token===generation&&!tracked){video.pause();video.currentTime=0;}}).catch(e=>{if(e.name==='NotAllowedError')video.dataset.audioBlocked='true';}):Promise.resolve();
  try{
   if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Use HTTPS in Safari or Chrome.');
   status('Allow camera access when your browser asks.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});
   if(token!==generation){stream.getTracks().forEach(t=>t.stop());return;}
   cameraStream=stream;const preview=document.createElement('video');preview.autoplay=true;preview.muted=true;preview.defaultMuted=true;preview.playsInline=true;preview.setAttribute('playsinline','');preview.setAttribute('webkit-playsinline','');preview.setAttribute('muted','');preview.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-2';
   const metadata=new Promise((resolve,reject)=>{preview.onloadedmetadata=resolve;preview.onerror=()=>reject(new Error('The camera stream could not be displayed. Try Safari or Chrome.'));});
   preview.srcObject=stream;$('#camera').appendChild(preview);document.body.classList.add('ar');
   await deadline(Promise.all([metadata,preview.play().catch(()=>{throw new Error('Your browser requires a tap to open the camera preview. Tap Open camera below.');})]),15000,'The camera did not provide video. Close other camera tabs and tap Open camera.');
   if(token!==generation)return;preview.width=preview.videoWidth;preview.height=preview.videoHeight;
   status('Camera ready. Loading image tracking…');
   const targetURL=new URL(c.target,document.baseURI).href;
   const targetReady=fetch(targetURL).then(r=>{if(!r.ok)throw new Error('The tracking image could not load ('+r.status+'). Retry on a stable connection.');return r.arrayBuffer();});
   const [THREE,{MindARThree}]=await deadline(Promise.all([import('three'),import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'),targetReady]),45000,'The camera is ready, but tracking files could not load. Check your connection and tap Open camera.');
   if(token!==generation)return;
   mind=new MindARThree({container:$('#camera'),imageTargetSrc:new URL(c.target,document.baseURI).href,maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',...trackingSettings});
   // MindAR 1.2.5 camera adapter: reuse the already approved, explicitly playing stream.
   mind._startVideo=async()=>{mind.video=preview;};
   mind.renderer.setPixelRatio(1);
   texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
   material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
   geometry=new THREE.PlaneGeometry(1,1);mesh=new THREE.Mesh(geometry,material);mesh.visible=false;
   let bounds;
   const fitVideo=()=>{if(!bounds)return;const uv=coverUV(video.videoWidth/video.videoHeight,bounds.width/bounds.height);texture.repeat.set(uv.x,uv.y);texture.offset.set((1-uv.x)/2,(1-uv.y)/2);};
   video.onloadedmetadata=fitVideo;
   const anchor=mind.addAnchor(0);
   displayGroup=new THREE.Group();displayGroup.matrixAutoUpdate=false;displayGroup.visible=false;displayGroup.add(mesh);mind.scene.add(displayGroup);
   // Read the genuine anchor pose, then stabilise its rigid transform before drawing.
   anchor.onTargetUpdate=()=>{
    if(token!==generation||!poseStabilizer||!tracked)return;
    const filtered=poseStabilizer.update(anchor.group.matrix,performance.now());
    if(filtered){const first=!displayGroup.visible;displayGroup.matrix.copy(filtered);displayGroup.matrixWorldNeedsUpdate=true;displayGroup.visible=true;if(first){status('');if(wantsPlay&&!video.ended)play();}}
   };
   anchor.onTargetFound=()=>{if(token!==generation)return;tracked=true;mesh.visible=true;status('Hold the image in view…');};
   anchor.onTargetLost=()=>{if(token!==generation)return;tracked=false;mesh.visible=false;if(displayGroup)displayGroup.visible=false;poseStabilizer?.reset();video.pause();status('Point back at the image to continue.');};
   document.body.classList.add('ar');const instance=mind;await deadline(instance.start(),30000,'The camera is ready, but image tracking could not initialise. Tap Open camera to retry.');if(token!==generation){instance.video?.srcObject?.getTracks().forEach(t=>t.stop());instance.controller?.stopProcessVideo();return;}
   // Use dimensions from the actual .mind data, so geometry and pose use one reference.
   const [targetWidth,targetHeight]=instance.controller.markerDimensions[0];
   bounds=surfaceBounds(targetWidth,targetHeight,c.rectangle);
   mesh.scale.set(bounds.width,bounds.height,1);mesh.position.set(bounds.x,bounds.y,0);fitVideo();
   poseStabilizer=new PoseStabilizer(THREE,instance.camera,bounds,()=>({width:$('#camera').clientWidth,height:$('#camera').clientHeight}));
   // Browser chrome and orientation can change the camera crop without a window resize.
   resizeObserver=new ResizeObserver(()=>{if(mind===instance)instance.resize();});resizeObserver.observe($('#camera'));
   // Render each display frame; tracking independently supplies the filtered pose.
   instance.renderer.setAnimationLoop(()=>{if(mind===instance)instance.renderer.render(instance.scene,instance.camera);});
   $('#start').hidden=true;$('#controls').hidden=false;$('#play').textContent=video.dataset.audioBlocked==='true'?'Play':wantsPlay?'Pause':'Play';if(!tracked)status('Point at the '+c.name+' image.');
   await audioUnlock;
  }catch(e){if(token!==generation)return;stop();$('#start').textContent='Open camera';status(cameraError(e));}
  finally{if(token===generation){starting=false;$('#start').disabled=false;}}
 };
 $('#play').onclick=()=>{if(video.ended){video.currentTime=0;wantsPlay=false;}if(video.dataset.audioBlocked==='true'){wantsPlay=true;if(tracked)play();return;}wantsPlay=!wantsPlay;if(!wantsPlay){video.pause();$('#play').textContent='Play';}else if(tracked)play();else status('Point at the image to play.');};
 $('#replay').onclick=()=>{video.currentTime=0;wantsPlay=true;if(tracked)play();};$('#stop').onclick=stop;
 video.onended=()=>{wantsPlay=false;$('#play').textContent='Replay';status('');};
 video.onwaiting=()=>{if(tracked)status('Loading video…');};video.onplaying=()=>{if(tracked)status('');};
 video.onerror=()=>status('Video could not load. Use Watch video directly.');
 $('#fallback').href=c.video;$('#fallback').onclick=stop;
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&mind)stop();});window.addEventListener('pagehide',stop);
 // Enter the camera directly from each campaign QR URL; autoplay policies still apply.
 $('#start').hidden=true;
 $('#start').click();
}
