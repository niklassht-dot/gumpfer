const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.desktop-nav');

function syncHeader(){
  if (header) header.classList.toggle('scrolled', window.scrollY > 24);
}
syncHeader();
window.addEventListener('scroll', syncHeader, {passive:true});

if(toggle && nav){
  toggle.addEventListener('click',()=>{
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.style.display = open ? '' : 'flex';
  });
}

document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',e=>{
    const target = document.querySelector(link.getAttribute('href'));
    if(!target) return;
    e.preventDefault();
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    if(toggle) toggle.setAttribute('aria-expanded','false');
    if(nav) nav.style.display='';
  });
});

const logo = document.querySelector('.brand img');
if(logo){
  logo.addEventListener('error',()=>{
    logo.style.display='none';
    const f = logo.nextElementSibling;
    if(f) f.style.display='block';
  });
}

const reviewTrack = document.querySelector('.review-track');
if(reviewTrack){
  const stepWidth = () => {
    const item = reviewTrack.querySelector('.review-item');
    if(!item) return reviewTrack.clientWidth;
    return item.offsetWidth + parseFloat(getComputedStyle(item).marginRight || 0);
  };
  const prev = document.querySelector('.review-prev');
  const next = document.querySelector('.review-next');
  if(prev) prev.addEventListener('click',()=>reviewTrack.scrollBy({left:-stepWidth(),behavior:'smooth'}));
  if(next) next.addEventListener('click',()=>{
    const atEnd = reviewTrack.scrollLeft + reviewTrack.clientWidth >= reviewTrack.scrollWidth - 4;
    atEnd ? reviewTrack.scrollTo({left:0,behavior:'smooth'}) : reviewTrack.scrollBy({left:stepWidth(),behavior:'smooth'});
  });
}

// Hero: mehrere Clips nacheinander statt kurzem Loop
const heroVideo = document.querySelector('.hero-video[data-playlist]');
if(heroVideo){
  const clips = heroVideo.dataset.playlist.split(',').map(s=>s.trim()).filter(Boolean);
  let current = 0;
  const playClip = index => {
    current = index % clips.length;
    heroVideo.classList.add('is-switching');
    setTimeout(()=>{
      heroVideo.src = clips[current];
      heroVideo.load();
      const p = heroVideo.play();
      if(p && p.catch) p.catch(()=>{});
      heroVideo.classList.remove('is-switching');
    }, 300);
  };
  heroVideo.addEventListener('ended', ()=>playClip(current + 1));
  heroVideo.addEventListener('error', ()=>playClip(current + 1), true);
}

// Lange Clips nach einigen Sekunden weiterschalten, damit die Playlist abwechslungsreich bleibt
const clipVideo = document.querySelector('.hero-video[data-clip-max]');
if(clipVideo){
  const maxSeconds = parseFloat(clipVideo.dataset.clipMax) || 12;
  clipVideo.addEventListener('timeupdate', ()=>{
    if(clipVideo.currentTime >= maxSeconds && !clipVideo.ended && !clipVideo.classList.contains('is-switching')){
      clipVideo.dispatchEvent(new Event('ended'));
    }
  });
}

// Hero ohne Video: eigene Fotos wechseln langsam durch
const slideCard = document.querySelector('.hero-video-card[data-slides]');
if (slideCard) {
  const imgs = slideCard.querySelectorAll('img');
  let i = 0;
  if (imgs.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      imgs[i].classList.remove('is-active');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('is-active');
    }, 4500);
  }
}

