// ============================================
// Student Dashboard Logic
// ============================================

let selectedFiles = [];
let applyScholarshipId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth('student')) return;

  initThemeToggle();
  initNavbar();

  const user = getUser();
  const welcomeEl = document.getElementById('welcomeName');
  if (welcomeEl && user) welcomeEl.textContent = user.name;

  loadDashboard();
  setupDropzone();
  setupSubmitApplication();
  setupProfileForm();
  setupScholarshipSearch();
});

// ============================================
// Section Navigation
// ============================================

function showSection(name) {
  const sections = ['overview', 'scholarships', 'applications', 'profile'];
  sections.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });

  // Update nav active state
  document.querySelectorAll('.nav-link-custom').forEach(link => link.classList.remove('active'));
  event.target.closest('.nav-link-custom').classList.add('active');

  // Load data for section
  if (name === 'scholarships') loadAllScholarships();
  if (name === 'applications') loadAllApplications();
  if (name === 'profile') loadProfile();
}

// ============================================
// Dashboard Overview
// ============================================

async function loadDashboard() {
  try {
    const [scholarshipsData, applications] = await Promise.all([
      apiCall('/scholarships?limit=6'),
      apiCall('/applications/student')
    ]);

    // Update stats
    const pending = applications.filter(a => a.status === 'Pending').length;
    const approved = applications.filter(a => a.status === 'Approved').length;
    const rejected = applications.filter(a => a.status === 'Rejected').length;

    document.getElementById('statTotal').textContent = applications.length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statApproved').textContent = approved;
    document.getElementById('statRejected').textContent = rejected;

    // Render scholarship cards
    renderScholarshipCards(scholarshipsData.scholarships, 'scholarshipCards');

    // Render recent applications
    renderApplicationsTable(applications.slice(0, 5), 'recentApplicationsBody');
  } catch (error) {
    showToast('Failed to load dashboard data', 'error');
    console.error(error);
  }
}

// ============================================
// Scholarship Cards
// ============================================

