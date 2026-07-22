// ============================================
// Scholarships Listing Page Logic
// ============================================

let currentPage = 1;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initThemeToggle();
  loadScholarships();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        loadScholarships(1);
      }, 400);
    });
  }
});

async function loadScholarships(page = 1) {
  currentPage = page;
  const grid = document.getElementById('scholarshipGrid');

  try {
    const data = await apiCall(`/scholarships?page=${page}&limit=9&search=${encodeURIComponent(searchQuery)}`);

    if (!data.scholarships || data.scholarships.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No scholarships found</div>
            <div class="empty-state-text">Try a different search term</div>
          </div>
        </div>`;
      document.getElementById('paginationContainer').innerHTML = '';
      return;
    }

    grid.innerHTML = data.scholarships.map(s => {
      const daysLeft = daysUntilDeadline(s.deadline);
      const expired = isDeadlinePassed(s.deadline);

      return `
        <div class="col-md-6 col-lg-4 fade-in-up">
          <div class="scholarship-card h-100 d-flex flex-column">
            <div class="scholarship-card-header">
              <h6 class="fw-semibold mb-1" style="color:var(--text-primary);">${s.title}</h6>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="scholarship-amount">${formatCurrency(s.amount)}</span>
                <span class="scholarship-deadline ${expired ? 'expired' : ''}">
                  <i class="bi bi-calendar3 me-1"></i>
                  ${expired ? 'Expired' : `${daysLeft} days left`}
                </span>
              </div>
            </div>
            <div class="p-3 flex-grow-1 d-flex flex-column">
              <p class="small mb-2" style="color:var(--text-secondary);">${s.description.substring(0, 150)}${s.description.length > 150 ? '...' : ''}</p>
              <div class="mb-2">
                <strong class="small">Eligibility:</strong>
                <p class="small text-muted mb-2">${s.eligibility.substring(0, 100)}${s.eligibility.length > 100 ? '...' : ''}</p>
              </div>
              ${s.requiredDocuments && s.requiredDocuments.length > 0 ? `
                <div class="mb-2">
                  ${s.requiredDocuments.map(d => `<span class="badge bg-light text-dark me-1 mb-1" style="font-size:0.7rem;">${d}</span>`).join('')}
                </div>
              ` : ''}
              <div class="mt-auto pt-2">
                <div class="small text-muted mb-2"><i class="bi bi-calendar-event me-1"></i>Deadline: ${formatDate(s.deadline)}</div>
                ${expired ?
                  `<button class="btn btn-outline-custom btn-sm w-100" disabled>Deadline Passed</button>` :
                  `<a href="/apply/${s._id}" class="btn btn-primary-custom btn-sm w-100">
                    <i class="bi bi-send me-1"></i> Apply Now
                  </a>`
                }
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    renderPagination('paginationContainer', data.page, data.pages, loadScholarships);
  } catch (error) {
    grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load scholarships</div>`;
    showToast('Failed to load scholarships', 'error');
  }
}
