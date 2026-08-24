const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// Environment Variables Helper
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

let aiEngine = null;
try { aiEngine = require('./ai_engine'); } catch (e) { console.error('Failed to load aiEngine:', e); }

// MongoDB Connection (with graceful standalone fallback)
let isMongoDBConnected = false;
let mongoose = null;
try {
  mongoose = require('mongoose');
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
      .then(() => { isMongoDBConnected = true; console.log('✅ Connected to MongoDB Database'); })
      .catch(() => { console.log('ℹ️ Running in Standalone Hybrid Database Mode'); });
  }
} catch (e) { console.log('ℹ️ Running in Standalone Hybrid Database Mode'); }

// Database State Structure
let state = {
  companyCounter: 10001,
  users: [],
  studentProfiles: {},
  companyProfiles: {},
  userSkills: {},
  certifications: {},
  projects: {},
  jobs: [
    {
      id: 301,
      company_id: 3,
      companyId: 'CMP-10001',
      company_name: 'TechCorp Solutions',
      verifiedCompanyBadge: true,
      department: 'Computer Science & Engineering',
      type: 'Full-Time Software Engineer',
      title: 'Software Developer (Full-Stack)',
      description: 'Develop responsive Web Applications and microservices using React, Node.js and SQL.',
      required_skills: ['Python', 'React', 'Node.js'],
      preferred_skills: ['AWS', 'Docker'],
      min_cgpa: 7.5,
      min_ai_score: 75,
      required_year: '4th Year',
      location: 'Bengaluru / Hybrid',
      salary_stipend: '₹ 12,00,000 P.A.',
      deadline: '2026-09-30'
    },
    {
      id: 302,
      company_id: 401,
      companyId: 'CMP-10002',
      company_name: 'DataSoft Systems',
      verifiedCompanyBadge: true,
      department: 'Artificial Intelligence & DS',
      type: 'Full-Time AI Engineer',
      title: 'Java & Spring Boot Engineer',
      description: 'Build high-concurrency microservices using Java and Spring Boot framework.',
      required_skills: ['Java', 'Spring Boot', 'SQL'],
      preferred_skills: ['Docker'],
      min_cgpa: 8.0,
      min_ai_score: 80,
      required_year: '4th Year',
      location: 'Hyderabad / Remote',
      salary_stipend: '₹ 14,00,000 P.A.',
      deadline: '2026-10-15'
    }
  ],
  applications: [
    {
      id: 1,
      studentId: 1,
      companyId: 'CMP-10001',
      jobId: 301,
      studentName: 'Arjun Sharma',
      college: 'Anna University',
      department: 'Computer Science & Engineering',
      cgpa: 8.8,
      aiScore: 94,
      matchScore: 94,
      stage: 'Technical Interview',
      status: 'Technical Interview',
      appliedAt: '2026-08-20'
    }
  ],
  atsPipeline: [
    { candidateId: 1, studentId: 1, companyId: 'CMP-10001', name: 'Arjun Sharma', college: 'Anna University', department: 'Computer Science & Engineering', role: 'Software Developer', aiScore: 94, cgpa: 8.8, matchScore: 94, codeComplexity: 'O(N log N)', stage: 'Technical Interview' }
  ],
  candidatePool: [
    { id: 1, name: 'Arjun Sharma', college: 'Anna University', department: 'Computer Science & Engineering', gpa: 8.8, skills: ['Python', 'JavaScript', 'React', 'Node.js', 'AWS'], aiScore: 94, codeComplexity: 'O(N log N)', certsCount: 1 },
    { id: 2, name: 'Priya Patel', college: 'IIT Madras', department: 'Artificial Intelligence & DS', gpa: 9.2, skills: ['Java', 'Spring Boot', 'SQL', 'Docker'], aiScore: 91, codeComplexity: 'O(N)', certsCount: 2 }
  ],
  verifiedCertificates: {
    '0x8f9a2b7c4d1e6f3a': {
      hash: '0x8f9a2b7c4d1e6f3a',
      studentName: 'Arjun Sharma',
      college: 'Anna University',
      course: 'B.Tech CSE',
      certificateTitle: 'AWS Certified Solutions Architect',
      issuingAuthority: 'Amazon Web Services',
      issueDate: '2025-08-10',
      status: 'VERIFIED ON REGISTER',
      aiValuationScore: 95
    }
  }
};

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

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-enterprise-secret-key-2026';

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

