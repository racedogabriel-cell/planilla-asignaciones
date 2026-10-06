export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char],
  );
}

export function categoryLabel(categoria) {
  if (categoria === 'Elder') return 'Anciano';
  if (categoria === 'MinisterialServant') return 'Siervo ministerial';
  return 'Publicador';
}

export function setupNotice(message) {
  return `<div class="notice">${escapeHtml(message)}</div>`;
}

export function errorNotice(message) {
  return `<div class="notice notice-error">${escapeHtml(message)}</div>`;
}
