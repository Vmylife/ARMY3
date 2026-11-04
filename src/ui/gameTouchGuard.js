/* Shared mobile game touch guard. Does not block taps, swipes or actual inputs. */
(()=>{
 'use strict';
 if(window.armyGameTouchGuard)return;
 window.armyGameTouchGuard=true;
 const editable=element=>{
  const el=element?.nodeType===3?element.parentElement:element;
  return !!(el?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"]')||el?.isContentEditable);
 };
 document.addEventListener('selectstart',event=>{
  if(!editable(event.target))event.preventDefault();
 },{capture:true});
 document.addEventListener('contextmenu',event=>{
  if(!editable(event.target))event.preventDefault();
 },{capture:true});
 document.addEventListener('dragstart',event=>{
  if(!editable(event.target))event.preventDefault();
 },{capture:true});
 document.addEventListener('selectionchange',()=>{
  const selection=window.getSelection?.();
  if(!selection||selection.isCollapsed)return;
  if(editable(document.activeElement)||editable(selection.anchorNode))return;
  selection.removeAllRanges();
 });
})();
