document.querySelectorAll('[data-art-gallery]').forEach((gallery) => {
  const track = gallery.querySelector('.art-track');
  const cards = [...gallery.querySelectorAll('[data-art-open]')];
  const dialog = gallery.querySelector('[data-art-dialog]');
  const image = gallery.querySelector('[data-art-image]');
  const title = gallery.querySelector('[data-art-title]');
  const counter = gallery.querySelector('[data-art-counter]');
  const project = gallery.querySelector('[data-art-project]');
  const previous = gallery.querySelector('[data-track-prev]');
  const next = gallery.querySelector('[data-track-next]');
  const stage = gallery.querySelector('[data-art-stage]');
  const scroller = gallery.querySelector('[data-art-scroll]');
  const details = gallery.querySelector('[data-art-details]');
  const more = gallery.querySelector('[data-art-more]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let trigger = null;
  let savedScroll = 0;
  let bodyStyle = null;
  let locked = false;
  let touch = null;
  let suppressClick = false;
  const updateTrack = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const scrollTrack = (direction) => track.scrollBy({ left: direction * track.clientWidth * .8, behavior: reduced.matches ? 'instant' : 'smooth' });
  gallery.querySelector('.art-track-controls').hidden = false;
  previous.addEventListener('click', () => scrollTrack(-1));
  next.addEventListener('click', () => scrollTrack(1));
  track.addEventListener('scroll', updateTrack, { passive: true });
  new ResizeObserver(updateTrack).observe(track);
  track.addEventListener('keydown', (event) => {
    if (event.target !== track) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); scrollTrack(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  track.addEventListener('wheel', (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1);
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    if ((delta > 0 && !atEnd) || (delta < 0 && track.scrollLeft > 2)) {
      event.preventDefault(); track.scrollLeft += delta;
    }
  }, { passive: false });
  const show = (newIndex) => {
    index = (newIndex + cards.length) % cards.length;
    const card = cards[index];
    const expanded = card.dataset.slug === 'deer';
    details.hidden = !expanded;
    more.hidden = !expanded;
    scroller.scrollTop = 0;
    image.src = card.href;
    image.alt = card.dataset.alt;
    title.textContent = card.dataset.title;
    counter.textContent = `${index + 1} / ${cards.length} — ${card.dataset.title}`;
    project.hidden = !card.dataset.project;
    if (card.dataset.project) project.setAttribute('href', card.dataset.project);
    else project.removeAttribute('href');
  };
  more.addEventListener('click', (event) => {
    event.preventDefault();
    scroller.scrollTo({ top: details.offsetTop - scroller.offsetTop, behavior: reduced.matches ? 'instant' : 'smooth' });
    scroller.focus({ preventScroll: true });
  });
  cards.forEach((card, i) => card.addEventListener('click', (event) => {
    if (typeof dialog.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    trigger = card; savedScroll = window.scrollY; bodyStyle = document.body.getAttribute('style');
    show(i); dialog.showModal(); locked = true;
    Object.assign(document.body.style, { position: 'fixed', top: `-${savedScroll}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    gallery.querySelector('[data-art-close]').focus({ preventScroll: true });
  }));
  const close = () => { if (dialog.open) dialog.close(); };
  gallery.querySelector('[data-art-close]').addEventListener('click', close);
  gallery.querySelector('[data-art-prev]').addEventListener('click', () => show(index - 1));
  gallery.querySelector('[data-art-next]').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    if (!locked) return;
    locked = false;
    if (bodyStyle === null) document.body.removeAttribute('style'); else document.body.setAttribute('style', bodyStyle);
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    trigger?.focus({ preventScroll: true });
    touch = null;
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', (event) => {
    if (suppressClick) { suppressClick = false; return; }
    if (event.target === dialog || event.target === stage) close();
    // With object-fit:contain, empty letterboxing is still part of the img element.
    if (event.target === image && image.naturalWidth && image.naturalHeight) {
      const rect = image.getBoundingClientRect();
      const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      const left = rect.left + (rect.width - width) / 2, top = rect.top + (rect.height - height) / 2;
      if (event.clientX < left || event.clientX > left + width || event.clientY < top || event.clientY > top + height) close();
    }
  });
  stage.addEventListener('touchstart', (event) => {
    suppressClick = false;
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    if (!touch || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dy) > 12) suppressClick = true;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { show(index + (dx < 0 ? 1 : -1)); suppressClick = true; }
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  updateTrack();
});
