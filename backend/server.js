const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// Environment Variables Setup
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, v] = trimmed.split('=');
        process.env[k.trim()] = v.trim();
      }
    });
  } catch (e) {}
}

const port = Number(process.env.PORT) || 3000;
const repoRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(repoRoot, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-multi-portal-secret-key-2026';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password, salt, hash) {
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) { return false; }
}

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

let companyCounter = 10002;

// IN-MEMORY COMPREHENSIVE DATASTORE FOR STUDENT, COMPANY & COLLEGE MODULES
let state = {
  users: [],
  studentProfiles: {},
  resumes: {},
  academicRecords: {},
  schoolEducation: {},
  backlogs: {},
  userSkills: {},
  codingSkills: {},
  assessments: {},
  projects: {},
  internships: {},
  certifications: {},
  seminars: {},
  workshops: {},
  hackathons: {},
  achievements: {},
  companies: [
    {
      id: 1,
      companyId: 'CMP-10001',
      name: 'TechCorp Solutions',
      logo: '🏢',
      industry: 'Software & Cloud Tech',
      manager_name: 'Vikram Malhotra',
      manager_desig: 'Head of Talent Acquisition',
      min_cgpa: 7.5,
      min_ai_score: 75,
      required_skills: ['Java', 'Python', 'SQL'],
      preferred_skills: ['AWS', 'Docker'],
      coding_level: 'Advanced',
      experience: '0-1 Years',
      certs: ['AWS Certified Solutions Architect']
    },
    {
      id: 2,
      companyId: 'CMP-10002',
      name: 'DataSoft Systems',
      logo: '📊',
      industry: 'AI & Data Science',
      manager_name: 'Ananya Roy',
      manager_desig: 'Senior Technical Recruiter',
      min_cgpa: 8.0,
      min_ai_score: 80,
      required_skills: ['Python', 'SQL', 'Data Structures'],
      preferred_skills: ['Machine Learning', 'TensorFlow'],
      coding_level: 'Advanced',
      experience: 'Fresher',
      certs: ['Data Science Professional']
    }
  ],
  jobs: [
    {
      id: 101,
      company_id: 1,
      companyId: 'CMP-10001',
      company_name: 'TechCorp Solutions',
      title: 'Full-Stack Software Engineer',
      description: 'Develop high-performance Web Applications and microservices using Java, React, Node.js and SQL.',
      responsibilities: '1. Build modular frontend UI components\n2. Design scalable REST APIs\n3. Write comprehensive unit tests.',
      location: 'Bengaluru / Hybrid',
      job_type: 'Full-Time',
      salary_stipend: '₹ 12,00,000 P.A.',
      required_skills: ['Java', 'Python', 'React', 'SQL'],
      preferred_skills: ['AWS', 'Docker'],
      min_cgpa: 7.5,
      min_ai_score: 75,
      experience: 'Fresher / 2026 Batch',
      deadline: '2026-09-30'
    },
    {
      id: 102,
      company_id: 2,
      companyId: 'CMP-10002',
      company_name: 'DataSoft Systems',
      title: 'AI & Machine Learning Developer',
      description: 'Train predictive machine learning models and integrate data analytics pipelines.',
      responsibilities: '1. Clean and transform unstructured dataset\n2. Develop Python ML models\n3. Deploy API inference endpoints.',
      location: 'Hyderabad / Remote',
      job_type: 'Full-Time',
      salary_stipend: '₹ 14,00,000 P.A.',
      required_skills: ['Python', 'SQL', 'Data Structures'],
      preferred_skills: ['Machine Learning', 'Docker'],
      min_cgpa: 8.0,
      min_ai_score: 80,
      experience: 'Fresher / 2026 Batch',
      deadline: '2026-10-15'
    }
  ],
  applications: [],
  notifications: [],
  collegeAnalytics: {
    total_students: 450,
    placed_students: 382,
    placement_rate: 84.8,
    top_recruiters: ['TechCorp Solutions', 'DataSoft Systems', 'CloudWorks Tech'],
    department_stats: [
      { name: 'Computer Science & Engg', total: 120, placed: 112, percentage: 93.3 },
      { name: 'Information Technology', total: 100, placed: 88, percentage: 88.0 },
      { name: 'Electronics & Comm', total: 110, placed: 92, percentage: 83.6 },
      { name: 'Electrical & Electronics', total: 60, placed: 48, percentage: 80.0 },
      { name: 'Mechanical Engg', total: 60, placed: 42, percentage: 70.0 }
    ]
  }
};

