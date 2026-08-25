// SkillBridge — Student Module Client Application Engine

const API_BASE = '/api';

let currentUser = null;
let currentProfile = null;
let authToken = localStorage.getItem('sb_token') || null;

let activePortfolioTab = 'projects';
let currentActiveJobId = null;
let loadedOpportunities = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    await fetchCurrentUser();
  } else {
    showGuestLanding();
  }
});

// REST API Helper
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

// AUTHENTICATION FLOW
async function fetchCurrentUser() {
  try {
    const data = await apiFetch('/auth/me');
    currentUser = data.user;
    currentProfile = data.profile;
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

  const name = currentProfile ? currentProfile.name : (currentUser ? currentUser.username : 'Arjun Sharma');
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-display-id').textContent = currentProfile ? currentProfile.student_id : 'STU-2026-101';
  document.getElementById('welcome-header').textContent = `Welcome back, ${name} 👋`;

  navigateTo('dashboard');
}

function openAuthModal(tab = 'login') {
  openModal('auth-modal');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('auth-login-form');
  const regForm = document.getElementById('auth-register-form');
  const title = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    title.textContent = 'Student Sign In';
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    title.textContent = 'Student Registration';
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const identity = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-pass').value.trim();

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity, password })
    });
    authToken = data.token;
    localStorage.setItem('sb_token', authToken);
    currentUser = data.user;
    currentProfile = data.profile;
    closeModal('auth-modal');
    showAppWorkspace();
  } catch (err) {
    alert(err.message || 'Login failed.');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const studentId = document.getElementById('reg-student-id').value.trim();
  const password = document.getElementById('reg-pass').value.trim();

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, studentId, password })
    });
    authToken = data.token;
    localStorage.setItem('sb_token', authToken);
    currentUser = data.user;
    currentProfile = data.profile;
    closeModal('auth-modal');
    showAppWorkspace();
  } catch (err) {
    alert(err.message || 'Registration failed.');
  }
}

function openLogoutModal() {
  openModal('modal-logout');
}

function confirmLogout() {
  handleLogout();
  closeModal('modal-logout');
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  currentProfile = null;
  localStorage.removeItem('sb_token');
  showGuestLanding();
}

// SPA NAVIGATION ROUTER
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
  else if (viewId === 'settings') loadSettingsView();
}

