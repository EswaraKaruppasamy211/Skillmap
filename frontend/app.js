// SkillBridge AI - Multi-Company Recruitment Platform Client Engine

const API_BASE = 'https://skillmap-89by.onrender.com/api';

let currentUser = null;
let currentProfile = null;
let authToken = localStorage.getItem('sb_token') || null;

document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    await fetchCurrentUser();
  } else {
    showLandingPage();
  }
  setupSidebarNavigation();
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
    showUserWorkspace();
  } catch (err) {
    handleLogout();
  }
}

function showLandingPage() {
  document.getElementById('guest-nav-links').classList.remove('hidden');
  document.getElementById('user-nav-controls').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('app-workspace').classList.add('hidden');
  renderMobileBottomNav('guest');
}

function showUserWorkspace() {
  document.getElementById('guest-nav-links').classList.add('hidden');
  document.getElementById('user-nav-controls').classList.remove('hidden');
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('app-workspace').classList.remove('hidden');

  const name = (currentProfile && (currentProfile.company_name || currentProfile.name)) || currentUser.companyName || currentUser.username;
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-display-role').textContent = currentUser.role === 'company' ? `COMPANY (${currentUser.companyId || 'CMP-10001'})` : currentUser.role.toUpperCase();
  document.getElementById('user-avatar').textContent = (name[0] || 'A').toUpperCase();

  setupRoleSidebar(currentUser.role);
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

function setupRoleSidebar(role) {
  document.querySelectorAll('.role-sidebar-links').forEach(el => el.classList.add('hidden'));
  if (role === 'student') {
    document.getElementById('sidebar-student-links').classList.remove('hidden');
    navigateTo('student-dashboard');
  } else if (role === 'company') {
    document.getElementById('sidebar-company-links').classList.remove('hidden');
    navigateTo('company-dashboard');
  } else if (role === 'college') {
    document.getElementById('sidebar-college-links').classList.remove('hidden');
    navigateTo('college-dashboard');
  }
  renderMobileBottomNav(role);
}

function renderMobileBottomNav(role) {
  const container = document.getElementById('mobile-bottom-nav');
  if (!container) return;

  if (role === 'student') {
    container.innerHTML = `
      <button class="mobile-nav-tab active" data-target="student-dashboard" onclick="navigateTo('student-dashboard')">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
      </button>
      <button class="mobile-nav-tab" data-target="internships" onclick="navigateTo('internships')">
        <i class="fa-solid fa-briefcase"></i>
        <span>Jobs</span>
      </button>
      <button class="mobile-nav-tab" data-target="ai-skill-score" onclick="navigateTo('ai-skill-score')">
        <i class="fa-solid fa-award"></i>
        <span>AI Score</span>
      </button>
      <button class="mobile-nav-tab" data-target="student-applications" onclick="navigateTo('student-applications')">
        <i class="fa-solid fa-envelope-open-text"></i>
        <span>Applied</span>
      </button>
      <button class="mobile-nav-tab" data-target="student-profile" onclick="navigateTo('student-profile')">
        <i class="fa-solid fa-user"></i>
        <span>Profile</span>
      </button>
    `;
  } else if (role === 'company') {
    container.innerHTML = `
      <button class="mobile-nav-tab active" data-target="company-dashboard" onclick="navigateTo('company-dashboard')">
        <i class="fa-solid fa-chart-line"></i>
        <span>ATS Pipeline</span>
      </button>
      <button class="mobile-nav-tab" data-target="company-jobs" onclick="navigateTo('company-jobs')">
        <i class="fa-solid fa-plus-circle"></i>
        <span>Add Job</span>
      </button>
      <button class="mobile-nav-tab" data-target="talent-finder" onclick="navigateTo('talent-finder')">
        <i class="fa-solid fa-user-check"></i>
        <span>Candidates</span>
      </button>
      <button class="mobile-nav-tab" onclick="handleLogout()">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
        <span>Logout</span>
      </button>
    `;
  } else if (role === 'college') {
    container.innerHTML = `
      <button class="mobile-nav-tab active" data-target="college-dashboard" onclick="navigateTo('college-dashboard')">
        <i class="fa-solid fa-graduation-cap"></i>
        <span>Analytics</span>
      </button>
      <button class="mobile-nav-tab" onclick="handleLogout()">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
        <span>Logout</span>
      </button>
    `;
  } else {
    container.innerHTML = `
      <button class="mobile-nav-tab active" onclick="showLandingPage()">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
      </button>
      <button class="mobile-nav-tab" onclick="openRoleAuthModal('student')">
        <i class="fa-solid fa-graduation-cap"></i>
        <span>Student</span>
      </button>
      <button class="mobile-nav-tab" onclick="openRoleAuthModal('company')">
        <i class="fa-solid fa-building"></i>
        <span>Company</span>
      </button>
      <button class="mobile-nav-tab" onclick="openRoleAuthModal('college')">
        <i class="fa-solid fa-university"></i>
        <span>University</span>
      </button>
    `;
  }
}

function setupSidebarNavigation() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-target');
      if (target) navigateTo(target);
    });
  });
}