function seedInitialData() {
  const studentPwd = hashPassword('Student@123');
  const compPwd = hashPassword('Company@123');
  const collegePwd = hashPassword('College@123');

  state.users = [
    { id: 1, email: 'arjun@skillbridge.ai', username: 'arjun_sharma', student_id: 'STU-2026-101', password_hash: studentPwd.hash, salt: studentPwd.salt, role: 'student' },
    { id: 2, email: 'recruiter@techcorp.com', username: 'techcorp_mgr', companyName: 'TechCorp Solutions', companyId: 'CMP-10001', password_hash: compPwd.hash, salt: compPwd.salt, role: 'company' },
    { id: 3, email: 'admin@annauniv.edu', username: 'anna_univ_admin', collegeName: 'Anna University', password_hash: collegePwd.hash, salt: collegePwd.salt, role: 'college' }
  ];

  state.studentProfiles[1] = {
    user_id: 1,
    name: 'Arjun Sharma',
    dob: '2004-05-14',
    gender: 'Male',
    email: 'arjun@skillbridge.ai',
    phone: '+91 9876543210',
    student_id: 'STU-2026-101',
    college: 'Anna University',
    department: 'Computer Science & Engineering',
    degree: 'B.Tech CSE',
    year: '4th Year',
    semester: '7th Semester',
    location: 'Chennai, India',
    linkedin_url: 'https://linkedin.com/in/arjun-sharma-tech',
    github_url: 'https://github.com/arjun-sharma-dev',
    portfolio_url: 'https://arjunsharma.dev',
    cgpa: 8.8
  };

  state.resumes[1] = { file_name: 'Arjun_Sharma_Software_Resume.pdf', upload_date: '2026-08-20', file_url: '/uploads/Arjun_Sharma_Resume.pdf', status: 'Verified & Active' };
  state.academicRecords[1] = [
    { id: 1, semester: 'Semester 1', gpa: 8.2, status: 'Completed', details: 'Core Fundamentals & Mathematics' },
    { id: 2, semester: 'Semester 2', gpa: 8.5, status: 'Completed', details: 'C Programming & Physics' },
    { id: 3, semester: 'Semester 3', gpa: 8.7, status: 'Completed', details: 'Data Structures & OOP Java' },
    { id: 4, semester: 'Semester 4', gpa: 8.9, status: 'Completed', details: 'Database Management Systems' },
    { id: 5, semester: 'Semester 5', gpa: 9.0, status: 'Completed', details: 'Operating Systems & Networks' },
    { id: 6, semester: 'Semester 6', gpa: 9.1, status: 'Completed', details: 'Compiler Design & Web Engineering' }
  ];

  state.schoolEducation[1] = { tenth_school: 'St. John Higher Secondary School', tenth_board: 'State Board', tenth_percentage: 94.5, tenth_year: 2020, twelfth_school: 'St. John Higher Secondary School', twelfth_board: 'State Board', twelfth_percentage: 92.8, twelfth_year: 2022 };
  state.backlogs[1] = { current_backlogs: 0, history_backlogs: 0, status: 'No active backlogs' };

  state.userSkills[1] = [
    { id: 1, skill_name: 'Java', category: 'Technical', proficiency: 'Advanced', level_pct: 88 },
    { id: 2, skill_name: 'Python', category: 'Technical', proficiency: 'Advanced', level_pct: 90 },
    { id: 3, skill_name: 'JavaScript', category: 'Technical', proficiency: 'Advanced', level_pct: 85 },
    { id: 4, skill_name: 'React', category: 'Technical', proficiency: 'Advanced', level_pct: 86 },
    { id: 5, skill_name: 'SQL', category: 'Technical', proficiency: 'Intermediate', level_pct: 80 }
  ];

  state.codingSkills[1] = { problem_solving: 85, data_structures: 84, algorithms: 82, competitive_programming: 78, leetcode_handle: 'arjun_sharma_2026', hackerrank_handle: 'arjun_code' };
  state.assessments[1] = { overall_score: 82, breakdown: { technical: 85, coding: 80, communication: 78, soft_skills: 84 }, tests: [{ id: 1, name: 'SkillBridge Technical Core Test', type: 'Technical', date: '2026-08-15', score: 85, total: 100, status: 'Completed', details: 'Strong grasp in Java, Data Structures and SQL query design.' }] };
  state.projects[1] = [{ id: 201, title: 'SkillBridge Academia Platform', description: 'Full-stack collaboration platform connecting students with corporate recruiters.', technologies: ['React', 'Node.js', 'SQL'], website_url: 'https://skillbridge.dev', github_url: 'https://github.com/arjun/skillbridge' }];
  state.internships[1] = [{ id: 301, company: 'TechCorp Solutions', role: 'Software Engineering Intern', start_date: '2025-05-01', end_date: '2025-07-31', company_score: '9.4 / 10' }];
  state.certifications[1] = [{ id: 401, name: 'AWS Certified Solutions Architect', organization: 'Amazon Web Services', credential_id: 'AWS-ASA-994821', verification_url: 'https://aws.amazon.com/verify/AWS-ASA-994821' }];
  state.seminars[1] = [{ id: 501, title: 'Next-Gen Cloud Computing', institution: 'IIT Madras Summit', date: '2025-11-12' }];
  state.workshops[1] = [{ id: 601, name: 'Hands-on Docker Bootcamp', organization: 'DevOps India', date: '2026-01-20' }];
  state.hackathons[1] = [{ id: 701, name: 'Smart India Hackathon 2025', organization: 'MoE', result: '1st Runner Up' }];
  state.achievements[1] = [{ id: 801, title: 'Dean’s Honor List', organization: 'Anna University', date: '2025-09-05' }];

  state.applications = [
    {
      id: 901,
      student_id: 1,
      job_id: 101,
      companyId: 'CMP-10001',
      company_name: 'TechCorp Solutions',
      job_title: 'Full-Stack Software Engineer',
      candidate_name: 'Arjun Sharma',
      cgpa: 8.8,
      applied_at: '2026-08-20',
      status: 'Technical Interview',
      last_updated: '2026-08-24',
      next_step: 'Technical Interview round on Aug 28, 2026',
      interview: { date: '2026-08-28', time: '11:00 AM IST', mode: 'Google Meet (Online Video)', meeting_link: 'https://meet.google.com/abc-defg-hij' }
    }
  ];

  state.notifications[1] = [
    { id: 1001, title: 'Interview Invitation Scheduled 🎉', message: 'TechCorp Solutions scheduled your Technical Interview for Full-Stack Developer on Aug 28, 11:00 AM.', type: 'interviews', is_read: false, created_at: '2026-08-24 10:30 AM', target_view: 'applications' }
  ];
}

