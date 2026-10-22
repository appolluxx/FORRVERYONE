/* Allow a second finger to take over an in-progress Blockly drag. */
(()=>{
 const proto=Blockly.Gesture.prototype,originalStart=proto.handleStart,originalMove=proto.handleMove,originalUp=proto.handleUp;
 proto.handleMove=function(event){
  if(event.pointerType==='touch'&&this.cachedPoints?.has(String(event.pointerId)))this.cachedPoints.set(String(event.pointerId),this.getTouchPoint(event));
  if(this.touchPinchTakeover){if(event.pointerType==='touch'&&this.cachedPoints.has(String(event.pointerId))&&this.cachedPoints.size===2)this.handlePinch(event);event.preventDefault();event.stopPropagation();return;}
  return originalMove.call(this,event);
 };
 proto.handleStart=function(event){
  if(this.touchPinchTakeover){if(event.pointerType==='touch'&&this.cachedPoints.size<2){this.previousScale=1;this.handleTouchStart(event);}event.preventDefault();event.stopPropagation();return;}
  if(event.pointerType!=='touch'||!this.isPinchZoomEnabled||!this.isDragging()||!this.cachedPoints?.size||this.cachedPoints.has(String(event.pointerId))||this.bubbleDragger)return originalStart.call(this,event);
  // Finish at the first finger's latest position, never at the second finger.
  // A pinch is not a trash drop, even if the dragged block overlaps the toolbox.
  const workspace=this.startWorkspace_,getTarget=workspace.getDragTarget;
  try{
   workspace.getDragTarget=()=>null;
   if(this.blockDragger){this.blockDragger.endDrag(this.mostRecentEvent,this.currentDragDeltaXY);this.blockDragger.dispose();this.blockDragger=null;}
   if(this.workspaceDragger){this.workspaceDragger.endDrag(this.currentDragDeltaXY);this.workspaceDragger.dispose();this.workspaceDragger=null;}
  }finally{workspace.getDragTarget=getTarget;}
  Blockly.Touch?.longStop?.();
  this.touchPinchTakeover=true;this.previousScale=1;this.handleTouchStart(event);
  event.preventDefault();event.stopPropagation();
 };
 proto.handleUp=function(event){
  if(!this.touchPinchTakeover)return originalUp.call(this,event);
  this.cachedPoints.delete(String(event.pointerId));event.preventDefault();event.stopPropagation();
  // Do not turn the remaining finger back into a block drag.
  if(this.cachedPoints.size<2)this.previousScale=0;
  if(!this.cachedPoints.size){this.isEnding_=true;this.dispose();}
 };
 const originalTouchMove=proto.handleTouchMove;
 proto.handleTouchMove=function(event){if(this.touchPinchTakeover&&this.cachedPoints.size<2)return;return originalTouchMove.call(this,event);};
 document.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch')return;for(const ws of Blockly.common.getAllWorkspaces()){const gesture=ws.currentGesture_;if(gesture?.touchPinchTakeover)gesture.handleUp(event);}},true);
})();
