function showSkeleton(container, count = 8) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text medium" style="margin-top: 1rem;"></div>
        <div class="skeleton skeleton-text short"></div>
        <div style="padding: 1rem;">
          <div class="skeleton skeleton-text" style="width: 40%; height: 1.5rem;"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function hideSkeleton(container) {
  container.innerHTML = '';
}