// ============================================
// Admin Dashboard Logic
// ============================================

let pieChart = null;
let barChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth('admin')) return;

  initThemeToggle();
  initNavbar();

  loadAdminDashboard();
  setupScholarshipModal();
  setupRemarksModal();
  setupStatusFilter();
  setupStudentSearch();
});

// ============================================
// Section Navigation
// ============================================

function showAdminSection(name) {
  const sections = ['overview', 'scholarships', 'applications', 'students'];
  sections.forEach(s => {
    const el = document.getElementById(`admin-section-${s}`);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });

  document.querySelectorAll('.nav-link-custom').forEach(link => link.classList.remove('active'));
  event.target.closest('.nav-link-custom').classList.add('active');

  if (name === 'scholarships') loadAdminScholarships();
  if (name === 'applications') loadAdminApplications();
  if (name === 'students') loadAdminStudents();
}

// ============================================
// Dashboard Overview + Charts
// ============================================

async function loadAdminDashboard() {
  try {
    const stats = await apiCall('/applications/stats');

    document.getElementById('adminStatStudents').textContent = stats.totalStudents;
    document.getElementById('adminStatScholarships').textContent = stats.totalScholarships;
    document.getElementById('adminStatTotal').textContent = stats.totalApplications;
    document.getElementById('adminStatPending').textContent = stats.pending;
    document.getElementById('adminStatApproved').textContent = stats.approved;
    document.getElementById('adminStatRejected').textContent = stats.rejected;

    renderCharts(stats);
  } catch (error) {
    showToast('Failed to load dashboard stats', 'error');
    console.error(error);
  }
}

function renderCharts(stats) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#CBD5E1' : '#64748B';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Pie Chart
  const pieCtx = document.getElementById('statusPieChart');
  if (pieCtx) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [{
          data: [stats.pending, stats.approved, stats.rejected],
          backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Bar Chart
  const barCtx = document.getElementById('statusBarChart');
  if (barCtx) {
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Total', 'Pending', 'Approved', 'Rejected'],
        datasets: [{
          label: 'Applications',
          data: [stats.totalApplications, stats.pending, stats.approved, stats.rejected],
          backgroundColor: ['#6366F1', '#F59E0B', '#10B981', '#EF4444'],
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 1 }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          }
        }
      }
    });
  }
}

// ============================================
// Scholarship Management
// ============================================

let adminSchPage = 1;