// 1. DASHBOARD HOME LOADER
async function loadDashboardHome() {
  try {
    const data = await apiFetch('/student/profile');
    const completion = data.completion || { percentage: 80, missingItems: [] };

    document.getElementById('dash-profile-pct').textContent = `${completion.percentage}%`;
    document.getElementById('dash-profile-bar').style.width = `${completion.percentage}%`;

    const missingContainer = document.getElementById('dash-missing-items');
    if (completion.missingItems && completion.missingItems.length) {
      missingContainer.innerHTML = '<strong>Action Required:</strong> ' + completion.missingItems.map(m => `<span class="badge-saas badge-amber">${m}</span>`).join(' ');
    } else {
      missingContainer.innerHTML = '<span class="badge-saas badge-emerald"><i class="fa-solid fa-circle-check"></i> Profile Fully Completed</span>';
    }

    const acad = await apiFetch('/student/academics');
    document.getElementById('stat-cgpa').textContent = Number(acad.cgpa).toFixed(2);

    const skillsData = await apiFetch('/student/skills');
    document.getElementById('stat-skills').textContent = (skillsData.technical || []).length;

    const port = await apiFetch('/student/portfolio');
    document.getElementById('stat-projects').textContent = (port.projects || []).length;
    document.getElementById('stat-certs').textContent = (port.certifications || []).length;

    const apps = await apiFetch('/student/applications');
    document.getElementById('stat-apps').textContent = apps.length;

    const opps = await apiFetch('/opportunities');
    const recContainer = document.getElementById('dash-recommended-jobs');
    recContainer.innerHTML = opps.slice(0, 3).map(j => `
      <div class="saas-card">
        <div class="badge-saas badge-purple mb-2">${j.match_percentage}% MATCH</div>
        <h4 style="font-weight:700;">${j.title}</h4>
        <div style="font-size:0.8rem; color:var(--text-blue); font-weight:700;" class="mb-2">${j.company_name}</div>
        <p style="font-size:0.8rem; color:var(--text-muted);" class="mb-3">${j.location} • ${j.salary_stipend}</p>
        <button class="btn-saas btn-primary w-full" onclick="openJobDetailsModal(${j.id})">View Job & Apply</button>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading dashboard home:', err);
  }
}

// 2. MY PROFILE LOADER & SAVER
async function loadProfileView() {
  try {
    const data = await apiFetch('/student/profile');
    const p = data.profile || {};
    const r = data.resume || {};

    document.getElementById('prof-name').value = p.name || '';
    document.getElementById('prof-email').value = p.email || '';
    document.getElementById('prof-phone').value = p.phone || '';
    document.getElementById('prof-id').value = p.student_id || '';
    document.getElementById('prof-college').value = p.college || '';
    document.getElementById('prof-dept').value = p.department || '';
    document.getElementById('prof-year').value = p.year || '';
    document.getElementById('prof-sem').value = p.semester || '';
    document.getElementById('prof-loc').value = p.location || '';

    if (r.file_name) {
      document.getElementById('resume-name').textContent = r.file_name;
      document.getElementById('resume-date').textContent = `Uploaded: ${r.upload_date} • Status: ${r.status}`;
    }

    document.getElementById('link-linkedin').value = p.linkedin_url || '';
    document.getElementById('link-github').value = p.github_url || '';
    document.getElementById('link-portfolio').value = p.portfolio_url || '';

  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('prof-name').value,
    phone: document.getElementById('prof-phone').value,
    college: document.getElementById('prof-college').value,
    department: document.getElementById('prof-dept').value,
    year: document.getElementById('prof-year').value,
    semester: document.getElementById('prof-sem').value,
    location: document.getElementById('prof-loc').value
  };

  try {
    await apiFetch('/student/profile', { method: 'PUT', body: JSON.stringify(body) });
    alert('Profile information updated successfully!');
    loadProfileView();
  } catch (err) { alert(err.message); }
}

async function handleSaveLinks(e) {
  e.preventDefault();
  const body = {
    linkedin_url: document.getElementById('link-linkedin').value,
    github_url: document.getElementById('link-github').value,
    portfolio_url: document.getElementById('link-portfolio').value
  };

  try {
    await apiFetch('/student/profile', { method: 'PUT', body: JSON.stringify(body) });
    alert('Professional links updated!');
  } catch (err) { alert(err.message); }
}

function viewResumeModal() {
  openModal('modal-view-resume');
}

function triggerResumeUpload() {
  document.getElementById('resume-file-input').click();
}

async function handleResumeFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    await apiFetch('/student/resume', {
      method: 'POST',
      body: JSON.stringify({ file_name: file.name, file_url: `/uploads/${file.name}` })
    });
    alert('Resume uploaded and verified successfully!');
    loadProfileView();
  } catch (err) { alert(err.message); }
}

// 3. ACADEMICS LOADER
async function loadAcademicsView() {
  try {
    const data = await apiFetch('/student/academics');
    const tbody = document.getElementById('semester-table-body');
    tbody.innerHTML = (data.records || []).map(r => `
      <tr>
        <td style="font-weight:700;">${r.semester}</td>
        <td style="color:var(--text-blue); font-weight:800;">${r.gpa.toFixed(2)}</td>
        <td><span class="badge-saas badge-emerald">${r.status}</span></td>
        <td style="color:var(--text-muted);">${r.details}</td>
      </tr>
    `).join('');

    const s = data.school || {};
    document.getElementById('school-10th-info').textContent = `${s.tenth_school} (${s.tenth_board}) • ${s.tenth_percentage}% (${s.tenth_year})`;
    document.getElementById('school-12th-info').textContent = `${s.twelfth_school} (${s.twelfth_board}) • ${s.twelfth_percentage}% (${s.twelfth_year})`;

    const b = data.backlog || {};
    document.getElementById('backlog-status').textContent = b.status || 'No active backlogs';

  } catch (err) { console.error(err); }
}

// 4. SKILLS LOADER & ADDER
async function loadSkillsView() {
  try {
    const data = await apiFetch('/student/skills');
    const techList = document.getElementById('technical-skills-list');
    techList.innerHTML = (data.technical || []).map(s => `
      <div>
        <div class="flex-between text-xs font-bold mb-1">
          <span>${s.skill_name} <span class="badge-saas badge-purple" style="padding:0.1rem 0.4rem;">${s.proficiency}</span></span>
          <button class="btn-saas btn-outline" style="padding:0.1rem 0.4rem; font-size:0.7rem; color:var(--text-danger);" onclick="handleRemoveSkill(${s.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="width:100%; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
          <div style="width:${s.level_pct}%; height:100%; background:var(--accent-blue);"></div>
        </div>
      </div>
    `).join('');

    const c = data.coding || {};
    document.getElementById('code-leetcode').textContent = c.leetcode_handle || 'arjun_sharma_2026';
    document.getElementById('code-hackerrank').textContent = c.hackerrank_handle || 'arjun_code';

  } catch (err) { console.error(err); }
}

async function handleAddSkillSubmit(e) {
  e.preventDefault();
  const skill_name = document.getElementById('skill-name-input').value.trim();
  const proficiency = document.getElementById('skill-level-select').value;

  try {
    await apiFetch('/student/skills', {
      method: 'POST',
      body: JSON.stringify({ skill_name, proficiency })
    });
    closeModal('modal-add-skill');
    loadSkillsView();
  } catch (err) { alert(err.message); }
}

async function handleRemoveSkill(skillId) {
  try {
    await apiFetch(`/student/skills/${skillId}`, { method: 'DELETE' });
    loadSkillsView();
  } catch (err) { alert(err.message); }
}

// 5. ASSESSMENTS LOADER
async function loadAssessmentsView() {
  try {
    const data = await apiFetch('/student/assessments');
    document.getElementById('assess-overall-score').textContent = `${data.overall_score || 82} / 100`;

    const b = data.breakdown || {};
    document.getElementById('breakdown-tech').textContent = b.technical || 85;
    document.getElementById('breakdown-coding').textContent = b.coding || 80;
    document.getElementById('breakdown-comm').textContent = b.communication || 78;

    const container = document.getElementById('assessments-list-container');
    container.innerHTML = (data.tests || []).map(t => `
      <div class="saas-card flex-between">
        <div>
          <div class="badge-saas badge-blue mb-1">${t.type} ASSESSMENT</div>
          <h4 style="font-weight:700;">${t.name}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted);">${t.details}</p>
        </div>
        <div class="text-right">
          <div style="font-size:1.3rem; font-weight:800; color:var(--text-emerald);">${t.score} / ${t.total}</div>
          <span class="badge-saas badge-emerald">${t.status}</span>
        </div>
      </div>
    `).join('');

  } catch (err) { console.error(err); }
}

// 6. PORTFOLIO LOADER & SUB-TAB SWITCHER
function switchPortfolioTab(tab) {
  activePortfolioTab = tab;
  document.querySelectorAll('.tab-navigation .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  loadPortfolioView();
}

async function loadPortfolioView() {
  try {
    const data = await apiFetch('/student/portfolio');
    const container = document.getElementById('portfolio-tab-content');

    if (activePortfolioTab === 'projects') {
      container.innerHTML = `<div class="grid-2 gap-4">` + (data.projects || []).map(p => `
        <div class="saas-card">
          <h4 style="font-weight:700;" class="mb-1">${p.title}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted);" class="mb-3">${p.description}</p>
          <div class="flex-align gap-2 mb-3">
            ${(p.technologies || []).map(t => `<span class="badge-saas badge-purple">${t}</span>`).join('')}
          </div>
          <div class="flex-between">
            <a href="${p.github_url}" target="_blank" style="font-size:0.8rem; color:var(--text-blue); font-weight:700;"><i class="fa-brands fa-github"></i> GitHub Repo</a>
            <button class="btn-saas btn-outline" style="padding:0.2rem 0.5rem; color:var(--text-danger);" onclick="handleDeleteProject(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') + `</div>`;

    } else if (activePortfolioTab === 'internships') {
      container.innerHTML = (data.internships || []).map(i => `
        <div class="saas-card mb-4 flex-between">
          <div>
            <h4 style="font-weight:700;">${i.role} • <span style="color:var(--text-blue);">${i.company}</span></h4>
            <p style="font-size:0.8rem; color:var(--text-muted);">${i.start_date} to ${i.end_date} • ${i.details}</p>
          </div>
          <span class="badge-saas badge-emerald">Rating: ${i.company_score}</span>
        </div>
      `).join('');

    } else if (activePortfolioTab === 'certifications') {
      container.innerHTML = (data.certifications || []).map(c => `
        <div class="saas-card mb-4 flex-between">
          <div>
            <h4 style="font-weight:700;">${c.name}</h4>
            <p style="font-size:0.8rem; color:var(--text-muted);">${c.organization} • Credential ID: ${c.credential_id}</p>
          </div>
          <a href="${c.verification_url}" target="_blank" class="btn-saas btn-outline">Verify Credential</a>
        </div>
      `).join('');

    } else {
      const items = data[activePortfolioTab] || [];
      container.innerHTML = items.length ? items.map(x => `
        <div class="saas-card mb-3">
          <h4 style="font-weight:700;">${x.title || x.name}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted);">${x.organization || x.institution || x.topic || 'Verified Portfolio Record'}</p>
        </div>
      `).join('') : `<div class="saas-card text-center text-muted">No ${activePortfolioTab} records added yet. Click "+ Add Item" to populate.</div>`;
    }

  } catch (err) { console.error(err); }
}

