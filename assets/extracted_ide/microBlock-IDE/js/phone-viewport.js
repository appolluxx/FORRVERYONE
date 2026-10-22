/* A compact desktop-sized layout on phones; keep CSS and pointer coordinates aligned. */
(function(){
    'use strict';
    const meta=document.querySelector('meta[name="viewport"]');
    if(!meta)return;
    const mobile=/iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
    const original='width=device-width, initial-scale=1.0';
    let pending=false;
    function dimensions(){
        const v=window.visualViewport;
        return {width:Math.round(v?v.width*v.scale:innerWidth),height:Math.round(v?v.height*v.scale:innerHeight)};
    }
    function update(){
        pending=false;const size=dimensions();
        const phone=mobile&&Math.min(size.width,size.height)<=500&&Math.max(size.width,size.height)<=1100;
        const landscape=phone&&size.width>size.height;
        const content=landscape?'width=1000, initial-scale='+(size.width/1000).toFixed(4):original;
        if(meta.content!==content)meta.content=content;
        document.documentElement.classList.toggle('phone-compact-viewport',landscape);
    }
    function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
    window.IDEPhoneViewport={dimensions};
    addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
    update();
})();