function seedInitialData() {
  const sHash = hashPassword('Student@123');
  const rHash = hashPassword('Recruiter@123');
  const cHash = hashPassword('College@123');

  state.users = [
    { id: 1, email: 'arjun@skillbridge.ai', username: 'arjun_sharma', password_hash: sHash.hash, salt: sHash.salt, role: 'student' },
    { id: 2, email: 'priya@skillbridge.ai', username: 'priya_patel', password_hash: sHash.hash, salt: sHash.salt, role: 'student' },
    { id: 3, email: 'recruiter@techcorp.com', username: 'techcorp_recruiter', companyName: 'TechCorp Solutions', companyId: 'CMP-10001', password_hash: rHash.hash, salt: rHash.salt, role: 'company' },
    { id: 401, email: 'recruiter@datasoft.com', username: 'datasoft_recruiter', companyName: 'DataSoft Systems', companyId: 'CMP-10002', password_hash: rHash.hash, salt: rHash.salt, role: 'company' },
    { id: 4, email: 'admin@annauniv.edu', username: 'anna_univ_admin', password_hash: cHash.hash, salt: cHash.salt, role: 'college' }
  ];

  state.studentProfiles[1] = {
    user_id: 1,
    name: 'Arjun Sharma',
    email: 'arjun@skillbridge.ai',
    phone: '+91 9876543210',
    age: 21,
    gender: 'Male',
    location: 'Chennai, India',
    college: 'Anna University',
    department: 'Computer Science & Engineering',
    degree: 'B.Tech CSE',
    current_year: '4th Year',
    semester: '7th Semester',
    cgpa: 8.8,
    graduation_year: 2026
  };

  state.studentProfiles[2] = {
    user_id: 2,
    name: 'Priya Patel',
    email: 'priya@skillbridge.ai',
    phone: '+91 9876543211',
    age: 21,
    gender: 'Female',
    location: 'Chennai, India',
    college: 'IIT Madras',
    department: 'Artificial Intelligence & DS',
    degree: 'B.Tech AI/DS',
    current_year: '4th Year',
    semester: '7th Semester',
    cgpa: 9.2,
    graduation_year: 2026
  };

  state.companyProfiles[3] = {
    user_id: 3,
    companyId: 'CMP-10001',
    company_name: 'TechCorp Solutions',
    company_username: 'techcorp_recruiter',
    company_email: 'recruiter@techcorp.com',
    industry: 'Software Engineering',
    manager_name: 'Vikram Malhotra',
    manager_email: 'recruiter@techcorp.com',
    manager_designation: 'Head of Talent Acquisition'
  };

  state.companyProfiles[401] = {
    user_id: 401,
    companyId: 'CMP-10002',
    company_name: 'DataSoft Systems',
    company_username: 'datasoft_recruiter',
    company_email: 'recruiter@datasoft.com',
    industry: 'AI & Data Science Technology',
    manager_name: 'Ananya Roy',
    manager_email: 'recruiter@datasoft.com',
    manager_designation: 'Lead Talent Manager'
  };

  state.userSkills[1] = [
    { id: 1, name: 'Python', level: 90 },
    { id: 2, name: 'JavaScript', level: 85 },
    { id: 3, name: 'React', level: 88 },
    { id: 4, name: 'Node.js', level: 80 },
    { id: 5, name: 'SQL', level: 75 }
  ];

  state.userSkills[2] = [
    { id: 10, name: 'Java', level: 92 },
    { id: 11, name: 'Spring Boot', level: 88 },
    { id: 12, name: 'SQL', level: 85 },
    { id: 13, name: 'Docker', level: 80 }
  ];

  state.projects[1] = [
    { id: 201, title: 'Smart SkillBridge Platform', description: 'Academia-Industry Collaboration platform.', technologies: 'Node.js, React, SQLite', github_url: 'https://github.com/arjun/skillbridge', demo_url: 'https://skillbridge.dev', category: 'Web App', duration: '3 Months', role: 'Full Stack Developer', ai_complexity: 94 }
  ];

  state.certifications[1] = [
    { id: 101, name: 'AWS Certified Solutions Architect', organization: 'Amazon Web Services', issued_at: '2025-08-10', cert_url: '/uploads/aws_cert.pdf', hash: '0x8f9a2b7c4d1e6f3a', ai_valuation_score: 95 }
  ];
}

