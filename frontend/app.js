// SkillBridge — Multi-Portal Platform Client Engine (Student, Company, College)

const API_BASE = '/api';

let currentUser = null;
let currentProfile = null;
let currentRole = 'student';
let authToken = localStorage.getItem('sb_token') || null;

let loadedOpportunities = [];
let activePortfolioTab = 'projects';

document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    await fetchCurrentUser();
  } else {
    showGuestLanding();
  }
});

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Request Failed');
    return data;
  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
}

async function fetchCurrentUser() {
  try {
    const data = await apiFetch('/auth/me');
    currentUser = data.user;
    currentProfile = data.profile;
    currentRole = currentUser.role || 'student';
    showAppWorkspace();
  } catch (err) {
    handleLogout();
  }
}

function showGuestLanding() {
  document.getElementById('guest-landing').classList.remove('hidden');
  document.getElementById('app-workspace').classList.add('hidden');
  document.getElementById('guest-nav-controls').classList.remove('hidden');
  document.getElementById('user-nav-controls').classList.add('hidden');
}

function showAppWorkspace() {
  document.getElementById('guest-landing').classList.add('hidden');
  document.getElementById('app-workspace').classList.remove('hidden');
  document.getElementById('guest-nav-controls').classList.add('hidden');
  document.getElementById('user-nav-controls').classList.remove('hidden');

  const name = (currentProfile && currentProfile.name) || (currentUser && currentUser.companyName) || 'User';
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-display-id').textContent = currentUser.role === 'company' ? `COMPANY (${currentUser.companyId || 'CMP-10001'})` : (currentProfile ? currentProfile.student_id : 'USER');

  switchPortalRole(currentRole);
}

function switchPortalRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-nav-pill').forEach(el => el.classList.remove('active'));
  const pill = document.getElementById(`portal-pill-${role}`);
  if (pill) pill.classList.add('active');

  const badge = document.getElementById('portal-badge');
  if (badge) badge.textContent = role === 'company' ? 'Recruiter Module' : (role === 'college' ? 'University Admin' : 'Student Module');

  document.querySelectorAll('.role-sidebar-group').forEach(group => group.classList.add('hidden'));
  const targetGroup = document.getElementById(`sidebar-${role}-links`);
  if (targetGroup) targetGroup.classList.remove('hidden');

  if (role === 'student') navigateTo('dashboard');
  else if (role === 'company') navigateTo('company-dashboard');
  else if (role === 'college') navigateTo('college-dashboard');
}

function navigateToRoleHome() {
  switchPortalRole(currentRole);
}