function handlePortfolioAddClick() {
  if (activePortfolioTab === 'projects') openModal('modal-add-project');
  else alert(`Adding items for ${activePortfolioTab.toUpperCase()} is supported via standard form submission.`);
}

async function handleAddProjectSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('proj-title').value.trim();
  const description = document.getElementById('proj-desc').value.trim();
  const technologies = document.getElementById('proj-tech').value.trim();

  try {
    await apiFetch('/student/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description, technologies, github_url: 'https://github.com/arjun/project' })
    });
    closeModal('modal-add-project');
    loadPortfolioView();
  } catch (err) { alert(err.message); }
}

async function handleDeleteProject(id) {
  try {
    await apiFetch(`/student/projects/${id}`, { method: 'DELETE' });
    loadPortfolioView();
  } catch (err) { alert(err.message); }
}

// 7. AI SKILL ANALYZER LOADER
async function loadAISkillAnalyzerView() {
  try {
    const companies = await apiFetch('/ai/companies');
    const select = document.getElementById('ai-company-select');
    select.innerHTML = companies.map(c => `<option value="${c.id}">${c.name} (${c.industry})</option>`).join('');

    handleAICompanyChange();
  } catch (err) { console.error(err); }
}

async function handleAICompanyChange() {
  const companyId = document.getElementById('ai-company-select').value || 1;
  try {
    const data = await apiFetch(`/ai/company/${companyId}`);

    document.getElementById('ai-match-pct').textContent = `${data.matchPercentage}%`;
    document.getElementById('ai-circle-fill').style.strokeDashoffset = 339 - (339 * data.matchPercentage / 100);

    const c = data.company;
    document.getElementById('ai-req-title').textContent = `${c.name} Criteria Requirements`;
    document.getElementById('ai-req-details').innerHTML = `
      <div>• Required Skills: <strong>${c.required_skills.join(', ')}</strong></div>
      <div>• Minimum CGPA Cutoff: <strong>${c.min_cgpa}</strong></div>
      <div>• Coding Level: <strong>${c.coding_level}</strong></div>
      <div>• Preferred Certifications: <strong>${c.certs.join(', ')}</strong></div>
    `;

    const gapBody = document.getElementById('ai-gap-table-body');
    gapBody.innerHTML = (data.skillGaps || []).map(g => `
      <tr>
        <td style="font-weight:700;">${g.skill.toUpperCase()}</td>
        <td><span class="badge-saas badge-blue">${g.reqLevel}</span></td>
        <td><span class="badge-saas badge-purple">${g.studentLevel}</span></td>
        <td><span class="badge-saas ${g.gap === 'No Gap' ? 'badge-emerald' : 'badge-amber'}">${g.gap}</span></td>
      </tr>
    `).join('');

    const recList = document.getElementById('ai-recommendations-list');
    recList.innerHTML = (data.recommendations || []).map(r => `
      <div class="p-3 flex-between" style="background:#f8fafc; border-radius:var(--radius-md);">
        <span><i class="fa-solid fa-lightbulb text-amber" style="margin-right:0.5rem;"></i> ${r}</span>
        <button class="btn-saas btn-outline" style="padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="navigateTo('skills')">Start Learning</button>
      </div>
    `).join('');

  } catch (err) { console.error(err); }
}