function renderScholarshipCards(scholarships, containerId) {
  const container = document.getElementById(containerId);
  if (!scholarships || scholarships.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <div class="empty-state-icon">🎓</div>
          <div class="empty-state-title">No scholarships available</div>
          <div class="empty-state-text">Check back later for new opportunities</div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = scholarships.map(s => {
    const daysLeft = daysUntilDeadline(s.deadline);
    const expired = isDeadlinePassed(s.deadline);
    const deadlineClass = expired ? 'expired' : '';
    const deadlineText = expired ? 'Expired' : `${daysLeft} days left`;

    return `
      <div class="col-md-6 col-lg-4 fade-in-up">
        <div class="scholarship-card h-100 d-flex flex-column">
          <div class="scholarship-card-header">
            <div class="d-flex justify-content-between align-items-start">
              <h6 class="fw-semibold mb-1" style="color:var(--text-primary);">${s.title}</h6>
              <span class="scholarship-amount">${formatCurrency(s.amount)}</span>
            </div>
            <div class="scholarship-deadline ${deadlineClass}">
              <i class="bi bi-calendar3 me-1"></i> ${formatDate(s.deadline)} · ${deadlineText}
            </div>
          </div>
          <div class="p-3 flex-grow-1 d-flex flex-column">
            <p class="small mb-2" style="color:var(--text-secondary);">${s.description.substring(0, 120)}...</p>
            <p class="small mb-2"><strong>Eligibility:</strong> <span style="color:var(--text-muted);">${s.eligibility.substring(0, 80)}...</span></p>
            ${s.requiredDocuments && s.requiredDocuments.length > 0 ? `
              <div class="mb-2">
                ${s.requiredDocuments.map(d => `<span class="badge bg-light text-dark me-1 mb-1" style="font-size:0.7rem;">${d}</span>`).join('')}
              </div>
            ` : ''}
            <div class="mt-auto">
              ${expired ? 
                `<button class="btn btn-outline-custom btn-sm w-100" disabled>Deadline Passed</button>` :
                `<button class="btn btn-primary-custom btn-sm w-100" onclick="openApplyModal('${s._id}', '${s.title.replace(/'/g, "\\'")}', '${formatCurrency(s.amount)}', '${s.requiredDocuments ? s.requiredDocuments.join(', ') : ''}')">
                  <i class="bi bi-send me-1"></i> Apply Now
                </button>`
              }
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// All Scholarships (with search & pagination)
// ============================================

let schPage = 1;
let schSearch = '';

async function loadAllScholarships(page = 1) {
  schPage = page;
  try {
    const data = await apiCall(`/scholarships?page=${page}&limit=9&search=${encodeURIComponent(schSearch)}`);
    renderScholarshipCards(data.scholarships, 'allScholarshipCards');
    renderPagination('scholarshipPagination', data.page, data.pages, loadAllScholarships);
  } catch (error) {
    showToast('Failed to load scholarships', 'error');
  }
}

function setupScholarshipSearch() {
  const input = document.getElementById('scholarshipSearch');
  if (!input) return;
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      schSearch = input.value.trim();
      loadAllScholarships(1);
    }, 400);
  });
}

// ============================================
// Applications Table
// ============================================

function renderApplicationsTable(applications, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!applications || applications.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="text-center py-4">
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <div class="empty-state-title">No applications yet</div>
          <div class="empty-state-text">Start by applying for a scholarship</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = applications.map(app => `
    <tr>
      <td class="fw-medium">${app.scholarshipId ? app.scholarshipId.title : 'N/A'}</td>
      ${tbodyId === 'allApplicationsBody' ? `<td>${app.scholarshipId ? formatCurrency(app.scholarshipId.amount) : 'N/A'}</td>` : ''}
      <td>${formatDate(app.appliedAt)}</td>
      <td>${getStatusBadge(app.status)}</td>
      <td class="small" style="color:var(--text-muted);">${app.remarks || '—'}</td>
      ${tbodyId === 'allApplicationsBody' ? `
        <td>
          ${app.documents && app.documents.length > 0 ? 
            app.documents.map((d, i) => `<a href="${d}" target="_blank" class="small me-1"><i class="bi bi-file-earmark"></i> Doc ${i+1}</a>`).join('') :
            '<span class="text-muted small">None</span>'
          }
        </td>
      ` : ''}
    </tr>
  `).join('');
}

async function loadAllApplications() {
  try {
    const applications = await apiCall('/applications/student');
    renderApplicationsTable(applications, 'allApplicationsBody');
  } catch (error) {
    showToast('Failed to load applications', 'error');
  }
}

// ============================================
// Apply Modal & File Upload
// ============================================

function openApplyModal(scholarshipId, title, amount, docs) {
  applyScholarshipId = scholarshipId;
  selectedFiles = [];
  document.getElementById('applyScholarshipTitle').textContent = title;
  document.getElementById('applyScholarshipInfo').textContent = `Amount: ${amount}`;
  document.getElementById('applyRequiredDocs').textContent = docs ? `Required: ${docs}` : 'No specific documents required';
  document.getElementById('filePreviewList').innerHTML = '';

  const modal = new bootstrap.Modal(document.getElementById('applyModal'));
  modal.show();
}

function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });
}

function handleFiles(fileList) {
  const files = Array.from(fileList);
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  for (const file of files) {
    if (selectedFiles.length >= 5) {
      showToast('Maximum 5 files allowed', 'warning');
      break;
    }
    if (!allowed.includes(file.type)) {
      showToast(`${file.name}: Invalid file type`, 'error');
      continue;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name}: File too large (max 5MB)`, 'error');
      continue;
    }
    selectedFiles.push(file);
  }

  renderFilePreview();
}

function renderFilePreview() {
  const list = document.getElementById('filePreviewList');
  list.innerHTML = selectedFiles.map((f, i) => `
    <li class="file-preview-item">
      <span><i class="bi bi-file-earmark me-2"></i>${f.name} <span class="text-muted">(${(f.size / 1024).toFixed(1)} KB)</span></span>
      <button class="file-remove-btn" onclick="removeFile(${i})"><i class="bi bi-x-lg"></i></button>
    </li>
  `).join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFilePreview();
}

function setupSubmitApplication() {
  const btn = document.getElementById('submitApplicationBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!applyScholarshipId) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Submitting...';

    try {
      const formData = new FormData();
      formData.append('scholarshipId', applyScholarshipId);
      selectedFiles.forEach(file => formData.append('documents', file));

      await apiCall('/applications', 'POST', formData, true);

      showToast('Application submitted successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('applyModal')).hide();

      // Refresh dashboard
      loadDashboard();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-1"></i> Submit Application';
    }
  });
}

// ============================================
// Profile
// ============================================

async function loadProfile() {
  try {
    const profile = await apiCall('/students/profile');
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('profilePhone').value = profile.phone || '';
    document.getElementById('profileAddress').value = profile.address || '';
  } catch (error) {
    showToast('Failed to load profile', 'error');
  }
}

function setupProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const data = {
        name: document.getElementById('profileName').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        address: document.getElementById('profileAddress').value.trim()
      };

      const updated = await apiCall('/students/profile', 'PUT', data);

      // Update local storage
      const user = getUser();
      user.name = updated.name;
      localStorage.setItem('user', JSON.stringify(user));

      // Update navbar
      const nameEl = document.getElementById('navUserName');
      if (nameEl) nameEl.textContent = updated.name;

      const welcomeEl = document.getElementById('welcomeName');
      if (welcomeEl) welcomeEl.textContent = updated.name;

      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}