async function loadAdminScholarships(page = 1) {
  adminSchPage = page;
  try {
    const data = await apiCall(`/scholarships?page=${page}&limit=10`);
    const tbody = document.getElementById('adminScholarshipsBody');

    if (!data.scholarships || data.scholarships.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No scholarships found</td></tr>';
      return;
    }

    tbody.innerHTML = data.scholarships.map(s => `
      <tr>
        <td class="fw-medium">${s.title}</td>
        <td>${formatCurrency(s.amount)}</td>
        <td>
          <span class="${isDeadlinePassed(s.deadline) ? 'text-danger' : ''}">${formatDate(s.deadline)}</span>
        </td>
        <td>${formatDate(s.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-outline-custom me-1" onclick="editScholarship('${s._id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-custom text-danger" onclick="deleteScholarship('${s._id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    renderPagination('adminScholarshipPagination', data.page, data.pages, loadAdminScholarships);
  } catch (error) {
    showToast('Failed to load scholarships', 'error');
  }
}

function setupScholarshipModal() {
  const addBtn = document.getElementById('addScholarshipBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('scholarshipModalTitle').textContent = 'Add Scholarship';
      document.getElementById('scholarshipForm').reset();
      document.getElementById('scholarshipId').value = '';
      new bootstrap.Modal(document.getElementById('scholarshipModal')).show();
    });
  }

  const saveBtn = document.getElementById('saveScholarshipBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveScholarship);
  }
}

async function saveScholarship() {
  const id = document.getElementById('scholarshipId').value;
  const data = {
    title: document.getElementById('schTitle').value.trim(),
    description: document.getElementById('schDescription').value.trim(),
    eligibility: document.getElementById('schEligibility').value.trim(),
    amount: parseFloat(document.getElementById('schAmount').value),
    deadline: document.getElementById('schDeadline').value,
    requiredDocuments: document.getElementById('schDocs').value
      .split(',').map(d => d.trim()).filter(d => d)
  };

  if (!data.title || !data.description || !data.eligibility || !data.amount || !data.deadline) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  try {
    if (id) {
      await apiCall(`/scholarships/${id}`, 'PUT', data);
      showToast('Scholarship updated successfully!', 'success');
    } else {
      await apiCall('/scholarships', 'POST', data);
      showToast('Scholarship created successfully!', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('scholarshipModal')).hide();
    loadAdminScholarships(adminSchPage);
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editScholarship(id) {
  try {
    const s = await apiCall(`/scholarships/${id}`);
    document.getElementById('scholarshipModalTitle').textContent = 'Edit Scholarship';
    document.getElementById('scholarshipId').value = s._id;
    document.getElementById('schTitle').value = s.title;
    document.getElementById('schDescription').value = s.description;
    document.getElementById('schEligibility').value = s.eligibility;
    document.getElementById('schAmount').value = s.amount;
    document.getElementById('schDeadline').value = s.deadline ? s.deadline.substring(0, 10) : '';
    document.getElementById('schDocs').value = s.requiredDocuments ? s.requiredDocuments.join(', ') : '';

    new bootstrap.Modal(document.getElementById('scholarshipModal')).show();
  } catch (error) {
    showToast('Failed to load scholarship details', 'error');
  }
}

async function deleteScholarship(id) {
  if (!confirm('Are you sure you want to delete this scholarship?')) return;

  try {
    await apiCall(`/scholarships/${id}`, 'DELETE');
    showToast('Scholarship deleted', 'success');
    loadAdminScholarships(adminSchPage);
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================
// Application Review
// ============================================

let adminAppPage = 1;
let adminAppStatus = '';

async function loadAdminApplications(page = 1) {
  adminAppPage = page;
  try {
    let url = `/applications?page=${page}&limit=10`;
    if (adminAppStatus) url += `&status=${adminAppStatus}`;

    const data = await apiCall(url);
    const tbody = document.getElementById('adminApplicationsBody');

    if (!data.applications || data.applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No applications found</td></tr>';
      return;
    }

    tbody.innerHTML = data.applications.map(app => `
      <tr>
        <td>
          <div class="fw-medium">${app.studentId ? app.studentId.name : 'N/A'}</div>
          <div class="small text-muted">${app.studentId ? app.studentId.email : ''}</div>
        </td>
        <td>${app.scholarshipId ? app.scholarshipId.title : 'N/A'}</td>
        <td>${formatDate(app.appliedAt)}</td>
        <td>
          ${app.documents && app.documents.length > 0 ?
            app.documents.map((d, i) => `<a href="${d}" target="_blank" class="small me-1" title="Document ${i+1}"><i class="bi bi-file-earmark-pdf"></i></a>`).join('') :
            '<span class="text-muted small">None</span>'
          }
        </td>
        <td>${getStatusBadge(app.status)}</td>
        <td>
          ${app.status === 'Pending' ? `
            <button class="btn btn-sm btn-accent me-1" onclick="openStatusModal('${app._id}', 'Approved')">
              <i class="bi bi-check-lg"></i>
            </button>
            <button class="btn btn-sm btn-outline-custom text-danger" onclick="openStatusModal('${app._id}', 'Rejected')">
              <i class="bi bi-x-lg"></i>
            </button>
          ` : `
            <span class="small text-muted">${app.remarks || 'No remarks'}</span>
          `}
        </td>
      </tr>
    `).join('');

    renderPagination('adminApplicationPagination', data.page, data.pages, loadAdminApplications);
  } catch (error) {
    showToast('Failed to load applications', 'error');
  }
}

function setupStatusFilter() {
  const filter = document.getElementById('statusFilter');
  if (filter) {
    filter.addEventListener('change', () => {
      adminAppStatus = filter.value;
      loadAdminApplications(1);
    });
  }
}

function openStatusModal(appId, status) {
  document.getElementById('remarkAppId').value = appId;
  document.getElementById('remarkStatus').value = status;
  document.getElementById('remarkStatusDisplay').innerHTML = getStatusBadge(status);
  document.getElementById('remarkText').value = '';
  new bootstrap.Modal(document.getElementById('remarksModal')).show();
}

function setupRemarksModal() {
  const confirmBtn = document.getElementById('confirmStatusBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const appId = document.getElementById('remarkAppId').value;
      const status = document.getElementById('remarkStatus').value;
      const remarks = document.getElementById('remarkText').value.trim();

      confirmBtn.disabled = true;

      try {
        await apiCall(`/applications/${appId}/status`, 'PUT', { status, remarks });
        showToast(`Application ${status.toLowerCase()} successfully!`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('remarksModal')).hide();
        loadAdminApplications(adminAppPage);
        loadAdminDashboard();
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        confirmBtn.disabled = false;
      }
    });
  }
}

// ============================================
// Student Management
// ============================================

let adminStudPage = 1;
let adminStudSearch = '';

async function loadAdminStudents(page = 1) {
  adminStudPage = page;
  try {
    const data = await apiCall(`/students?page=${page}&limit=10&search=${encodeURIComponent(adminStudSearch)}`);
    const tbody = document.getElementById('adminStudentsBody');

    if (!data.students || data.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No students found</td></tr>';
      return;
    }

    tbody.innerHTML = data.students.map(s => `
      <tr>
        <td class="fw-medium">${s.name}</td>
        <td>${s.email}</td>
        <td>${s.phone || '—'}</td>
        <td>${formatDate(s.createdAt)}</td>
      </tr>
    `).join('');

    renderPagination('adminStudentPagination', data.page, data.pages, loadAdminStudents);
  } catch (error) {
    showToast('Failed to load students', 'error');
  }
}

function setupStudentSearch() {
  const input = document.getElementById('studentSearch');
  if (!input) return;
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      adminStudSearch = input.value.trim();
      loadAdminStudents(1);
    }, 400);
  });
}
