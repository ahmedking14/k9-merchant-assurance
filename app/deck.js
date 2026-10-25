const slides = [...document.querySelectorAll('.slide')];
const navButtons = [...document.querySelectorAll('#slideNav button')];
const count = document.querySelector('#slideCount');
const previous = document.querySelector('#previousSlide');
const next = document.querySelector('#nextSlide');
let active = Math.max(0, slides.findIndex(slide => slide.id === location.hash.slice(1)));

function show(index, updateHash = true) {
  active = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, i) => {
    const selected = i === active;
    slide.hidden = !selected;
    slide.classList.toggle('is-active', selected);
    slide.setAttribute('aria-hidden', String(!selected));
    navButtons[i].classList.toggle('is-current', selected);
    if (selected) navButtons[i].setAttribute('aria-current', 'step');
    else navButtons[i].removeAttribute('aria-current');
  });
  count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  previous.disabled = active === 0;
  next.disabled = active === slides.length - 1;
  if (updateHash) history.replaceState(null, '', `#${slides[active].id}`);
}

navButtons.forEach((button, i) => button.addEventListener('click', () => show(i)));
previous.addEventListener('click', () => show(active - 1));
next.addEventListener('click', () => show(active + 1));
window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); show(active + 1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); show(active - 1); }
  if (event.key === 'Home') { event.preventDefault(); show(0); }
  if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
});
window.addEventListener('hashchange', () => show(slides.findIndex(slide => slide.id === location.hash.slice(1)), false));
show(active, false);
