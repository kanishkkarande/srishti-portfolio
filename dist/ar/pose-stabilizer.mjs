// Stabilise real MindAR poses. No pose is generated when the target is lost.
export class PoseStabilizer {
  constructor(THREE, camera, bounds, viewport) {
    this.T=THREE;this.camera=camera;this.bounds=bounds;this.viewport=viewport;
    this.reset();
  }
  reset(){this.pose=null;this.history=[];this.pending=null;this.lastTime=null;}
  corners(pose){
    const {T,camera,bounds:b}=this,{width,height}=this.viewport();
    const matrix=new T.Matrix4().compose(pose.p,pose.q,pose.s);
    return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{
      const v=new T.Vector3(b.x+x*b.width/2,b.y+y*b.height/2,0).applyMatrix4(matrix).project(camera);
      return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,z:v.z};
    });
  }
  distance(a,b){return Math.max(...a.map((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)));}
  update(matrix,time){
    const T=this.T,p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
    matrix.decompose(p,q,s);q.normalize();
    // A rigid, uniformly scaled plane preserves the 16:9 shape; never average matrix entries.
    const uniform=(s.x+s.y+s.z)/3;s.setScalar(uniform);
    if(![...p.toArray(),...q.toArray(),uniform].every(Number.isFinite)||uniform<=0)return null;
    const candidate={p,q,s},corners=this.corners(candidate);
    if(corners.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.z<=-1||v.z>=1))return null;
    const shortEdge=Math.min(...corners.map((v,i)=>Math.hypot(v.x-corners[(i+1)%4].x,v.y-corners[(i+1)%4].y)));
    if(shortEdge<24)return null;
    this.history.push({pose:candidate,corners});if(this.history.length>3)this.history.shift();
    if(this.history.length<3)return null;
    // The medoid of three samples rejects a single bad PnP solution without blending rotations.
    const best=this.history.reduce((a,b)=>{
      const cost=x=>this.history.reduce((sum,h)=>sum+this.distance(x.corners,h.corners),0);
      return cost(a)<=cost(b)?a:b;
    });
    if(!this.pose){this.pose={p:best.pose.p.clone(),q:best.pose.q.clone(),s:best.pose.s.clone()};this.lastTime=time;return this.output();}
    const currentCorners=this.corners(this.pose),error=this.distance(best.corners,currentCorners);
    const dt=Math.min(.1,Math.max(.001,(time-this.lastTime)/1000));this.lastTime=time;
    const deadband=Math.min(3,Math.max(1.5,shortEdge*.004));
    if(error<=deadband){this.pending=null;return this.output();}
    const jump=Math.max(28,shortEdge*.12);
    if(error>jump){
      if(!this.pending)this.pending={corners:best.corners,time,count:1};
      else if(this.distance(best.corners,this.pending.corners)<Math.max(8,shortEdge*.04))this.pending.count++;
      else this.pending={corners:best.corners,time:this.pending.time,count:1};
      // Reject isolated jumps, but allow sustained real movement within 150 ms.
      if(this.pending.count<3&&time-this.pending.time<150)return this.output();
    }else this.pending=null;
    const tau=error>12?.055:.22;
    const alpha=1-Math.exp(-dt/tau);
    this.pose.p.lerp(best.pose.p,alpha);this.pose.q.slerp(best.pose.q,alpha).normalize();this.pose.s.lerp(best.pose.s,alpha);
    return this.output();
  }
  output(){return new this.T.Matrix4().compose(this.pose.p,this.pose.q,this.pose.s);}
}