function navigateTo(viewId) {
  closeMobileDrawer();

  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.sidebar-item[data-target="${viewId}"]`);
  if (activeItem) activeItem.classList.add('active');

  document.querySelectorAll('.mobile-nav-tab').forEach(el => el.classList.remove('active'));
  const activeMobileTab = document.querySelector(`.mobile-nav-tab[data-target="${viewId}"]`);
  if (activeMobileTab) activeMobileTab.classList.add('active');

  document.querySelectorAll('.workspace-view').forEach(view => view.classList.add('hidden'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.remove('hidden');

  if (viewId === 'student-dashboard') loadStudentDashboard();
  else if (viewId === 'student-profile') loadStudentProfileView();
  else if (viewId === 'student-skills') loadStudentSkills();
  else if (viewId === 'projects') loadStudentProjects();
  else if (viewId === 'certifications') loadStudentCertifications();
  else if (viewId === 'ai-skill-score') loadAISkillScoreView();
  else if (viewId === 'internships') loadStudentOpportunities();
  else if (viewId === 'student-applications') loadStudentApplications();
  else if (viewId === 'company-dashboard') loadATSKanbanPipeline();
  else if (viewId === 'talent-finder') searchCandidates();
  else if (viewId === 'college-dashboard') loadCollegeAnalytics();
}

// PORTAL AUTH SELECTION & MODAL
function openRoleAuthModal(role = 'company') {
  document.getElementById('auth-modal').classList.remove('hidden');
  selectRoleTab(role);
}

function selectRoleTab(role) {
  document.getElementById('login-role-hidden').value = role;

  const btnCompany = document.getElementById('tab-btn-company');
  const btnStudent = document.getElementById('tab-btn-student');
  const btnCollege = document.getElementById('tab-btn-college');

  btnCompany.classList.remove('btn-primary-cyber', 'active');
  btnStudent.classList.remove('btn-primary-cyber', 'active');
  btnCollege.classList.remove('btn-primary-cyber', 'active');

  const compForm = document.getElementById('company-login-form');
  const genForm = document.getElementById('login-form');

  if (role === 'company') {
    btnCompany.classList.add('btn-primary-cyber', 'active');
    compForm.classList.remove('hidden');
    genForm.classList.add('hidden');
  } else {
    genForm.classList.remove('hidden');
    compForm.classList.add('hidden');
    if (role === 'student') {
      btnStudent.classList.add('btn-primary-cyber', 'active');
      document.getElementById('login-identity').value = 'arjun_sharma';
      document.getElementById('login-password').value = 'Student@123';
    } else if (role === 'college') {
      btnCollege.classList.add('btn-primary-cyber', 'active');
      document.getElementById('login-identity').value = 'anna_univ_admin';
      document.getElementById('login-password').value = 'College@123';
    }
  }
}

// 1. COMPANY LOGIN WITH COMPANY NAME, USERNAME & PASSWORD
async function handleCompanyLogin(e) {
  e.preventDefault();
  const companyName = document.getElementById('comp-login-name').value;
  const companyUsername = document.getElementById('comp-login-username').value;
  const password = document.getElementById('comp-login-password').value;

  try {
    const data = await apiFetch('/company/login', {
      method: 'POST',
      body: JSON.stringify({ companyName, companyUsername, password })
    });

    authToken = data.token;
    localStorage.setItem('sb_token', authToken);
    closeAuthModal();
    await fetchCurrentUser();
  } catch (err) { alert(err.message || 'Company Login Failed'); }
}

// 2. COMPANY REGISTRATION WITH UNIQUE COMPANY ID
function openCompanyRegisterModal() {
  closeAuthModal();
  document.getElementById('company-register-modal').classList.remove('hidden');
}

function closeCompanyRegisterModal() {
  document.getElementById('company-register-modal').classList.add('hidden');
}

async function handleCompanyRegistration(e) {
  e.preventDefault();
  const pwd = document.getElementById('reg-comp-password').value;
  const confirmPwd = document.getElementById('reg-comp-confirm-password').value;

  if (pwd !== confirmPwd) {
    alert('Passwords do not match.');
    return;
  }

  const regData = {
    companyName: document.getElementById('reg-comp-name').value,
    companyUsername: document.getElementById('reg-comp-username').value,
    companyEmail: document.getElementById('reg-comp-email').value,
    password: pwd,
    industry: document.getElementById('reg-comp-industry').value,
    managerName: document.getElementById('reg-mgr-name').value,
    managerDesignation: document.getElementById('reg-mgr-desig').value
  };

  try {
    const data = await apiFetch('/company/register', {
      method: 'POST',
      body: JSON.stringify(regData)
    });

    authToken = data.token;
    localStorage.setItem('sb_token', authToken);
    alert(`🎉 Company Registered Successfully!\nGenerated Unique Company ID: ${data.companyId}`);
    closeCompanyRegisterModal();
    await fetchCurrentUser();
  } catch (err) { alert(err.message); }
}

async function handleLogin(e) {
  e.preventDefault();
  const identity = document.getElementById('login-identity').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity, password })
    });
    authToken = data.token;
    localStorage.setItem('sb_token', authToken);
    closeAuthModal();
    await fetchCurrentUser();
  } catch (err) { alert(err.message || 'Login failed'); }
}

// -------------------------------------------------------------
// STUDENT MODULE: PROFILE, SKILLS, PROJECTS & ELIGIBILITY OPPORTUNITIES
// -------------------------------------------------------------
async function loadStudentDashboard() {
  try {
    const data = await apiFetch('/student/profile');
    const profile = data.profile || {};

    document.getElementById('welcome-student-name').textContent = `Welcome back, ${profile.name || 'Candidate'} 👋`;
    document.getElementById('welcome-student-sub').textContent = `${profile.degree || 'B.Tech CSE'} • ${profile.college || 'Anna University'} (CGPA: ${profile.cgpa || 8.8})`;

    const completion = data.completion || { percentage: 82, missingActions: [] };
    document.getElementById('profile-progress-text').textContent = `${completion.percentage}%`;

    const circle = document.getElementById('profile-progress-circle');
    if (circle) circle.setAttribute('stroke-dashoffset', 100 - completion.percentage);

    const aiScoreData = data.aiScore || { overallScore: 94 };
    document.getElementById('dash-skill-score').textContent = `${aiScoreData.overallScore} / 100`;

    loadStudentDashboardJobs();
  } catch (err) { console.error(err); }
}

async function loadStudentDashboardJobs() {
  try {
    const jobs = await apiFetch('/student/opportunities');
    const container = document.getElementById('dash-featured-jobs-list');
    if (container) {
      container.innerHTML = (jobs || []).map(j => {
        const initial = (j.company_name || 'T')[0].toUpperCase();
        const badgeClass = j.isEligible ? 'badge-completed' : 'badge-cyber text-danger';
        return `
          <div class="job-item-card">
            <div class="flex-align gap-3">
              <div class="company-logo-box">${initial}</div>
              <div>
                <div class="flex-align gap-2 mb-0.5">
                  <h4 class="font-bold text-white text-sm">${j.title}</h4>
                  <span class="${badgeClass} text-xs"><i class="fa-solid ${j.isEligible ? 'fa-circle-check' : 'fa-xmark'} mr-1"></i> ${j.eligibilityStatus} (${j.matchScore}%)</span>
                </div>
                <p class="text-xs text-slate-400">
                  <b class="text-cyan">${j.company_name}</b> • Min CGPA: ${j.min_cgpa} • <span class="text-emerald font-semibold">${j.salary_stipend}</span>
                </p>
              </div>
            </div>
            ${j.isEligible ?
              `<button class="btn btn-sm btn-primary-cyber" onclick="applyToJob(${j.id})">Apply Now</button>` :
              `<button class="btn btn-sm btn-outline-cyber opacity-50 cursor-not-allowed" disabled title="${(j.reasons || []).join('; ')}">Not Eligible</button>`
            }
          </div>
        `;
      }).join('');
    }
  } catch (err) { console.error(err); }
}

async function loadStudentProfileView() {
  try {
    const data = await apiFetch('/student/profile');
    const p = data.profile || {};
    if (p.name) document.getElementById('prof-fullname').value = p.name;
    if (p.phone) document.getElementById('prof-phone').value = p.phone;
    if (p.college) document.getElementById('prof-college').value = p.college;
    if (p.department) document.getElementById('prof-dept').value = p.department;
    if (p.cgpa) document.getElementById('prof-cgpa').value = p.cgpa;
    if (p.current_year) document.getElementById('prof-year-sem').value = p.current_year;
  } catch (err) { console.error(err); }
}

async function saveStudentProfile() {
  const updated = {
    name: document.getElementById('prof-fullname').value,
    phone: document.getElementById('prof-phone').value,
    college: document.getElementById('prof-college').value,
    department: document.getElementById('prof-dept').value,
    cgpa: Number(document.getElementById('prof-cgpa').value),
    current_year: document.getElementById('prof-year-sem').value
  };

  try {
    await apiFetch('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(updated)
    });
    alert('Profile & Academic Details Saved!');
    loadStudentDashboard();
  } catch (err) { alert(err.message); }
}

async function loadStudentSkills() {
  try {
    const skills = await apiFetch('/student/skills');
    const container = document.getElementById('skills-manager-list');
    if (!container) return;

    container.innerHTML = (skills || []).map(s => `
      <div class="glass-card-cyber p-4">
        <div class="flex-between mb-2">
          <h4 class="font-bold text-white text-md">${s.name}</h4>
          <div class="flex-align gap-2">
            <span class="badge-cyber font-bold">${s.level}% Level</span>
            <button class="text-danger text-xs ml-2" onclick="deleteSkill(${s.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="w-full bg-obsidian rounded-full h-2 overflow-hidden border border-cyber">
          <div class="bg-cyan h-2 rounded-full" style="width: ${s.level}%; background: #38bdf8;"></div>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function openAddSkillModal() {
  const name = prompt('Skill Name:');
  if (!name) return;
  const level = prompt('Proficiency Level (1-100%):', '85');

  try {
    await apiFetch('/student/skills', {
      method: 'POST',
      body: JSON.stringify({ name, level })
    });
    loadStudentSkills();
  } catch (err) { alert(err.message); }
}

async function deleteSkill(skillId) {
  try {
    await apiFetch(`/student/skills/${skillId}`, { method: 'DELETE' });
    loadStudentSkills();
  } catch (err) { alert(err.message); }
}

async function openAddProjectModal() {
  const title = prompt('Project Title:');
  if (!title) return;
  const github_url = prompt('GitHub Repository URL:');
  const demo_url = prompt('Live Demo URL:');

  try {
    await apiFetch('/student/projects', {
      method: 'POST',
      body: JSON.stringify({ title, github_url, demo_url, description: title })
    });
    loadStudentProjects();
  } catch (err) { alert(err.message); }
}

async function loadStudentProjects() {
  try {
    const projects = await apiFetch('/student/projects');
    const container = document.getElementById('projects-list');
    if (!container) return;

    container.innerHTML = (projects || []).map(p => `
      <div class="glass-card-cyber p-4">
        <div class="flex-between mb-2">
          <h4 class="font-bold text-white">${p.title}</h4>
          <span class="badge-cyber">AI Complexity: ${p.ai_complexity}%</span>
        </div>
        <p class="text-xs text-slate-300 mb-2">${p.description}</p>
        <a href="${p.github_url || '#'}" target="_blank" class="text-xs text-cyan"><i class="fa-brands fa-github mr-1"></i> ${p.github_url || 'GitHub Link'}</a>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function openUploadCertModal() {
  const name = prompt('Certificate Name:');
  if (!name) return;
  const organization = prompt('Issuing Organization:', 'Amazon Web Services');

  try {
    await apiFetch('/student/certifications', {
      method: 'POST',
      body: JSON.stringify({ name, organization, cert_url: '/uploads/aws_cert.pdf' })
    });
    loadStudentCertifications();
  } catch (err) { alert(err.message); }
}

async function loadStudentCertifications() {
  try {
    const certs = await apiFetch('/student/certifications');
    const container = document.getElementById('certifications-list');
    if (!container) return;

    container.innerHTML = (certs || []).map(c => `
      <div class="glass-card-cyber p-4">
        <div class="flex-between mb-2">
          <h4 class="font-bold text-white">${c.name}</h4>
          <span class="badge-cyber font-bold">Score: ${c.ai_valuation_score || 95}/100</span>
        </div>
        <p class="text-sm text-slate-400 mb-2"><i class="fa-solid fa-building mr-1"></i> ${c.organization}</p>
        <span class="text-xs text-slate-400 font-mono">${c.hash}</span>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadAISkillScoreView() {
  try {
    const data = await apiFetch('/ai/skill-score');
    document.getElementById('ai-score-big-display').textContent = `${data.overallScore} / 100`;

    const strengthsEl = document.getElementById('ai-score-strengths');
    if (strengthsEl) strengthsEl.innerHTML = (data.strengths || []).map(s => `<li><i class="fa-solid fa-check text-emerald mr-2"></i> ${s}</li>`).join('');

    const improvementsEl = document.getElementById('ai-score-improvements');
    if (improvementsEl) improvementsEl.innerHTML = (data.improvements || []).map(i => `<li><i class="fa-solid fa-arrow-right text-amber mr-2"></i> ${i}</li>`).join('');
  } catch (err) { console.error(err); }
}

// OPPORTUNITIES & ELIGIBILITY CHECK FOR STUDENT
async function loadStudentOpportunities() {
  try {
    const jobs = await apiFetch('/student/opportunities');
    const container = document.getElementById('opportunities-full-list');
    if (!container) return;

    container.innerHTML = (jobs || []).map(j => {
      const isEligible = j.isEligible;
      const badgeClass = isEligible ? 'badge-completed' : 'badge-cyber text-danger';

      return `
        <div class="glass-card-cyber p-5 border border-cyber">
          <div class="flex-between mb-3 border-b-cyber pb-3">
            <div>
              <div class="flex-align gap-2 mb-1">
                <span class="${badgeClass} text-xs font-bold"><i class="fa-solid ${isEligible ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1"></i> ${j.eligibilityStatus}</span>
                <span class="badge-cyber text-xs">Match Score: ${j.matchScore}%</span>
              </div>
              <h3 class="font-bold text-white text-xl">${j.title}</h3>
              <p class="text-xs text-cyan font-semibold">${j.company_name} (ID: ${j.companyId}) • Min CGPA: ${j.min_cgpa} • Min AI Score: ${j.min_ai_score}</p>
            </div>
            <span class="badge-cyber font-bold text-sm">${j.salary_stipend}</span>
          </div>
          <p class="text-xs text-slate-300 mb-3">${j.description}</p>
          ${!isEligible ? `<div class="p-3 bg-obsidian rounded border border-danger mb-3 text-xs text-danger"><i class="fa-solid fa-circle-exclamation mr-1"></i> <b>Ineligibility Reason:</b> ${(j.reasons || []).join('; ')}</div>` : ''}
          <div class="flex-between">
            <span class="text-xs text-slate-400">Required Skills: ${(j.required_skills || []).join(', ')}</span>
            ${isEligible ?
              `<button class="btn btn-primary-cyber" onclick="applyToJob(${j.id})">Apply Now</button>` :
              `<button class="btn btn-outline-cyber opacity-50 cursor-not-allowed" disabled title="${(j.reasons || []).join('; ')}">Not Eligible</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) { console.error(err); }
}

async function applyToJob(jobId) {
  try {
    await apiFetch('/student/apply', {
      method: 'POST',
      body: JSON.stringify({ jobId })
    });
    alert('Application Submitted Successfully!');
    navigateTo('student-applications');
  } catch (err) { alert(err.message); }
}

async function loadStudentApplications() {
  try {
    const apps = await apiFetch('/student/applications');
    const container = document.getElementById('student-applications-list');
    if (!container) return;

    container.innerHTML = (apps || []).map(a => `
      <div class="glass-card-cyber p-4 flex-between">
        <div>
          <span class="badge-cyber text-xs uppercase font-bold mb-1">${a.status || 'Applied'}</span>
          <h4 class="font-bold text-white text-md">${a.jobTitle}</h4>
          <p class="text-xs text-cyan">${a.companyName} (${a.companyId}) • Applied on ${a.appliedAt}</p>
        </div>
        <span class="badge-completed text-xs font-semibold">Stage: ${a.stage}</span>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

// -------------------------------------------------------------
// INDIVIDUAL COMPANY DASHBOARD WITH 8-STAGE ATS KANBAN PIPELINE
// -------------------------------------------------------------
async function loadATSKanbanPipeline() {
  try {
    const pipeline = await apiFetch('/company/pipeline');
    const container = document.getElementById('company-stats-grid');
    if (!container) return;

    // 8 STAGES AS SPECIFIED
    const stages = [
      'Eligible',
      'Applied',
      'AI Screening',
      'Shortlisted',
      'Technical Interview',
      'HR Interview',
      'Selected',
      'Rejected'
    ];

    const companyId = currentUser ? currentUser.companyId || 'CMP-10001' : 'CMP-10001';

    container.innerHTML = `
      <div class="glass-card-cyber p-6 w-full">
        <div class="flex-between mb-6 border-b-cyber pb-4">
          <div>
            <div class="flex-align gap-2 mb-1">
              <span class="badge-cyber text-xs uppercase font-bold"><i class="fa-solid fa-building mr-1"></i> Isolated Company Dashboard</span>
              <span class="badge-completed text-xs uppercase font-bold"><i class="fa-solid fa-shield-halved mr-1"></i> companyId: ${companyId}</span>
            </div>
            <h3 class="text-2xl font-bold text-white mb-1"><i class="fa-solid fa-network-wired text-cyan mr-2"></i> 8-Stage ATS Candidate Pipeline</h3>
            <p class="text-xs text-slate-400">Company-specific isolated pipeline. You only see candidates who applied to your company.</p>
          </div>
          <button class="btn btn-primary-cyber" onclick="navigateTo('company-jobs')"><i class="fa-solid fa-plus mr-2"></i> Create Requirement</button>
        </div>

        <div class="pipeline-container-flex flex-between gap-3 overflow-x-auto" style="display: flex; gap: 0.85rem; overflow-x: auto; padding-bottom: 1rem;">
          ${stages.map(stage => {
            const candidatesInStage = (pipeline || []).filter(c => c.stage === stage);
            return `
              <div class="pipeline-stage-col" style="flex: 1; min-width: 180px;">
                <div class="flex-between mb-3 border-b-cyber pb-2">
                  <span class="font-bold text-white text-xs word-break-normal">${stage}</span>
                  <span class="badge-cyber text-xs font-mono">${candidatesInStage.length}</span>
                </div>
                <div class="flex-col gap-2">
                  ${candidatesInStage.map(c => `
                    <div class="pipeline-candidate-card">
                      <div class="flex-between">
                        <h4 class="font-bold text-white text-xs">${c.name}</h4>
                        <span class="badge-cyber text-xs font-bold">${c.aiScore}/100</span>
                      </div>
                      <p class="text-xs text-cyan font-semibold mb-0.5">${c.department}</p>
                      <p class="text-xs text-slate-400 mb-1">${c.college} (CGPA: ${c.cgpa})</p>
                      <p class="text-xs text-emerald mb-2">Match: <b>${c.matchScore}%</b></p>
                      <select class="cyber-select text-xs w-full word-break-normal" onchange="updateCandidateStage(${c.candidateId}, this.value)">
                        <option value="${c.stage}" selected>Current: ${c.stage}</option>
                        ${stages.filter(s => s !== c.stage).map(s => `<option value="${s}">Move to ${s}</option>`).join('')}
                      </select>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (err) { console.error(err); }
}

async function updateCandidateStage(candidateId, newStage) {
  try {
    await apiFetch('/company/pipeline/update', {
      method: 'POST',
      body: JSON.stringify({ candidateId, newStage })
    });
    loadATSKanbanPipeline();
  } catch (err) { alert(err.message); }
}

async function submitCompanyJobRequirement() {
  const reqData = {
    title: document.getElementById('job-req-title').value,
    department: document.getElementById('job-req-dept').value,
    min_cgpa: document.getElementById('job-req-min-cgpa').value,
    min_ai_score: document.getElementById('job-req-min-ai').value,
    required_skills: document.getElementById('job-req-skills').value,
    location: document.getElementById('job-req-location').value,
    salary_stipend: document.getElementById('job-req-salary').value
  };

  try {
    await apiFetch('/company/jobs', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });
    alert('Recruitment Requirement Published!');
    navigateTo('company-dashboard');
  } catch (err) { alert(err.message); }
}

async function searchCandidates() {
  try {
    const candidates = await apiFetch('/company/candidates/matched');
    const container = document.getElementById('candidate-search-results');
    if (!container) return;

    container.innerHTML = (candidates || []).map(c => `
      <div class="glass-card-cyber p-4">
        <div class="flex-between mb-2">
          <div>
            <span class="badge-completed mb-1">Eligible Candidate</span>
            <h4 class="font-bold text-white text-md">${c.name}</h4>
          </div>
          <span class="font-bold text-cyan text-lg">Match: ${c.matchScore}%</span>
        </div>
        <p class="text-xs text-slate-300 mb-2"><i class="fa-solid fa-graduation-cap text-cyan mr-1"></i> ${c.college} (CGPA: ${c.gpa})</p>
        <p class="text-xs text-emerald mb-3">AI Skill Score: <b>${c.aiScore}/100</b></p>
        <button class="btn btn-sm btn-primary-cyber" onclick="alert('Interview Scheduled for ${c.name}!')">Schedule Interview</button>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadCollegeAnalytics() {
  try {
    const data = await apiFetch('/college/analytics');
    const container = document.getElementById('college-analytics-container');
    if (!container) return;

    container.innerHTML = `
      <div class="glass-card-cyber p-5 mb-4">
        <div class="flex-between mb-3 border-b-cyber pb-2">
          <h3 class="font-bold text-2xl text-white"><i class="fa-solid fa-graduation-cap text-emerald mr-2"></i> University Placement Analytics</h3>
          <span class="font-bold text-emerald text-xl">${data.overallPlacementRate || 89}% Placement Rate</span>
        </div>
      </div>
    `;
  } catch (err) { console.error(err); }
}

function openVerifyHash(hash) {
  window.open(`/verify/${hash || '0x8f9a2b7c4d1e6f3a'}`, '_blank');
}

function toggleRecruiterCopilot() {
  const el = document.getElementById('recruiter-copilot-drawer');
  if (el) el.classList.toggle('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function handleLogout() {
  authToken = null; currentUser = null; currentProfile = null;
  localStorage.removeItem('sb_token');
  showLandingPage();
}

function openPublicPortfolio() {
  window.open('/portfolio/arjun_sharma', '_blank');
}