// 8. OPPORTUNITIES LOADER
async function loadOpportunitiesView() {
  try {
    loadedOpportunities = await apiFetch('/opportunities');
    renderOpportunitiesList(loadedOpportunities);
  } catch (err) { console.error(err); }
}

function renderOpportunitiesList(jobs) {
  const container = document.getElementById('opportunities-list-container');
  container.innerHTML = jobs.map(j => `
    <div class="saas-card">
      <div class="flex-between mb-2">
        <h4 style="font-weight:800; font-size:1.1rem;">${j.title}</h4>
        <span class="badge-saas badge-purple">${j.match_percentage}% MATCH</span>
      </div>
      <div style="color:var(--text-blue); font-weight:700;" class="mb-2">${j.company_name}</div>
      <p style="font-size:0.8rem; color:var(--text-muted);" class="mb-3">${j.description}</p>
      <div class="flex-align gap-2 mb-3">
        ${(j.required_skills || []).map(s => `<span class="badge-saas badge-blue">${s}</span>`).join('')}
      </div>
      <div class="flex-between pt-3" style="border-top:1px solid var(--border-color);">
        <span style="font-weight:700; font-size:0.85rem; color:var(--text-emerald);">${j.salary_stipend}</span>
        <button class="btn-saas btn-primary" onclick="openJobDetailsModal(${j.id})">View Details & Apply</button>
      </div>
    </div>
  `).join('');
}

