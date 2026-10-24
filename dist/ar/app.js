const $=s=>document.querySelector(s);
const campaigns=await fetch(new URL('campaigns.json',import.meta.url)).then(r=>r.json());
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
 let mind,texture,material,geometry,mesh,tracked=false,wantsPlay=true,starting=false,generation=0;
 const status=t=>$('#status').textContent=t;
 status('Opening camera… Allow access, then point at the image.');
 const play=async()=>{video.muted=false;video.volume=1;try{await video.play();video.dataset.audioBlocked='';$('#play').textContent='Pause';}catch(e){if(e.name==='NotAllowedError'){video.dataset.audioBlocked='true';status('Tap Play to start the campaign with audio.');$('#play').textContent='Play';}else status('Video is loading. Keep the page in view, or use Watch video directly.');}};
 const stop=()=>{
  generation++;tracked=false;video.pause();const instance=mind;mind=null;
  if(instance){instance.renderer.setAnimationLoop(null);instance.controller?.stopProcessVideo();instance.video?.srcObject?.getTracks().forEach(t=>t.stop());instance.video?.remove();instance.renderer.dispose();}
  texture?.dispose();material?.dispose();geometry?.dispose();$('#camera').replaceChildren();document.body.classList.remove('ar');$('#start').hidden=false;$('#controls').hidden=true;starting=false;$('#start').disabled=false;status('Camera closed. Tap Start experience to scan again.');
 };
 $('#start').onclick=async()=>{
  if(starting)return;starting=true;const token=++generation;$('#start').disabled=true;
  // Call play synchronously inside the human tap to authorise this same element's audio.
  video.muted=false;video.volume=1;
  const audioUnlock=video.play().then(()=>{if(token===generation&&!tracked){video.pause();video.currentTime=0;}}).catch(e=>{if(e.name==='NotAllowedError')video.dataset.audioBlocked='true';});
  try{
   if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Use HTTPS in Safari or Chrome.');
   status('Loading camera and campaign…');
   const [THREE,{MindARThree}]=await Promise.all([import('three'),import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js')]);
   if(token!==generation)return;
   mind=new MindARThree({container:$('#camera'),imageTargetSrc:new URL(c.target,document.baseURI).href,maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',warmupTolerance:5,missTolerance:10,filterMinCF:.001,filterBeta:1000});
   mind.renderer.setPixelRatio(1);
   texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
   material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
   const r=c.rectangle,aspect=c.targetHeight/c.targetWidth;geometry=new THREE.PlaneGeometry(r.width,r.height*aspect);mesh=new THREE.Mesh(geometry,material);mesh.position.set(r.x+r.width/2-.5,(.5-r.y-r.height/2)*aspect,.002);mesh.visible=false;
   const anchor=mind.addAnchor(0);anchor.group.add(mesh);
   anchor.onTargetFound=()=>{if(token!==generation)return;tracked=true;mesh.visible=true;status('');if(wantsPlay&&!video.ended)play();};
   anchor.onTargetLost=()=>{if(token!==generation)return;tracked=false;mesh.visible=false;video.pause();status('Point back at the image to continue.');};
   document.body.classList.add('ar');const instance=mind;await instance.start();if(token!==generation){instance.video?.srcObject?.getTracks().forEach(t=>t.stop());instance.controller?.stopProcessVideo();return;}
   let lastFrame=0;instance.renderer.setAnimationLoop(time=>{if(time-lastFrame<1000/30)return;lastFrame=time;if(mind===instance)instance.renderer.render(instance.scene,instance.camera);});
   $('#start').hidden=true;$('#controls').hidden=false;$('#play').textContent=video.dataset.audioBlocked==='true'?'Play':wantsPlay?'Pause':'Play';if(!tracked)status('Point at the '+c.name+' image.');
   await audioUnlock;
  }catch(e){if(token!==generation)return;stop();status('Could not start the camera. '+(e?.message||'Check camera permission.')+' You can also watch the video directly.');}
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
