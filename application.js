// ============================================
// Application Form Page Logic
// ============================================

let appSelectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initThemeToggle();

  // Get scholarship ID from URL
  const pathParts = window.location.pathname.split('/');
  const scholarshipId = pathParts[pathParts.length - 1];

  if (!scholarshipId) {
    showToast('Invalid scholarship', 'error');
    return;
  }

  loadScholarshipDetails(scholarshipId);
});

async function loadScholarshipDetails(id) {
  const card = document.getElementById('applyCard');

  try {
    const scholarship = await apiCall(`/scholarships/${id}`);
    const expired = isDeadlinePassed(scholarship.deadline);
    const daysLeft = daysUntilDeadline(scholarship.deadline);

    card.innerHTML = `
      <div class="fade-in">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h3 class="fw-bold mb-1">${scholarship.title}</h3>
            <span class="scholarship-deadline ${expired ? 'expired' : ''}">
              <i class="bi bi-calendar3 me-1"></i>
              ${formatDate(scholarship.deadline)} · ${expired ? 'Expired' : `${daysLeft} days left`}
            </span>
          </div>
          <div class="scholarship-amount" style="font-size:2rem;">${formatCurrency(scholarship.amount)}</div>
        </div>

        <hr style="border-color:var(--border-color);">

        <div class="mb-3">
          <h6 class="fw-semibold">Description</h6>
          <p style="color:var(--text-secondary);">${scholarship.description}</p>
        </div>

        <div class="mb-3">
          <h6 class="fw-semibold">Eligibility</h6>
          <p style="color:var(--text-secondary);">${scholarship.eligibility}</p>
        </div>

        ${scholarship.requiredDocuments && scholarship.requiredDocuments.length > 0 ? `
          <div class="mb-4">
            <h6 class="fw-semibold">Required Documents</h6>
            <div>
              ${scholarship.requiredDocuments.map(d => `<span class="badge bg-light text-dark me-1 mb-1">${d}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${expired ? `
          <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            The deadline for this scholarship has passed. Applications are no longer accepted.
          </div>
          <a href="/student-dashboard" class="btn btn-outline-custom">
            <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
          </a>
        ` : `
          <hr style="border-color:var(--border-color);">

          <h5 class="fw-semibold mb-3">Submit Your Application</h5>

          <div class="mb-3">
            <label class="form-label-custom">Upload Documents</label>
            <div class="dropzone" id="appDropzone">
              <div class="dropzone-icon"><i class="bi bi-cloud-arrow-up"></i></div>
              <div class="dropzone-text">Drag & drop files here or <strong>click to browse</strong></div>
              <div class="small text-muted mt-1">PDF, JPG, PNG — max 5MB each, up to 5 files</div>
            </div>
            <input type="file" id="appFileInput" multiple accept=".pdf,.jpg,.jpeg,.png" style="display:none;">
            <ul class="file-preview-list" id="appFilePreviewList"></ul>
          </div>

          <button class="btn btn-primary-custom btn-lg w-100" id="submitAppBtn" data-id="${scholarship._id}">
            <i class="bi bi-send me-1"></i> Submit Application
          </button>
        `}
      </div>
    `;

    if (!expired) {
      setupAppDropzone();
      setupAppSubmit(scholarship._id);
    }
  } catch (error) {
    card.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">Scholarship not found</div>
        <div class="empty-state-text">${error.message}</div>
        <a href="/student-dashboard" class="btn btn-outline-custom mt-3">Back to Dashboard</a>
      </div>`;
  }
}

function setupAppDropzone() {
  const dropzone = document.getElementById('appDropzone');
  const fileInput = document.getElementById('appFileInput');
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
    handleAppFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleAppFiles(e.target.files);
    fileInput.value = '';
  });
}

function handleAppFiles(fileList) {
  const files = Array.from(fileList);
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  for (const file of files) {
    if (appSelectedFiles.length >= 5) {
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
    appSelectedFiles.push(file);
  }

  renderAppFilePreview();
}

function renderAppFilePreview() {
  const list = document.getElementById('appFilePreviewList');
  if (!list) return;

  list.innerHTML = appSelectedFiles.map((f, i) => `
    <li class="file-preview-item">
      <span>
        <i class="bi bi-file-earmark me-2"></i>${f.name}
        <span class="text-muted">(${(f.size / 1024).toFixed(1)} KB)</span>
      </span>
      <button class="file-remove-btn" onclick="removeAppFile(${i})"><i class="bi bi-x-lg"></i></button>
    </li>
  `).join('');
}

function removeAppFile(index) {
  appSelectedFiles.splice(index, 1);
  renderAppFilePreview();
}

function setupAppSubmit(scholarshipId) {
  const btn = document.getElementById('submitAppBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Submitting...';

    try {
      const formData = new FormData();
      formData.append('scholarshipId', scholarshipId);
      appSelectedFiles.forEach(file => formData.append('documents', file));

      await apiCall('/applications', 'POST', formData, true);

      showToast('Application submitted successfully!', 'success');

      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Submitted!';
      btn.classList.remove('btn-primary-custom');
      btn.classList.add('btn', 'btn-success');

      setTimeout(() => {
        window.location.href = '/student-dashboard';
      }, 1500);
    } catch (error) {
      showToast(error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-1"></i> Submit Application';
    }
  });
}
