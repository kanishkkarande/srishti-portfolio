const $=s=>document.querySelector(s);
const campaigns=await fetch(new URL('campaigns.json',import.meta.url)).then(r=>r.json());
const slug=location.pathname.split('/').filter(Boolean).at(-1);const c=campaigns[slug];
if(!c){$('#cards').innerHTML=Object.entries(campaigns).map(([id,c],i)=>`<a class="card" href="${id}/"><div class="meta"><span>0${i+1} / CAMPAIGN</span><span>IMAGE-TRACKED AR</span></div><img src="${c.poster}" alt="${c.name} printed campaign target"><h2>${c.name}</h2><span>${c.tagline}</span><div class="launch">Bring this page to life <span>↗</span></div></a>`).join('');}
else{
 $('#home').hidden=true;$('#viewer').hidden=false;$('#brand').textContent=c.name;document.title=c.name+' / Paper Play';
 const video=$('#film');video.crossOrigin='anonymous';video.src=c.video;video.poster=c.poster;video.loop=false;
 let mind,mesh,texture,material,geometry,tracked=false,wantsPlay=true,starting=false;
 const status=t=>$('#status').textContent=t;
 const play=async()=>{try{await video.play();$('#play').textContent='Pause';}catch{status('Playback needs a tap. Press Play once the page is recognised.');$('#play').textContent='Play';}};
 const stop=()=>{tracked=false;video.pause();if(mind){mind.renderer.setAnimationLoop(null);mind.stop();mind.renderer.dispose();mind=null;}texture?.dispose();material?.dispose();geometry?.dispose();$('#camera').replaceChildren();document.body.classList.remove('ar');$('#start').hidden=false;$('#controls').hidden=true;status('Camera closed. Open it again to scan your page.');};
 $('#start').onclick=async()=>{
 if(starting)return;starting=true;$('#start').disabled=true;
 try{
 if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and Safari or Chrome.');
 // Prime the same media element within the tap, for iOS playback policy.
 video.muted=true;video.load();video.play().then(()=>{if(!tracked)video.pause();}).catch(()=>{});
 status('Loading image tracker…');
 const [THREE,{MindARThree}]=await Promise.all([import('three'),import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js')]);
 mind=new MindARThree({container:$('#camera'),imageTargetSrc:c.target,maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',warmupTolerance:5,missTolerance:3});
 texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
 const r=c.rectangle,aspect=c.targetHeight/c.targetWidth;
 geometry=new THREE.PlaneGeometry(r.width,r.height*aspect);mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(r.x+r.width/2-.5,(.5-r.y-r.height/2)*aspect,.002);mesh.visible=false;
 const anchor=mind.addAnchor(0);anchor.group.add(mesh);
 anchor.onTargetFound=()=>{tracked=true;mesh.visible=true;status('Page recognised • Video anchored');if(wantsPlay)play();};
 anchor.onTargetLost=()=>{tracked=false;mesh.visible=false;video.pause();status('Page out of view. Point back at the page to continue.');};
 document.body.classList.add('ar');status('Allow camera access in your browser to start tracking.');await mind.start();mind.renderer.setPixelRatio(Math.min(devicePixelRatio,2));mind.renderer.setAnimationLoop(()=>mind?.renderer.render(mind.scene,mind.camera));
 $('#start').hidden=true;$('#controls').hidden=false;status('Find your printed '+c.name+' page. Keep the whole page in view.');
 }catch(e){stop();status('Could not start AR: '+e.message+' Use the direct video below, or retry camera access.');}finally{starting=false;$('#start').disabled=false;}
 };
 $('#play').onclick=()=>{if(video.ended){video.currentTime=0;wantsPlay=false;}wantsPlay=!wantsPlay;if(!wantsPlay){video.pause();$('#play').textContent='Play';}else if(tracked)play();else status('Point at the printed page to play.');};
 $('#sound').onclick=()=>{video.muted=!video.muted;$('#sound').textContent=video.muted?'Sound off':'Sound on';};
 $('#replay').onclick=()=>{video.currentTime=0;wantsPlay=true;if(tracked)play();};$('#stop').onclick=stop;
 video.onended=()=>{$('#play').textContent='Replay';wantsPlay=false;status('Campaign complete. Tap Replay to watch again.');};
 video.onerror=()=>status('Video could not load. Check your connection or use the direct video link.');
 $('#fallback').href=c.video.startsWith('assets/')?c.video:c.fallback;$('#fallback').onclick=()=>{stop();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
 // A direct campaign URL starts camera acquisition; browser permission still applies.
 $('#start').click();
}