seedInitialData();

// Calculate Student Profile Completion %
function calculateProfileCompletion(userId) {
  const profile = state.studentProfiles[userId || 1] || {};
  const skills = state.userSkills[userId || 1] || [];
  const projects = state.projects[userId || 1] || [];
  const certs = state.certifications[userId || 1] || [];

  let score = 0;
  let missing = [];

  if (profile.name && profile.phone && profile.location) score += 20;
  else missing.push('Complete personal details');

  if (profile.college && profile.department && profile.cgpa) score += 20;
  else missing.push('Complete academic information');

  if (skills.length >= 3) score += 20;
  else missing.push('Add at least 3 technical skills');

  if (projects.length >= 1) score += 20;
  else missing.push('Add at least 1 project submission');

  if (certs.length >= 1) score += 20;
  else missing.push('Upload at least 1 verified certificate');

  return { percentage: Math.min(100, score), missingActions: missing };
}

// Calculate AI Student Skill Score
function calculateAISkillScore(userId) {
  const skills = state.userSkills[userId || 1] || [];
  const certs = state.certifications[userId || 1] || [];
  const projects = state.projects[userId || 1] || [];

  const techScore = skills.length ? Math.round(skills.reduce((acc, s) => acc + (s.level || 50), 0) / skills.length) : 50;
  const projScore = projects.length ? 94 : 50;
  const certScore = certs.length ? 95 : 50;

  const overallScore = Math.round(techScore * 0.40 + projScore * 0.35 + certScore * 0.25);

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    strengths: ['Strong Data Structures & Python fundamentals', 'Proven React & Node.js Web Architecture', 'Verified AWS Cloud Credential'],
    improvements: ['Learn Container Orchestration (Docker/Kubernetes)', 'Deepen System Design & Caching Patterns'],
    recommendedSkills: ['TypeScript', 'GraphQL', 'Docker', 'Redis'],
    recommendedRoles: ['Full-Stack Software Engineer', 'Cloud Developer', 'Backend API Architect']
  };
}

// AUTOMATIC ELIGIBILITY & MATCHING ENGINE (Uses exact skill matching to prevent 'java' matching 'javascript')
function calculateStudentEligibility(studentId, job) {
  const student = state.studentProfiles[studentId || 1] || {};
  const skills = (state.userSkills[studentId || 1] || []).map(s => s.name.trim().toLowerCase());
  const projects = state.projects[studentId || 1] || [];
  const aiScoreObj = calculateAISkillScore(studentId);

  let rawReq = job.required_skills || [];
  if (typeof rawReq === 'string') {
    rawReq = rawReq.split(',').map(s => s.trim());
  } else if (Array.isArray(rawReq)) {
    rawReq = rawReq.flatMap(s => (typeof s === 'string' ? s.split(',') : [s.name])).map(s => s.trim());
  }

  const requiredSkills = rawReq.map(s => s.toLowerCase()).filter(Boolean);

  // Exact skill equality check (or word boundary) so 'java' does NOT match 'javascript'!
  const matchedSkills = requiredSkills.filter(req => skills.some(s => s === req));

  const skillsMatchPct = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 85;
  const academicMatchPct = student.cgpa >= (job.min_cgpa || 7.0) ? 95 : 50;
  const projectMatchPct = projects.length >= 1 ? 90 : 60;
  const certMatchPct = (state.certifications[studentId || 1] || []).length >= 1 ? 95 : 70;

  const totalMatchScore = Math.round(skillsMatchPct * 0.40 + academicMatchPct * 0.30 + projectMatchPct * 0.15 + certMatchPct * 0.15);

  let isEligible = true;
  let reasons = [];

  if (student.cgpa < (job.min_cgpa || 7.0)) {
    isEligible = false;
    reasons.push(`Minimum CGPA requirement is ${job.min_cgpa} (Your CGPA: ${student.cgpa})`);
  }

  if (aiScoreObj.overallScore < (job.min_ai_score || 70)) {
    isEligible = false;
    reasons.push(`Minimum AI Skill Score requirement is ${job.min_ai_score} (Your Score: ${aiScoreObj.overallScore})`);
  }

  if (matchedSkills.length < Math.min(1, requiredSkills.length)) {
    isEligible = false;
    reasons.push(`Missing required technical skills: ${requiredSkills.filter(r => !matchedSkills.includes(r)).join(', ')}`);
  }

  return {
    isEligible,
    eligibilityStatus: isEligible ? 'Eligible' : 'Not Eligible',
    reasons,
    matchScore: totalMatchScore,
    skillsMatchPct,
    academicMatchPct,
    projectMatchPct,
    certMatchPct
  };
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
    });
  });
}

