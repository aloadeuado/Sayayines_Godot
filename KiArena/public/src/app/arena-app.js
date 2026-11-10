import { initArena } from '../game/arena.js';

// ?layout=vertical: arena en 9:16 (540×960, para TikTok); por defecto 900×540.
// ?view=window: solo el canvas, ajustado a la ventana (la que se captura en OBS).
const ARENA_SIZES = { horizontal: [900, 540], vertical: [540, 960] };

export function startArena() {
  const params = new URLSearchParams(window.location.search);
  const layout = params.get('layout') === 'vertical' ? 'vertical' : 'horizontal';
  const [width, height] = ARENA_SIZES[layout];
  const canvas = document.querySelector('#game');
  canvas.width = width;
  canvas.height = height;
  document.body.dataset.layout = layout;
  document.body.style.setProperty('--arena-aspect', String(width / height));
  if (params.get('view') === 'window') document.body.classList.add('arena-window');
  initArena();
}
