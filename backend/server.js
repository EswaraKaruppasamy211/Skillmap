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

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-enforced-security-secret-key-2026';

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
    }
  ],
  applications: [
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
  ],
  notifications: [],
  collegeAnalytics: {
    total_students: 450,
    placed_students: 382,
    placement_rate: 84.8,
    top_recruiters: ['TechCorp Solutions', 'DataSoft Systems'],
    department_stats: [
      { name: 'Computer Science & Engg', total: 120, placed: 112, percentage: 93.3 },
      { name: 'Information Technology', total: 100, placed: 88, percentage: 88.0 },
      { name: 'Electronics & Comm', total: 110, placed: 92, percentage: 83.6 }
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

  state.studentProfiles[1] = { user_id: 1, name: 'Arjun Sharma', email: 'arjun@skillbridge.ai', phone: '+91 9876543210', student_id: 'STU-2026-101', college: 'Anna University', department: 'Computer Science & Engineering', year: '4th Year', semester: '7th Semester', cgpa: 8.8 };
  state.resumes[1] = { file_name: 'Arjun_Sharma_Software_Resume.pdf', upload_date: '2026-08-20', file_url: '/uploads/Arjun_Sharma_Resume.pdf', status: 'Verified & Active' };
  state.academicRecords[1] = [
    { id: 1, semester: 'Semester 1', gpa: 8.2, status: 'Completed', details: 'Core Fundamentals' },
    { id: 2, semester: 'Semester 2', gpa: 8.5, status: 'Completed', details: 'C Programming' }
  ];
  state.schoolEducation[1] = { tenth_school: 'St. John School', tenth_board: 'State Board', tenth_percentage: 94.5, tenth_year: 2020, twelfth_school: 'St. John School', twelfth_board: 'State Board', twelfth_percentage: 92.8, twelfth_year: 2022 };
  state.backlogs[1] = { current_backlogs: 0, history_backlogs: 0, status: 'No active backlogs' };
  state.userSkills[1] = [
    { id: 1, skill_name: 'Java', category: 'Technical', proficiency: 'Advanced', level_pct: 88 },
    { id: 2, skill_name: 'Python', category: 'Technical', proficiency: 'Advanced', level_pct: 90 }
  ];
  state.codingSkills[1] = { problem_solving: 85, data_structures: 84, leetcode_handle: 'arjun_sharma_2026' };
  state.assessments[1] = { overall_score: 82, breakdown: { technical: 85, coding: 80, communication: 78, soft_skills: 84 }, tests: [{ id: 1, name: 'Technical Core Test', type: 'Technical', score: 85, total: 100, status: 'Completed', details: 'Strong Java & SQL.' }] };
  state.projects[1] = [{ id: 201, title: 'SkillBridge Platform', description: 'Collaboration platform.', technologies: ['React', 'Node.js'], github_url: 'https://github.com/arjun/skillbridge' }];
  state.internships[1] = [{ id: 301, company: 'TechCorp Solutions', role: 'Software Intern', start_date: '2025-05-01', end_date: '2025-07-31', company_score: '9.4 / 10' }];
  state.certifications[1] = [{ id: 401, name: 'AWS Certified Solutions Architect', organization: 'AWS', credential_id: 'AWS-ASA-994821', verification_url: 'https://aws.amazon.com/verify/AWS-ASA-994821' }];
  state.seminars[1] = [{ id: 501, title: 'Cloud Computing', institution: 'IIT Madras', date: '2025-11-12' }];
  state.workshops[1] = [{ id: 601, name: 'Docker Bootcamp', organization: 'DevOps India', date: '2026-01-20' }];
  state.hackathons[1] = [{ id: 701, name: 'SIH 2025', organization: 'MoE', result: '1st Runner Up' }];
  state.achievements[1] = [{ id: 801, title: 'Dean’s Honor List', organization: 'Anna University', date: '2025-09-05' }];
  state.notifications[1] = [{ id: 1001, title: 'Interview Invitation Scheduled 🎉', message: 'TechCorp Solutions scheduled your interview.', type: 'interviews', is_read: false, created_at: '2026-08-24', target_view: 'applications' }];
}

seedInitialData();

function calculateProfileCompletion(userId) {
  const p = state.studentProfiles[userId || 1] || {};
  const r = state.resumes[userId || 1];
  let score = 0; let missing = [];
  if (p.name && p.phone) score += 50; else missing.push('Contact Details');
  if (r && r.file_name) score += 50; else missing.push('Resume Upload');
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
    // AUTH REGISTER & LOGIN WITH ENFORCED COMPANY & COLLEGE SECURITY
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { fullName, email, mobile, studentId, companyName, managerName, managerDesig, collegeName, adminName, role, password } = await parseJSON(req);
      const userRole = role || 'student';
      const newId = Date.now();
      const { salt, hash } = hashPassword(password || 'Password@123');

      if (userRole === 'company') {
        if (!companyName || !email || !password) {
          return sendJSON(400, { error: 'Company Name, Recruiter Email, and Password are required.' });
        }
        const assignedId = `CMP-${++companyCounter}`;
        const newComp = { id: newId, companyId: assignedId, name: companyName, logo: '🏢', industry: 'Corporate Partner', manager_name: managerName || 'Recruitment Manager', manager_desig: managerDesig || 'Head of TA', min_cgpa: 7.0, min_ai_score: 70, required_skills: ['Java', 'SQL'], preferred_skills: ['Docker'], certs: [] };
        state.companies.push(newComp);

        const newUser = { id: newId, email, username: email.split('@')[0], companyName, companyId: assignedId, password_hash: hash, salt, role: 'company' };
        state.users.push(newUser);
        const token = generateToken({ id: newUser.id, email, companyId: assignedId, role: 'company' });
        return sendJSON(201, { token, user: newUser, company: newComp });

      } else if (userRole === 'college') {
        if (!collegeName || !email || !password) {
          return sendJSON(400, { error: 'University Name, Admin Email, and Password are required.' });
        }
        const newUser = { id: newId, email, username: email.split('@')[0], collegeName, adminName: adminName || 'University Admin', password_hash: hash, salt, role: 'college' };
        state.users.push(newUser);
        const token = generateToken({ id: newUser.id, email, role: 'college' });
        return sendJSON(201, { token, user: newUser });

      } else {
        const newUser = { id: newId, email, username: email.split('@')[0], student_id: studentId || 'STU-2026', password_hash: hash, salt, role: 'student' };
        state.users.push(newUser);
        state.studentProfiles[newId] = { user_id: newId, name: fullName, email, phone: mobile, student_id: studentId, college: 'Anna University', department: 'CSE' };
        const token = generateToken({ id: newUser.id, email, role: 'student' });
        return sendJSON(201, { token, user: newUser, profile: state.studentProfiles[newId] });
      }
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { identity, companyName, collegeName, password, role } = await parseJSON(req);
      const userRole = role || 'student';
      let user = null;

      if (userRole === 'company') {
        if (!companyName) {
          return sendJSON(400, { error: 'Company Name is REQUIRED for Company Login.' });
        }
        user = state.users.find(u => u.role === 'company' && (u.companyName.toLowerCase() === companyName.toLowerCase() || u.companyId === companyName) && (u.email.toLowerCase() === (identity || '').toLowerCase() || u.username === identity));
        if (!user && (companyName === 'TechCorp Solutions' || companyName === 'CMP-10001')) {
          user = state.users.find(u => u.role === 'company' && u.companyId === 'CMP-10001');
        }

      } else if (userRole === 'college') {
        user = state.users.find(u => u.role === 'college' && (u.email.toLowerCase() === (identity || '').toLowerCase() || u.username === identity));
        if (!user && (identity === 'anna_univ_admin' || identity === 'admin@annauniv.edu')) {
          user = state.users.find(u => u.role === 'college');
        }

      } else {
        user = state.users.find(u => u.role === 'student' && (u.email.toLowerCase() === (identity || '').toLowerCase() || u.student_id === identity || u.username === identity));
      }

      if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
        return sendJSON(401, { error: `Invalid ${userRole.toUpperCase()} credentials or unregistered account.` });
      }

      const token = generateToken({ id: user.id, email: user.email, companyId: user.companyId, role: user.role });
      return sendJSON(200, { token, user, profile: state.studentProfiles[user.id] || state.studentProfiles[1] });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser) return sendJSON(401, { error: 'Not authenticated' });
      return sendJSON(200, { user: authUser, profile: state.studentProfiles[authUser.id] || state.studentProfiles[1] });
    }

    // STUDENT APIS
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
      const newApp = { id: Date.now(), student_id: userId, job_id: targetJob.id, companyId: targetJob.companyId || 'CMP-10001', company_name: targetJob.company_name, job_title: targetJob.title, candidate_name: 'Arjun Sharma', cgpa: 8.8, applied_at: new Date().toISOString().split('T')[0], status: 'Applied', last_updated: new Date().toISOString().split('T')[0], next_step: 'Application submitted.' };
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

    // COMPANY PROTECTED APIS
    if (pathname === '/api/company/dashboard' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') {
        return sendJSON(401, { error: 'Access Denied. Company Authentication Required.' });
      }
      const compId = authUser.companyId || 'CMP-10001';
      const company = state.companies.find(c => c.companyId === compId) || state.companies[0];
      const compJobs = state.jobs.filter(j => j.companyId === compId);
      const compApps = state.applications.filter(a => a.companyId === compId);

      return sendJSON(200, { company, total_jobs: compJobs.length, total_applicants: compApps.length, shortlisted: compApps.filter(a => a.status === 'Shortlisted' || a.status === 'Technical Interview').length, pipeline: compApps });
    }

    if (pathname === '/api/company/jobs' && req.method === 'POST') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') {
        return sendJSON(401, { error: 'Access Denied. Company Authentication Required.' });
      }
      const compId = authUser.companyId || 'CMP-10001';
      const comp = state.companies.find(c => c.companyId === compId) || state.companies[0];
      const body = await parseJSON(req);

      const newJob = { id: Date.now(), company_id: comp.id, companyId: comp.companyId, company_name: comp.name, title: body.title, description: body.description || 'Full job posting', location: body.location || 'Remote', job_type: body.job_type || 'Full-Time', salary_stipend: body.salary_stipend || '₹ 10,00,000 P.A.', required_skills: (body.required_skills || 'Java,SQL').split(','), min_cgpa: Number(body.min_cgpa || 7.0), deadline: body.deadline || '2026-10-30' };
      state.jobs.unshift(newJob);
      return sendJSON(201, { success: true, job: newJob });
    }

    if (pathname === '/api/company/pipeline/stage' && req.method === 'PUT') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') {
        return sendJSON(401, { error: 'Access Denied. Company Authentication Required.' });
      }
      const { applicationId, newStage } = await parseJSON(req);
      const app = state.applications.find(a => a.id === Number(applicationId));
      if (app) {
        app.status = newStage;
        app.last_updated = new Date().toISOString().split('T')[0];
        app.next_step = `Candidate moved to ${newStage} stage.`;
      }
      return sendJSON(200, { success: true, application: app });
    }

    // COLLEGE ADMIN PROTECTED APIS
    if (pathname === '/api/college/dashboard' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'college') {
        return sendJSON(401, { error: 'Access Denied. College Admin Authentication Required.' });
      }
      return sendJSON(200, state.collegeAnalytics);
    }

    if (pathname === '/api/college/students' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'college') {
        return sendJSON(401, { error: 'Access Denied. College Admin Authentication Required.' });
      }
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
  console.log(` SkillBridge Enforced Security Server Running on Port ${port}`);
  console.log(`=======================================================`);
});