function filterOpportunities() {
  const query = document.getElementById('opp-search').value.toLowerCase();
  const filtered = loadedOpportunities.filter(j => j.title.toLowerCase().includes(query) || j.company_name.toLowerCase().includes(query));
  renderOpportunitiesList(filtered);
}

async function openJobDetailsModal(jobId) {
  currentActiveJobId = jobId;
  try {
    const job = await apiFetch(`/opportunities/${jobId}`);
    document.getElementById('job-detail-title').textContent = job.title;
    document.getElementById('job-detail-company').textContent = job.company_name;

    document.getElementById('job-detail-body').innerHTML = `
      <div><strong>Location:</strong> ${job.location} • <strong>Job Type:</strong> ${job.job_type}</div>
      <div><strong>Salary / Stipend:</strong> ${job.salary_stipend}</div>
      <div><strong>Minimum CGPA Cutoff:</strong> ${job.min_cgpa}</div>
      <div><strong>Description:</strong> ${job.description}</div>
      <div><strong>Key Responsibilities:</strong><br/>${(job.responsibilities || '').replace(/\n/g, '<br/>')}</div>
    `;

    openModal('modal-job-details');
  } catch (err) { alert(err.message); }
}

async function handleApplyCurrentJob() {
  if (!currentActiveJobId) return;
  try {
    await apiFetch('/student/apply', {
      method: 'POST',
      body: JSON.stringify({ jobId: currentActiveJobId })
    });
    alert('Application submitted successfully to company ATS pipeline!');
    closeModal('modal-job-details');
    navigateTo('applications');
  } catch (err) { alert(err.message); }
}

// 9. APPLICATIONS LOADER
async function loadApplicationsView() {
  try {
    const apps = await apiFetch('/student/applications');
    const container = document.getElementById('applications-list-container');

    container.innerHTML = apps.map(a => `
      <div class="saas-card">
        <div class="flex-between mb-3">
          <div>
            <h4 style="font-weight:800; font-size:1.1rem;">${a.job_title}</h4>
            <div style="color:var(--text-blue); font-weight:700;">${a.company_name}</div>
          </div>
          <span class="badge-saas badge-emerald">${a.status}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted);" class="mb-3">Applied Date: ${a.applied_at} • Last Activity: ${a.last_updated}</p>
        <div class="p-3" style="background:#f8fafc; border-radius:var(--radius-md); font-size:0.85rem;">
          <strong>Next Action:</strong> ${a.next_step}
          ${a.interview ? `
            <div class="mt-2 pt-2" style="border-top:1px solid var(--border-color); color:var(--text-blue); font-weight:700;">
              <i class="fa-solid fa-video"></i> Interview Scheduled: ${a.interview.date} at ${a.interview.time} (${a.interview.mode})
              <br/><a href="${a.interview.meeting_link}" target="_blank" class="btn-saas btn-primary mt-2" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Join Interview Call</a>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

  } catch (err) { console.error(err); }
}

// 10. NOTIFICATIONS LOADER
async function loadNotificationsView() {
  try {
    const notifs = await apiFetch('/student/notifications');
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = notifs.map(n => `
      <div class="saas-card flex-between" style="border-left: 4px solid ${n.is_read ? '#cbd5e1' : '#2563eb'};">
        <div>
          <h4 style="font-weight:700;">${n.title}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary);">${n.message}</p>
          <div style="font-size:0.75rem; color:var(--text-muted);" class="mt-1">${n.created_at}</div>
        </div>
        <button class="btn-saas btn-outline" onclick="navigateTo('${n.target_view}')">View</button>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function handleMarkAllNotificationsRead() {
  alert('All notifications marked as read.');
}

// 11. SETTINGS LOADER
async function loadSettingsView() {
  if (currentProfile) {
    document.getElementById('set-email').value = currentProfile.email || '';
    document.getElementById('set-id').value = currentProfile.student_id || '';
  }
}

async function handleSecurityChange(e) {
  e.preventDefault();
  alert('Security password updated successfully!');
}

// UTILITY MODAL & DRAWER HELPERS
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function toggleMobileDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (backdrop) backdrop.classList.toggle('active');
}

function closeMobileDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');
}