// Aufwind-Sektionen: Ticker, Text-Reveal, Punktkarte, Google Maps
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 1 · Bild-Ticker */
  document.querySelectorAll('[data-ticker]').forEach(function(root){
    if (reduce) return;
    var track = root.querySelector('.ticker__track');
    var originals = [].slice.call(track.children), n = originals.length;
    function addSet(){ originals.forEach(function(el){ var c = el.cloneNode(true); c.setAttribute('aria-hidden','true'); c.querySelectorAll('img').forEach(function(i){ i.alt=''; }); track.appendChild(c); }); }
    addSet();
    while (track.scrollWidth < root.clientWidth * 2.5) addSet();
    var speed = +root.dataset.speed || 24, cur = speed, target = speed, x = 0, last = 0, visible = true;
    function period(){ return track.children[n].offsetLeft - track.children[0].offsetLeft; }
    root.addEventListener('mouseenter', function(){ target = 0; });
    root.addEventListener('mouseleave', function(){ target = speed; });
    new IntersectionObserver(function(e){ visible = e[0].isIntersecting; }).observe(root);
    function frame(t){
      var dt = last ? Math.min(t - last, 50) / 1000 : 0; last = t;
      cur += (target - cur) * .08;
      if (visible){ x -= cur * dt; var p = period(); if (p > 0 && -x >= p) x += p; track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)'; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  /* 2 · Scroll-Text-Reveal */
  var reveals = [];
  document.querySelectorAll('[data-reveal]').forEach(function(el){
    if (reduce) return;
    var text = el.textContent.trim(), from = +(el.dataset.revealFrom || .25);
    el.textContent = '';
    var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text; el.appendChild(sr);
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden','true'); el.appendChild(vis);
    var chars = [];
    text.split(/(\s+)/).forEach(function(part){
      if (/^\s+$/.test(part)) { vis.appendChild(document.createTextNode(' ')); return; }
      var w = document.createElement('span'); w.className = 'rv-w';
      part.split('').forEach(function(ch){ var c = document.createElement('span'); c.textContent = ch; c.style.opacity = from; w.appendChild(c); chars.push(c); });
      vis.appendChild(w);
    });
    reveals.push({ el:el, chars:chars, from:from, last:-1 });
  });
  function updateReveals(){
    var vh = window.innerHeight;
    reveals.forEach(function(r){
      var b = r.el.getBoundingClientRect();
      if (b.bottom < -vh || b.top > vh * 2) return;
      var start = vh * .85, end = vh * .4;
      var p = Math.min(1, Math.max(0, (start - b.top) / (start - end + b.height * .6)));
      if (Math.abs(p - r.last) < .002) return; r.last = p;
      var soft = 10, n = r.chars.length, head = p * (n + soft);
      for (var i = 0; i < n; i++){
        var a = Math.min(1, Math.max(0, (head - i) / soft));
        r.chars[i].style.opacity = (r.from + (1 - r.from) * a).toFixed(3);
      }
    });
  }
  if (reveals.length){
    var ticking = false;
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(function(){ updateReveals(); ticking = false; }); } }, { passive:true });
    window.addEventListener('resize', updateReveals);
    updateReveals();
  }
  /* 3 · Punktkarte */
  document.querySelectorAll('[data-area]').forEach(function(sec){
    var pins = sec.querySelectorAll('.dm-pin');
    pins.forEach(function(p, i){ p.style.transitionDelay = (reduce ? 0 : i * 60) + 'ms'; });
    if (!('IntersectionObserver' in window) || reduce){ sec.classList.add('is-in'); return; }
    new IntersectionObserver(function(e, o){ if (e[0].isIntersecting){ sec.classList.add('is-in'); o.disconnect(); } }, { threshold:.35 }).observe(sec);
  });
  /* 4 · Google Maps Zwei-Klick */
  document.querySelectorAll('[data-gmap]').forEach(function(box){
    function load(){
      var f = document.createElement('iframe');
      f.src = 'https://www.google.com/maps?q=' + encodeURIComponent(box.dataset.gmap) + '&z=' + (box.dataset.zoom || 15) + '&output=embed';
      f.title = 'Karte: ' + box.dataset.gmap; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = ''; box.appendChild(f);
    }
    box.querySelector('.gmap__load').addEventListener('click', load);
  });
})();