// HTTP Server & Middleware
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

    const foundUser = state.users.find(u => String(u.id) === String(payload.id));
    if (foundUser) {
      return { ...foundUser, companyId: payload.companyId || foundUser.companyId };
    }
    return null;
  };

  try {
    // 1. COMPANY REGISTRATION WITH GENERATED UNIQUE COMPANY ID
    if (pathname === '/api/company/register' && req.method === 'POST') {
      const body = await parseJSONBody(req);
      const { companyName, companyUsername, companyEmail, password, managerName, managerEmail, managerPhone, managerDesignation, companyPhone, companyWebsite, industry, companyAddress, companyDescription } = body;

      if (!companyName || !companyUsername || !password) {
        return sendJSON(400, { error: 'Company Name, Company Username, and Password are required.' });
      }

      const existing = state.users.find(u => u.username.toLowerCase() === companyUsername.toLowerCase() || u.email.toLowerCase() === (companyEmail || '').toLowerCase());
      if (existing) return sendJSON(400, { error: 'Company username or email is already registered.' });

      const newCompanyId = `CMP-${state.companyCounter++}`;
      const { salt, hash } = hashPassword(password);

      const newUser = {
        id: Date.now(),
        email: companyEmail || `${companyUsername}@skillbridge.ai`,
        username: companyUsername,
        companyName,
        companyId: newCompanyId,
        password_hash: hash,
        salt,
        role: 'company'
      };

      state.users.push(newUser);

      state.companyProfiles[newUser.id] = {
        user_id: newUser.id,
        companyId: newCompanyId,
        company_name: companyName,
        company_username: companyUsername,
        company_email: companyEmail || newUser.email,
        company_phone: companyPhone || '',
        company_website: companyWebsite || '',
        industry: industry || 'Technology Solutions',
        company_address: companyAddress || '',
        company_description: companyDescription || '',
        manager_name: managerName || 'Recruiter Admin',
        manager_email: managerEmail || companyEmail,
        manager_phone: managerPhone || '',
        manager_designation: managerDesignation || 'Head of Talent Acquisition'
      };

      const token = generateToken({ id: newUser.id, email: newUser.email, username: newUser.username, role: 'company', companyId: newCompanyId });
      return sendJSON(201, { token, companyId: newCompanyId, user: { id: newUser.id, companyName, companyId: newCompanyId, role: 'company' } });
    }

    // 2. COMPANY LOGIN REQUIRING COMPANY NAME, USERNAME, AND PASSWORD
    if (pathname === '/api/company/login' && req.method === 'POST') {
      const { companyName, companyUsername, password } = await parseJSONBody(req);

      if (!companyName || !companyUsername || !password) {
        return sendJSON(400, { error: 'Company Name, Company Username, and Password are all required for login.' });
      }

      const user = state.users.find(u =>
        u.role === 'company' &&
        u.username.toLowerCase() === companyUsername.toLowerCase() &&
        (u.companyName || '').toLowerCase() === companyName.toLowerCase()
      );

      if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
        return sendJSON(401, { error: 'Invalid Company Name, Username, or Password credentials.' });
      }

      const companyId = user.companyId || 'CMP-10001';
      const token = generateToken({ id: user.id, email: user.email, username: user.username, role: 'company', companyId });

      return sendJSON(200, {
        token,
        companyId,
        user: { id: user.id, companyName: user.companyName, username: user.username, role: 'company', companyId },
        profile: state.companyProfiles[user.id] || {}
      });
    }

    // GENERAL AUTH LOGIN (STUDENT & COLLEGE)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { identity, password } = await parseJSONBody(req);
      const user = state.users.find(u => u.email.toLowerCase() === (identity || '').toLowerCase() || u.username.toLowerCase() === (identity || '').toLowerCase());

      if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
        return sendJSON(401, { error: 'Invalid credentials.' });
      }

      const token = generateToken({ id: user.id, email: user.email, username: user.username, role: user.role, companyId: user.companyId || null });
      return sendJSON(200, {
        token,
        user: { id: user.id, email: user.email, username: user.username, role: user.role, companyId: user.companyId || null },
        profile: state.studentProfiles[user.id] || state.companyProfiles[user.id] || {}
      });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser) return sendJSON(401, { error: 'Unauthorized' });
      return sendJSON(200, { user: authUser, profile: state.studentProfiles[authUser.id] || state.companyProfiles[authUser.id] || {} });
    }

    // STUDENT PROFILE APIS
    if (pathname === '/api/student/profile' && req.method === 'GET') {
      const authUser = getAuthUser();
      const profile = state.studentProfiles[authUser?.id || 1] || state.studentProfiles[1];
      const completion = calculateProfileCompletion(authUser?.id || 1);
      const aiScore = calculateAISkillScore(authUser?.id || 1);
      return sendJSON(200, { profile, completion, aiScore });
    }

    if (pathname === '/api/student/profile' && req.method === 'PUT') {
      const authUser = getAuthUser();
      const body = await parseJSONBody(req);
      const userId = authUser?.id || 1;

      state.studentProfiles[userId] = { ...(state.studentProfiles[userId] || {}), ...body };
      const completion = calculateProfileCompletion(userId);
      const aiScore = calculateAISkillScore(userId);
      return sendJSON(200, { success: true, profile: state.studentProfiles[userId], completion, aiScore });
    }

    // SKILLS APIS
    if (pathname === '/api/student/skills' && req.method === 'GET') {
      const authUser = getAuthUser();
      return sendJSON(200, state.userSkills[authUser?.id || 1] || state.userSkills[1] || []);
    }

    if (pathname === '/api/student/skills' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser?.id || 1;
      const { name, level } = await parseJSONBody(req);

      if (!state.userSkills[userId]) state.userSkills[userId] = [];
      const newSkill = { id: Date.now(), name, level: Number(level) || 80 };
      state.userSkills[userId].push(newSkill);
      return sendJSON(201, { skill: newSkill, skills: state.userSkills[userId], aiScore: calculateAISkillScore(userId) });
    }

    if (pathname.startsWith('/api/student/skills/') && req.method === 'DELETE') {
      const authUser = getAuthUser();
      const userId = authUser?.id || 1;
      const skillId = Number(pathname.split('/').pop());

      if (state.userSkills[userId]) {
        state.userSkills[userId] = state.userSkills[userId].filter(s => s.id !== skillId);
      }
      return sendJSON(200, { success: true, skills: state.userSkills[userId] || [] });
    }

    // CERTIFICATES & PROJECTS APIS
    if (pathname === '/api/student/certifications' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser?.id || 1;
      const { name, organization, issue_date, cert_url } = await parseJSONBody(req);

      const valuation = aiEngine ? aiEngine.evaluateCertificateValuation(name, organization) : { score: 95 };
      const newHash = '0x' + crypto.randomBytes(8).toString('hex');
      const newCert = { id: Date.now(), name, organization, issue_date, cert_url: cert_url || '/uploads/aws_cert.pdf', hash: newHash, ai_valuation_score: valuation.score };

      if (!state.certifications[userId]) state.certifications[userId] = [];
      state.certifications[userId].push(newCert);

      return sendJSON(201, { certificate: newCert, certifications: state.certifications[userId], aiScore: calculateAISkillScore(userId) });
    }

    if (pathname === '/api/student/certifications' && req.method === 'GET') {
      const authUser = getAuthUser();
      return sendJSON(200, state.certifications[authUser?.id || 1] || state.certifications[1] || []);
    }

    if (pathname === '/api/student/projects' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser?.id || 1;
      const { title, description, technologies, github_url, demo_url, category, duration, role } = await parseJSONBody(req);

      const crossCheck = aiEngine ? aiEngine.crossCheckProjectURL(title, github_url, demo_url) : { score: 94 };
      const newProj = { id: Date.now(), title, description, technologies, github_url, demo_url, category, duration, role, ai_complexity: crossCheck.score };

      if (!state.projects[userId]) state.projects[userId] = [];
      state.projects[userId].push(newProj);

      return sendJSON(201, { project: newProj, projects: state.projects[userId], aiScore: calculateAISkillScore(userId) });
    }

    if (pathname === '/api/student/projects' && req.method === 'GET') {
      const authUser = getAuthUser();
      return sendJSON(200, state.projects[authUser?.id || 1] || state.projects[1] || []);
    }

    // OPPORTUNITIES & ELIGIBILITY CHECK FOR STUDENT
    if (pathname === '/api/student/opportunities' && req.method === 'GET') {
      const authUser = getAuthUser();
      const studentId = authUser?.id || 1;

      const jobsWithEligibility = state.jobs.map(j => {
        const evalResult = calculateStudentEligibility(studentId, j);
        return {
          ...j,
          isEligible: evalResult.isEligible,
          eligibilityStatus: evalResult.eligibilityStatus,
          reasons: evalResult.reasons,
          matchScore: evalResult.matchScore
        };
      });
      return sendJSON(200, jobsWithEligibility);
    }

    if (pathname === '/api/student/apply' && req.method === 'POST') {
      const authUser = getAuthUser();
      const studentId = authUser?.id || 1;
      const { jobId } = await parseJSONBody(req);

      const targetJob = state.jobs.find(j => String(j.id) === String(jobId));
      if (!targetJob) return sendJSON(404, { error: 'Job requirement not found' });

      // Verify eligibility before allowing application
      const evalResult = calculateStudentEligibility(studentId, targetJob);
      if (!evalResult.isEligible) {
        return sendJSON(403, { error: `Cannot apply. You are not eligible for this requirement: ${evalResult.reasons.join(', ')}` });
      }

      const student = state.studentProfiles[studentId] || state.studentProfiles[1];

      const newApp = {
        id: Date.now(),
        studentId,
        companyId: targetJob.companyId,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        companyName: targetJob.company_name,
        studentName: student.name,
        college: student.college,
        department: student.department,
        cgpa: student.cgpa,
        aiScore: calculateAISkillScore(studentId).overallScore,
        matchScore: evalResult.matchScore,
        stage: 'Applied',
        status: 'Applied',
        appliedAt: new Date().toISOString().split('T')[0]
      };

      state.applications.unshift(newApp);

      // Add candidate to company's ATS Pipeline
      state.atsPipeline.push({
        candidateId: newApp.id,
        studentId,
        companyId: targetJob.companyId,
        name: student.name,
        college: student.college,
        department: student.department,
        role: targetJob.title,
        aiScore: newApp.aiScore,
        cgpa: student.cgpa,
        matchScore: evalResult.matchScore,
        codeComplexity: 'O(N log N)',
        stage: 'Applied'
      });

      return sendJSON(201, { success: true, application: newApp });
    }

    if (pathname === '/api/student/applications' && req.method === 'GET') {
      const authUser = getAuthUser();
      const studentId = authUser?.id || 1;

      const apps = state.applications.filter(a => a.studentId === studentId);
      return sendJSON(200, apps);
    }

    // STRICT MULTI-TENANT COMPANY AUTHORIZED APIS (companyId derived from JWT session)
    if (pathname === '/api/company/jobs' && req.method === 'POST') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') {
        return sendJSON(403, { error: 'Forbidden: Company Admin credentials required.' });
      }

      const companyId = authUser.companyId || 'CMP-10001';
      const companyProfile = state.companyProfiles[authUser.id] || { company_name: authUser.companyName || 'TechCorp Solutions' };
      const body = await parseJSONBody(req);

      const newJob = {
        id: Date.now(),
        company_id: authUser.id,
        companyId,
        company_name: companyProfile.company_name,
        verifiedCompanyBadge: true,
        title: body.title,
        description: body.description,
        department: body.department || 'Computer Science & Engineering',
        required_skills: body.required_skills ? (Array.isArray(body.required_skills) ? body.required_skills : body.required_skills.split(',')) : ['Python', 'React'],
        min_cgpa: Number(body.min_cgpa) || 7.0,
        min_ai_score: Number(body.min_ai_score) || 75,
        required_year: body.required_year || '4th Year',
        location: body.location || 'Hybrid',
        salary_stipend: body.salary_stipend || '₹ 10,00,000 P.A.',
        deadline: body.deadline || '2026-10-01'
      };

      state.jobs.unshift(newJob);
      return sendJSON(201, { job: newJob });
    }

    if (pathname === '/api/company/jobs' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') return sendJSON(403, { error: 'Forbidden' });

      const companyId = authUser.companyId;
      const companyJobs = state.jobs.filter(j => j.companyId === companyId);
      return sendJSON(200, companyJobs);
    }

    if (pathname === '/api/company/pipeline' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') return sendJSON(403, { error: 'Forbidden' });

      const companyId = authUser.companyId;

      // Filter ATS Pipeline strictly by authenticated companyId
      const companyCandidates = state.atsPipeline.filter(c => c.companyId === companyId);
      return sendJSON(200, companyCandidates);
    }

    if (pathname === '/api/company/pipeline/update' && req.method === 'POST') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') return sendJSON(403, { error: 'Forbidden' });

      const companyId = authUser.companyId;
      const { candidateId, newStage } = await parseJSONBody(req);

      // Verify candidate belongs to this companyId (prevent cross-company tampering!)
      const candidate = state.atsPipeline.find(c => String(c.candidateId) === String(candidateId) && c.companyId === companyId);
      if (!candidate) {
        return sendJSON(403, { error: 'Forbidden: You do not have authorization to modify this candidate.' });
      }

      candidate.stage = newStage;
      const app = state.applications.find(a => String(a.id) === String(candidateId));
      if (app) { app.stage = newStage; app.status = newStage; }

      return sendJSON(200, { success: true, candidate });
    }

    if (pathname === '/api/company/candidates/matched' && req.method === 'GET') {
      const authUser = getAuthUser();
      if (!authUser || authUser.role !== 'company') return sendJSON(403, { error: 'Forbidden' });

      const companyId = authUser.companyId;
      const companyJobs = state.jobs.filter(j => j.companyId === companyId);
      const targetJob = companyJobs[0] || state.jobs[0];

      // Only return candidates who are eligible for this company's job
      const eligibleCandidates = state.candidatePool.map(c => {
        const evalResult = calculateStudentEligibility(c.id, targetJob);
        return {
          ...c,
          isEligible: evalResult.isEligible,
          matchScore: evalResult.matchScore,
          reasons: evalResult.reasons
        };
      }).filter(c => c.isEligible);

      return sendJSON(200, eligibleCandidates);
    }

    // GENERAL APIS
    if (pathname === '/api/ai/skill-score') return sendJSON(200, calculateAISkillScore(getAuthUser()?.id));
    if (pathname === '/api/company/opportunities') return sendJSON(200, state.jobs);
    if (pathname === '/api/college/analytics') return sendJSON(200, { overallPlacementRate: 89, curriculumAlignmentScore: 92 });

    // Static File Serving
    let filePath = path.join(repoRoot, 'frontend', pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) filePath = path.join(repoRoot, 'frontend', 'index.html');

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

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
  console.log(` SkillBridge Multi-Company Platform Running on Port ${port}`);
  console.log(`=======================================================`);
});