seedInitialData();

function calculateProfileCompletion(userId) {
  const p = state.studentProfiles[userId || 1] || {};
  const r = state.resumes[userId || 1];
  const s = state.userSkills[userId || 1] || [];
  let score = 0; let missing = [];
  if (p.name && p.phone && p.email) score += 40; else missing.push('Contact Details');
  if (r && r.file_name) score += 30; else missing.push('Resume Upload');
  if (s.length >= 3) score += 30; else missing.push('Technical Skills');
  return { percentage: Math.min(100, score), missingItems: missing };
}

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  const sendJSON = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const getAuthUser = () => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) return null;
    return state.users.find(u => String(u.id) === String(payload.id)) || null;
  };

  try {
    // 1. UNIFIED AUTHENTICATION APIS (STUDENT, COMPANY, COLLEGE)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { fullName, email, mobile, studentId, companyName, managerName, collegeName, role, password } = await parseJSON(req);
      const userRole = role || 'student';
      const newId = Date.now();
      const { salt, hash } = hashPassword(password || 'Password@123');

      if (userRole === 'company') {
        const assignedId = `CMP-${++companyCounter}`;
        const newComp = { id: newId, companyId: assignedId, name: companyName, logo: '🏢', industry: 'Corporate Partner', manager_name: managerName || 'Recruitment Manager', min_cgpa: 7.0, min_ai_score: 70, required_skills: ['Java', 'SQL'], preferred_skills: ['Docker'], certs: [] };
        state.companies.push(newComp);
        const newUser = { id: newId, email, username: email.split('@')[0], companyName, companyId: assignedId, password_hash: hash, salt, role: 'company' };
        state.users.push(newUser);
        const token = generateToken({ id: newUser.id, email, companyId: assignedId, role: 'company' });
        return sendJSON(201, { token, user: newUser, company: newComp });
      } else {
        const newUser = { id: newId, email, username: email.split('@')[0], student_id: studentId || 'STU-2026', password_hash: hash, salt, role: 'student' };
        state.users.push(newUser);
        state.studentProfiles[newId] = { user_id: newId, name: fullName, email, phone: mobile, student_id: studentId, college: 'Anna University', department: 'CSE' };
        const token = generateToken({ id: newUser.id, email, role: 'student' });
        return sendJSON(201, { token, user: newUser, profile: state.studentProfiles[newId] });
      }
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { identity, companyName, password, role } = await parseJSON(req);
      let user = null;

      if (role === 'company' || companyName) {
        user = state.users.find(u => u.role === 'company' && (u.email.toLowerCase() === (identity || '').toLowerCase() || u.username === identity));
        if (!user) user = state.users.find(u => u.role === 'company');
      } else if (role === 'college') {
        user = state.users.find(u => u.role === 'college');
      } else {
        user = state.users.find(u => u.email.toLowerCase() === (identity || '').toLowerCase() || u.student_id === identity || u.username === identity);
      }

      if (!user) return sendJSON(401, { error: 'Invalid authentication credentials.' });
      const token = generateToken({ id: user.id, email: user.email, companyId: user.companyId, role: user.role });
      return sendJSON(200, { token, user, profile: state.studentProfiles[user.id] || state.studentProfiles[1] });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      return sendJSON(200, { user: state.users.find(u => u.id === userId) || state.users[0], profile: state.studentProfiles[userId] || state.studentProfiles[1] });
    }

    // 2. STUDENT MODULE APIS
    if (pathname === '/api/student/profile' && req.method === 'GET') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      return sendJSON(200, { profile: state.studentProfiles[userId] || state.studentProfiles[1], completion: calculateProfileCompletion(userId), resume: state.resumes[userId] || state.resumes[1] });
    }
    if (pathname === '/api/student/profile' && req.method === 'PUT') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      const body = await parseJSON(req);
      state.studentProfiles[userId] = { ...(state.studentProfiles[userId] || {}), ...body };
      return sendJSON(200, { success: true, profile: state.studentProfiles[userId] });
    }
    if (pathname === '/api/student/academics' && req.method === 'GET') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      return sendJSON(200, { cgpa: 8.8, records: state.academicRecords[userId] || state.academicRecords[1], school: state.schoolEducation[userId] || state.schoolEducation[1], backlog: state.backlogs[userId] || state.backlogs[1] });
    }
    if (pathname === '/api/student/skills' && req.method === 'GET') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      return sendJSON(200, { technical: state.userSkills[userId] || state.userSkills[1], coding: state.codingSkills[userId] || state.codingSkills[1] });
    }
    if (pathname === '/api/student/assessments' && req.method === 'GET') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      return sendJSON(200, state.assessments[userId] || state.assessments[1]);
    }
    if (pathname === '/api/student/portfolio' && req.method === 'GET') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      return sendJSON(200, { projects: state.projects[userId] || state.projects[1], internships: state.internships[userId] || state.internships[1], certifications: state.certifications[userId] || state.certifications[1], seminars: state.seminars[userId] || state.seminars[1], workshops: state.workshops[userId] || state.workshops[1], hackathons: state.hackathons[userId] || state.hackathons[1], achievements: state.achievements[userId] || state.achievements[1] });
    }
    if (pathname === '/api/opportunities' && req.method === 'GET') {
      return sendJSON(200, state.jobs.map(j => ({ ...j, match_percentage: 92 })));
    }
    if (pathname.startsWith('/api/opportunities/') && req.method === 'GET') {
      const jobId = Number(pathname.split('/').pop());
      return sendJSON(200, state.jobs.find(j => j.id === jobId) || state.jobs[0]);
    }
    if (pathname === '/api/student/apply' && req.method === 'POST') {
      const authUser = getAuthUser(); const userId = authUser ? authUser.id : 1;
      const { jobId } = await parseJSON(req);
      const targetJob = state.jobs.find(j => j.id === Number(jobId)) || state.jobs[0];
      const newApp = { id: Date.now(), student_id: userId, job_id: targetJob.id, companyId: targetJob.companyId || 'CMP-10001', company_name: targetJob.company_name, job_title: targetJob.title, candidate_name: 'Arjun Sharma', cgpa: 8.8, applied_at: new Date().toISOString().split('T')[0], status: 'Applied', last_updated: new Date().toISOString().split('T')[0], next_step: 'Application submitted successfully.' };
      state.applications.unshift(newApp);
      return sendJSON(201, { success: true, application: newApp });
    }
    if (pathname === '/api/student/applications' && req.method === 'GET') {
      return sendJSON(200, state.applications);
    }
    if (pathname === '/api/student/notifications' && req.method === 'GET') {
      return sendJSON(200, state.notifications[1] || []);
    }
    if (pathname === '/api/ai/companies' && req.method === 'GET') {
      return sendJSON(200, state.companies);
    }
    if (pathname.startsWith('/api/ai/company/') && req.method === 'GET') {
      return sendJSON(200, { company: state.companies[0], matchPercentage: 92, skillGaps: [{ skill: 'Java', reqLevel: 'Advanced', studentLevel: 'Advanced', gap: 'No Gap' }], recommendations: ['Practice 20 DSA problems'] });
    }

    // 3. COMPANY RECRUITER MODULE APIS (ISOLATED ATS KANBAN PIPELINE & JOBS)
    if (pathname === '/api/company/dashboard' && req.method === 'GET') {
      const authUser = getAuthUser();
      const compId = (authUser && authUser.companyId) || 'CMP-10001';
      const company = state.companies.find(c => c.companyId === compId) || state.companies[0];
      const compJobs = state.jobs.filter(j => j.companyId === compId);
      const compApps = state.applications.filter(a => a.companyId === compId);

      return sendJSON(200, { company, total_jobs: compJobs.length, total_applicants: compApps.length, shortlisted: compApps.filter(a => a.status === 'Shortlisted' || a.status === 'Technical Interview').length, pipeline: compApps });
    }

    if (pathname === '/api/company/jobs' && req.method === 'POST') {
      const authUser = getAuthUser();
      const compId = (authUser && authUser.companyId) || 'CMP-10001';
      const comp = state.companies.find(c => c.companyId === compId) || state.companies[0];
      const body = await parseJSON(req);

      const newJob = { id: Date.now(), company_id: comp.id, companyId: comp.companyId, company_name: comp.name, title: body.title, description: body.description || 'Full job posting', location: body.location || 'Remote', job_type: body.job_type || 'Full-Time', salary_stipend: body.salary_stipend || '₹ 10,00,000 P.A.', required_skills: (body.required_skills || 'Java,SQL').split(','), min_cgpa: Number(body.min_cgpa || 7.0), deadline: body.deadline || '2026-10-30' };
      state.jobs.unshift(newJob);
      return sendJSON(201, { success: true, job: newJob });
    }

    if (pathname === '/api/company/pipeline' && req.method === 'GET') {
      const authUser = getAuthUser();
      const compId = (authUser && authUser.companyId) || 'CMP-10001';
      const apps = state.applications.filter(a => a.companyId === compId);
      return sendJSON(200, apps);
    }

    if (pathname === '/api/company/pipeline/stage' && req.method === 'PUT') {
      const { applicationId, newStage } = await parseJSON(req);
      const app = state.applications.find(a => a.id === Number(applicationId));
      if (app) {
        app.status = newStage;
        app.last_updated = new Date().toISOString().split('T')[0];
        app.next_step = `Candidate moved to ${newStage} stage.`;
      }
      return sendJSON(200, { success: true, application: app });
    }

    if (pathname === '/api/company/schedule-interview' && req.method === 'POST') {
      const { applicationId, date, time, mode, meetingLink } = await parseJSON(req);
      const app = state.applications.find(a => a.id === Number(applicationId));
      if (app) {
        app.status = 'Technical Interview';
        app.interview = { date, time, mode, meeting_link: meetingLink };
        state.notifications[app.student_id || 1].unshift({ id: Date.now(), title: 'Interview Invitation Scheduled 🎉', message: `${app.company_name} scheduled your interview for ${date} at ${time}.`, type: 'interviews', is_read: false, created_at: new Date().toLocaleTimeString(), target_view: 'applications' });
      }
      return sendJSON(200, { success: true, application: app });
    }

    // 4. UNIVERSITY / COLLEGE ADMIN MODULE APIS
    if (pathname === '/api/college/dashboard' && req.method === 'GET') {
      return sendJSON(200, state.collegeAnalytics);
    }

    if (pathname === '/api/college/students' && req.method === 'GET') {
      const studentsList = Object.values(state.studentProfiles);
      return sendJSON(200, studentsList);
    }

    // Static File Serving
    let filePath = path.join(repoRoot, 'frontend', pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) filePath = path.join(repoRoot, 'frontend', 'index.html');

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

    fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(500); res.end('Server Error'); }
      else { res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' }); res.end(content); }
    });

  } catch (err) {
    sendJSON(500, { error: 'Internal Server Error', details: err.message });
  }
});

server.listen(port, () => {
  console.log(`=======================================================`);
  console.log(` SkillBridge 3-Portal Platform Running on Port ${port}`);
  console.log(`=======================================================`);
});