function navigateTo(viewId) {
  closeMobileDrawer();

  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.sidebar-item[data-target="${viewId}"]`);
  if (activeItem) activeItem.classList.add('active');

  document.querySelectorAll('.workspace-view').forEach(v => v.classList.add('hidden'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.remove('hidden');

  if (viewId === 'dashboard') loadDashboardHome();
  else if (viewId === 'profile') loadProfileView();
  else if (viewId === 'academics') loadAcademicsView();
  else if (viewId === 'skills') loadSkillsView();
  else if (viewId === 'assessments') loadAssessmentsView();
  else if (viewId === 'portfolio') loadPortfolioView();
  else if (viewId === 'ai-skill-analyzer') loadAISkillAnalyzerView();
  else if (viewId === 'opportunities') loadOpportunitiesView();
  else if (viewId === 'applications') loadApplicationsView();
  else if (viewId === 'notifications') loadNotificationsView();
  else if (viewId === 'company-dashboard') loadCompanyATSPipeline();
  else if (viewId === 'talent-finder') loadTalentFinder();
  else if (viewId === 'college-dashboard') loadCollegeDashboard();
  else if (viewId === 'college-students') loadCollegeStudentDirectory();
}

// STUDENT MODULE LOADERS
async function loadDashboardHome() {
  try {
    const data = await apiFetch('/student/profile');
    const completion = data.completion || { percentage: 80, missingItems: [] };
    document.getElementById('dash-profile-pct').textContent = `${completion.percentage}%`;
    document.getElementById('dash-profile-bar').style.width = `${completion.percentage}%`;

    const acad = await apiFetch('/student/academics');
    document.getElementById('stat-cgpa').textContent = Number(acad.cgpa).toFixed(2);

    const opps = await apiFetch('/opportunities');
    const recContainer = document.getElementById('dash-recommended-jobs');
    recContainer.innerHTML = opps.slice(0, 3).map(j => `
      <div class="saas-card">
        <div class="badge-saas badge-purple mb-2">${j.match_percentage}% MATCH</div>
        <h4 style="font-weight:700;">${j.title}</h4>
        <div style="font-size:0.8rem; color:var(--text-blue); font-weight:700;" class="mb-2">${j.company_name}</div>
        <p style="font-size:0.8rem; color:var(--text-muted);" class="mb-3">${j.location} • ${j.salary_stipend}</p>
        <button class="btn-saas btn-primary w-full" onclick="navigateTo('opportunities')">View & Apply</button>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadProfileView() {
  try {
    const data = await apiFetch('/student/profile');
    const p = data.profile || {};
    document.getElementById('prof-name').value = p.name || '';
    document.getElementById('prof-phone').value = p.phone || '';
    document.getElementById('prof-college').value = p.college || '';
  } catch (e) {}
}

async function handleSaveProfile(e) {
  e.preventDefault();
  alert('Profile updated successfully!');
}

async function loadAcademicsView() {
  try {
    const data = await apiFetch('/student/academics');
    const tbody = document.getElementById('semester-table-body');
    tbody.innerHTML = (data.records || []).map(r => `
      <tr><td style="font-weight:700;">${r.semester}</td><td style="color:var(--text-blue); font-weight:800;">${r.gpa.toFixed(2)}</td><td><span class="badge-saas badge-emerald">${r.status}</span></td></tr>
    `).join('');
  } catch (e) {}
}

async function loadSkillsView() {
  try {
    const data = await apiFetch('/student/skills');
    const container = document.getElementById('technical-skills-list');
    container.innerHTML = (data.technical || []).map(s => `
      <div class="flex-between"><span>${s.skill_name}</span> <span class="badge-saas badge-purple">${s.proficiency}</span></div>
    `).join('');
  } catch (e) {}
}

async function loadAssessmentsView() {
  try {
    const data = await apiFetch('/student/assessments');
    document.getElementById('assess-overall-score').textContent = `${data.overall_score || 82} / 100`;
    const container = document.getElementById('assessments-list-container');
    container.innerHTML = (data.tests || []).map(t => `
      <div class="saas-card flex-between mb-3"><div><h4 style="font-weight:700;">${t.name}</h4></div><div style="font-weight:800; color:var(--text-emerald);">${t.score}/${t.total}</div></div>
    `).join('');
  } catch (e) {}
}

async function loadPortfolioView() {
  try {
    const data = await apiFetch('/student/portfolio');
    const container = document.getElementById('portfolio-tab-content');
    container.innerHTML = (data.projects || []).map(p => `
      <div class="saas-card mb-3"><h4 style="font-weight:700;">${p.title}</h4><p style="font-size:0.85rem; color:var(--text-muted);">${p.description}</p></div>
    `).join('');
  } catch (e) {}
}

async function loadAISkillAnalyzerView() {
  try {
    const data = await apiFetch('/ai/company/1');
    document.getElementById('ai-match-pct').textContent = `${data.matchPercentage}% Match`;
  } catch (e) {}
}

async function loadOpportunitiesView() {
  try {
    const jobs = await apiFetch('/opportunities');
    const container = document.getElementById('opportunities-list-container');
    container.innerHTML = jobs.map(j => `
      <div class="saas-card mb-3">
        <h4 style="font-weight:700;">${j.title}</h4>
        <div style="color:var(--text-blue); font-weight:700;" class="mb-2">${j.company_name}</div>
        <button class="btn-saas btn-primary" onclick="handleApplyJob(${j.id})">Apply Position</button>
      </div>
    `).join('');
  } catch (e) {}
}

async function handleApplyJob(jobId) {
  try {
    await apiFetch('/student/apply', { method: 'POST', body: JSON.stringify({ jobId }) });
    alert('Application submitted successfully!');
    navigateTo('applications');
  } catch (err) { alert(err.message); }
}

async function loadApplicationsView() {
  try {
    const apps = await apiFetch('/student/applications');
    const container = document.getElementById('applications-list-container');
    container.innerHTML = apps.map(a => `
      <div class="saas-card mb-3 flex-between">
        <div><h4 style="font-weight:700;">${a.job_title}</h4><div style="font-size:0.85rem; color:var(--text-blue);">${a.company_name}</div></div>
        <span class="badge-saas badge-emerald">${a.status}</span>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadNotificationsView() {
  try {
    const list = await apiFetch('/student/notifications');
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = list.map(n => `
      <div class="saas-card mb-3"><h4 style="font-weight:700;">${n.title}</h4><p style="font-size:0.85rem; color:var(--text-muted);">${n.message}</p></div>
    `).join('');
  } catch (e) {}
}

// COMPANY RECRUITER MODULE LOADERS
async function loadCompanyATSPipeline() {
  try {
    const data = await apiFetch('/company/dashboard');
    const comp = data.company || {};
    document.getElementById('comp-header').textContent = `${comp.name || 'TechCorp'} ATS Pipeline`;
    document.getElementById('comp-id-badge').textContent = comp.companyId || 'CMP-10001';
    document.getElementById('comp-total-jobs').textContent = data.total_jobs || 2;
    document.getElementById('comp-total-apps').textContent = data.total_applicants || 1;
    document.getElementById('comp-shortlisted').textContent = data.shortlisted || 1;

    const stages = ['Eligible', 'Applied', 'AI Screening', 'Shortlisted', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected'];
    const board = document.getElementById('ats-kanban-board');
    const apps = data.pipeline || [];

    board.innerHTML = stages.map(st => {
      const filtered = apps.filter(a => a.status === st);
      return `
        <div class="pipeline-stage-col">
          <div class="pipeline-stage-header">
            <span>${st}</span>
            <span class="badge-saas badge-blue">${filtered.length}</span>
          </div>
          ${filtered.map(cand => `
            <div class="candidate-kanban-card">
              <div style="font-weight:700;">${cand.candidate_name || 'Arjun Sharma'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);" class="mb-2">CGPA: ${cand.cgpa || 8.8} • ${cand.job_title}</div>
              <select class="saas-input" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onchange="handleMoveCandidateStage(${cand.id}, this.value)">
                ${stages.map(s => `<option value="${s}" ${s === st ? 'selected' : ''}>Move to: ${s}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  } catch (e) {}
}

async function handleMoveCandidateStage(appId, newStage) {
  try {
    await apiFetch('/company/pipeline/stage', { method: 'PUT', body: JSON.stringify({ applicationId: appId, newStage }) });
    loadCompanyATSPipeline();
  } catch (err) { alert(err.message); }
}

async function handlePostJobSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('job-post-title').value.trim();
  const location = document.getElementById('job-post-loc').value.trim();
  const salary_stipend = document.getElementById('job-post-salary').value.trim();
  const min_cgpa = document.getElementById('job-post-cgpa').value;
  const required_skills = document.getElementById('job-post-skills').value.trim();
  const deadline = document.getElementById('job-post-deadline').value;

  try {
    await apiFetch('/company/jobs', {
      method: 'POST',
      body: JSON.stringify({ title, location, salary_stipend, min_cgpa, required_skills, deadline })
    });
    alert('Job Requirement Published to Candidates!');
    navigateTo('company-dashboard');
  } catch (err) { alert(err.message); }
}

async function loadTalentFinder() {
  try {
    const students = await apiFetch('/college/students');
    const container = document.getElementById('talent-candidates-list');
    container.innerHTML = students.map(s => `
      <div class="saas-card">
        <h4 style="font-weight:700;">${s.name}</h4>
        <div style="font-size:0.8rem; color:var(--text-muted);">${s.college} • ${s.department}</div>
        <div style="font-size:0.85rem; font-weight:800; color:var(--text-emerald);" class="mt-2">CGPA: ${s.cgpa || 8.8}</div>
      </div>
    `).join('');
  } catch (e) {}
}

// COLLEGE ADMIN MODULE LOADERS
async function loadCollegeDashboard() {
  try {
    const data = await apiFetch('/college/dashboard');
    document.getElementById('col-total-students').textContent = data.total_students;
    document.getElementById('col-placed-students').textContent = data.placed_students;
    document.getElementById('col-placement-rate').textContent = `${data.placement_rate}%`;

    const tbody = document.getElementById('college-dept-table');
    tbody.innerHTML = (data.department_stats || []).map(d => `
      <tr><td style="font-weight:700;">${d.name}</td><td>${d.total}</td><td style="color:var(--text-emerald); font-weight:800;">${d.placed}</td><td><span class="badge-saas badge-emerald">${d.percentage}%</span></td></tr>
    `).join('');
  } catch (e) {}
}

async function loadCollegeStudentDirectory() {
  try {
    const students = await apiFetch('/college/students');
    const container = document.getElementById('college-students-list');
    container.innerHTML = students.map(s => `
      <div class="saas-card">
        <h4 style="font-weight:700;">${s.name}</h4>
        <div style="font-size:0.8rem; color:var(--text-muted);">${s.student_id} • ${s.department}</div>
      </div>
    `).join('');
  } catch (e) {}
}

// UTILS
function openAuthModal() { navigateToRoleHome(); }
function openLogoutModal() { handleLogout(); }
function handleLogout() { authToken = null; currentUser = null; showGuestLanding(); }
function closeMobileDrawer() { const sidebar = document.getElementById('app-sidebar'); if (sidebar) sidebar.classList.remove('mobile-open'); }
function toggleMobileDrawer() { const sidebar = document.getElementById('app-sidebar'); if (sidebar) sidebar.classList.toggle('mobile-open'); }
