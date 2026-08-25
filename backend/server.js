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

let aiEngine = null;
try { aiEngine = require('./ai_engine'); } catch (e) {}

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-student-module-secret-key-2026';

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

// IN-MEMORY COMPREHENSIVE DATASTORE FOR STUDENT MODULE
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
      name: 'TechCorp Solutions',
      logo: '🏢',
      industry: 'Software & Cloud Tech',
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
      name: 'DataSoft Systems',
      logo: '📊',
      industry: 'AI & Data Science',
      min_cgpa: 8.0,
      min_ai_score: 80,
      required_skills: ['Python', 'SQL', 'Data Structures'],
      preferred_skills: ['Machine Learning', 'TensorFlow'],
      coding_level: 'Advanced',
      experience: 'Fresher',
      certs: ['Data Science Professional']
    },
    {
      id: 3,
      name: 'CloudWorks Tech',
      logo: '☁️',
      industry: 'Cloud Infrastructure',
      min_cgpa: 7.0,
      min_ai_score: 70,
      required_skills: ['JavaScript', 'React', 'Node.js'],
      preferred_skills: ['Kubernetes', 'CI/CD'],
      coding_level: 'Intermediate',
      experience: '0-2 Years',
      certs: ['Cloud Practitioner']
    }
  ],
  jobs: [
    {
      id: 101,
      company_id: 1,
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
    },
    {
      id: 103,
      company_id: 3,
      company_name: 'CloudWorks Tech',
      title: 'Frontend React Developer',
      description: 'Create responsive web user interfaces and optimize Client-Side Web Performance.',
      responsibilities: '1. Craft sleek CSS/Tailwind UI layouts\n2. Integrate REST APIs\n3. Maintain high code quality.',
      location: 'Chennai / Hybrid',
      job_type: 'Full-Time',
      salary_stipend: '₹ 10,50,000 P.A.',
      required_skills: ['JavaScript', 'React', 'HTML', 'CSS'],
      preferred_skills: ['TypeScript', 'Tailwind'],
      min_cgpa: 7.0,
      min_ai_score: 70,
      experience: 'Fresher / 2026 Batch',
      deadline: '2026-10-01'
    }
  ],
  applications: [],
  notifications: []
};

function seedInitialStudentData() {
  const pwd = hashPassword('Student@123');

  state.users = [
    { id: 1, email: 'arjun@skillbridge.ai', username: 'arjun_sharma', student_id: 'STU-2026-101', password_hash: pwd.hash, salt: pwd.salt, role: 'student' }
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
    profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };

  state.resumes[1] = {
    file_name: 'Arjun_Sharma_Software_Resume.pdf',
    upload_date: '2026-08-20',
    file_url: '/uploads/Arjun_Sharma_Resume.pdf',
    status: 'Verified & Active'
  };

  state.academicRecords[1] = [
    { id: 1, semester: 'Semester 1', gpa: 8.2, status: 'Completed', details: 'Core Fundamentals & Mathematics' },
    { id: 2, semester: 'Semester 2', gpa: 8.5, status: 'Completed', details: 'C Programming & Physics' },
    { id: 3, semester: 'Semester 3', gpa: 8.7, status: 'Completed', details: 'Data Structures & OOP Java' },
    { id: 4, semester: 'Semester 4', gpa: 8.9, status: 'Completed', details: 'Database Management Systems' },
    { id: 5, semester: 'Semester 5', gpa: 9.0, status: 'Completed', details: 'Operating Systems & Networks' },
    { id: 6, semester: 'Semester 6', gpa: 9.1, status: 'Completed', details: 'Compiler Design & Web Engineering' }
  ];

  state.schoolEducation[1] = {
    tenth_school: 'St. John Higher Secondary School',
    tenth_board: 'State Board',
    tenth_percentage: 94.5,
    tenth_year: 2020,
    twelfth_school: 'St. John Higher Secondary School',
    twelfth_board: 'State Board',
    twelfth_percentage: 92.8,
    twelfth_year: 2022
  };

  state.backlogs[1] = {
    current_backlogs: 0,
    history_backlogs: 0,
    status: 'No active backlogs'
  };

  state.userSkills[1] = [
    { id: 1, skill_name: 'Java', category: 'Technical', proficiency: 'Advanced', level_pct: 88 },
    { id: 2, skill_name: 'Python', category: 'Technical', proficiency: 'Advanced', level_pct: 90 },
    { id: 3, skill_name: 'JavaScript', category: 'Technical', proficiency: 'Advanced', level_pct: 85 },
    { id: 4, skill_name: 'React', category: 'Technical', proficiency: 'Advanced', level_pct: 86 },
    { id: 5, skill_name: 'SQL', category: 'Technical', proficiency: 'Intermediate', level_pct: 80 },
    { id: 6, skill_name: 'Node.js', category: 'Technical', proficiency: 'Intermediate', level_pct: 78 }
  ];

  state.codingSkills[1] = {
    problem_solving: 85,
    data_structures: 84,
    algorithms: 82,
    competitive_programming: 78,
    leetcode_handle: 'arjun_sharma_2026',
    hackerrank_handle: 'arjun_code',
    codechef_handle: 'arjun_cc',
    codeforces_handle: 'arjun_cf'
  };

  state.assessments[1] = {
    overall_score: 82,
    breakdown: {
      technical: 85,
      coding: 80,
      communication: 78,
      soft_skills: 84
    },
    tests: [
      { id: 1, name: 'SkillBridge Technical Core Test', type: 'Technical', date: '2026-08-15', score: 85, total: 100, status: 'Completed', details: 'Strong grasp in Java, Data Structures and SQL query design.' },
      { id: 2, name: 'Coding & Algorithmic Test', type: 'Coding', date: '2026-08-18', score: 80, total: 100, status: 'Completed', details: 'Attempted: 4 | Solved: 3 | Accuracy: 88% | Time: 42 mins' },
      { id: 3, name: 'Corporate Communication Assessment', type: 'Communication', date: '2026-08-19', score: 78, total: 100, status: 'Completed', details: 'Speaking: 76% | Writing: 82% | Presentation: 75% | Listening: 80%' }
    ]
  };

  state.projects[1] = [
    {
      id: 201,
      title: 'SkillBridge Academia Platform',
      description: 'Full-stack collaboration platform connecting students with corporate recruiters.',
      technologies: ['React', 'Node.js', 'SQL', 'Tailwind'],
      website_url: 'https://skillbridge.dev',
      github_url: 'https://github.com/arjun/skillbridge',
      demo_url: 'https://skillbridge.dev/demo',
      duration: '3 Months',
      role: 'Lead Full-Stack Developer',
      image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 202,
      title: 'AI Resume & Skill Gap Matcher',
      description: 'NLP-driven tool comparing candidate skills against job requirements.',
      technologies: ['Python', 'FastAPI', 'scikit-learn'],
      website_url: 'https://resumeai.dev',
      github_url: 'https://github.com/arjun/resume-matcher',
      demo_url: 'https://resumeai.dev',
      duration: '2 Months',
      role: 'Backend & ML Engineer',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=80'
    }
  ];

  state.internships[1] = [
    {
      id: 301,
      company: 'TechCorp Solutions',
      role: 'Software Engineering Intern',
      internship_type: 'Full-Time (Summer)',
      start_date: '2025-05-01',
      end_date: '2025-07-31',
      details: 'Built REST APIs in Node.js and optimized SQL database queries.',
      technologies_used: ['Node.js', 'Express', 'SQL', 'Docker'],
      company_score: '9.4 / 10',
      certificate_url: '/uploads/internship_cert.pdf'
    }
  ];

  state.certifications[1] = [
    {
      id: 401,
      name: 'AWS Certified Solutions Architect',
      organization: 'Amazon Web Services',
      date: '2025-08-10',
      credential_id: 'AWS-ASA-994821',
      verification_url: 'https://aws.amazon.com/verify/AWS-ASA-994821',
      file_url: '/uploads/aws_cert.pdf'
    }
  ];

  state.seminars[1] = [
    {
      id: 501,
      title: 'Next-Gen Cloud Computing & Microservices',
      institution: 'IIT Madras Technology Summit',
      date: '2025-11-12',
      topic: 'Cloud Architecture Principles',
      description: 'Attended keynotes on serverless functions and event-driven microservices.',
      certificate_url: '/uploads/seminar_cert.pdf'
    }
  ];

  state.workshops[1] = [
    {
      id: 601,
      name: 'Hands-on Docker & Kubernetes Bootcamp',
      organization: 'DevOps India Community',
      date: '2026-01-20',
      topic: 'Container Orchestration',
      certificate_url: '/uploads/workshop_cert.pdf'
    }
  ];

  state.hackathons[1] = [
    {
      id: 701,
      name: 'Smart India Hackathon 2025',
      organization: 'Ministry of Education',
      date: '2025-12-15',
      team_name: 'CyberCrafters',
      project: 'Automated Skill Mapping Portal',
      result: '1st Runner Up (National Rank 2)',
      certificate_url: '/uploads/hackathon_cert.pdf'
    }
  ];

  state.achievements[1] = [
    {
      id: 801,
      title: 'Dean’s Honor List — Academic Excellence',
      description: 'Awarded for securing top 1% CGPA in Computer Science Department.',
      date: '2025-09-05',
      organization: 'Anna University',
      proof_url: '/uploads/deans_list.pdf'
    }
  ];

  state.applications = [
    {
      id: 901,
      student_id: 1,
      job_id: 101,
      company_name: 'TechCorp Solutions',
      job_title: 'Full-Stack Software Engineer',
      applied_at: '2026-08-20',
      status: 'Interview',
      last_updated: '2026-08-24',
      next_step: 'Technical Interview round on Aug 28, 2026',
      interview: {
        date: '2026-08-28',
        time: '11:00 AM IST',
        mode: 'Google Meet (Online Video)',
        meeting_link: 'https://meet.google.com/abc-defg-hij'
      }
    },
    {
      id: 902,
      student_id: 1,
      job_id: 103,
      company_name: 'CloudWorks Tech',
      job_title: 'Frontend React Developer',
      applied_at: '2026-08-22',
      status: 'Shortlisted',
      last_updated: '2026-08-23',
      next_step: 'Awaiting Technical Coding Assessment link'
    }
  ];

  state.notifications[1] = [
    {
      id: 1001,
      title: 'Interview Invitation Scheduled 🎉',
      message: 'TechCorp Solutions scheduled your Technical Interview for Full-Stack Developer on Aug 28, 11:00 AM.',
      type: 'interviews',
      is_read: false,
      created_at: '2026-08-24 10:30 AM',
      target_view: 'applications'
    },
    {
      id: 1002,
      title: 'Application Shortlisted! ⭐',
      message: 'CloudWorks Tech shortlisted your profile for Frontend React Developer position.',
      type: 'updates',
      is_read: false,
      created_at: '2026-08-23 04:15 PM',
      target_view: 'applications'
    },
    {
      id: 1003,
      title: 'AI Skill Recommendation Updated 🤖',
      message: 'New Skill Gap recommendation generated for DataSoft Systems requirement.',
      type: 'system',
      is_read: true,
      created_at: '2026-08-21 02:00 PM',
      target_view: 'ai-skill-analyzer'
    }
  ];
}

seedInitialStudentData();

// Helper: Calculate Profile Completion % & Missing Items
function calculateProfileCompletion(userId) {
  const p = state.studentProfiles[userId || 1] || {};
  const r = state.resumes[userId || 1];
  const s = state.userSkills[userId || 1] || [];
  const proj = state.projects[userId || 1] || [];
  const cert = state.certifications[userId || 1] || [];

  let score = 0;
  let missing = [];

  if (p.name && p.phone && p.location && p.email) score += 20;
  else missing.push('Complete Personal & Contact Details');

  if (p.college && p.department && p.degree && p.year) score += 20;
  else missing.push('Complete Academic Information');

  if (r && r.file_name) score += 20;
  else missing.push('Upload PDF/DOC Resume');

  if (s.length >= 3) score += 20;
  else missing.push('Add at least 3 Technical Skills');

  if (proj.length >= 1 && cert.length >= 1) score += 20;
  else missing.push('Add at least 1 Project & 1 Certificate to Portfolio');

  return { percentage: Math.min(100, score), missingItems: missing };
}

// Helper: AI Skill Match Engine
function calculateAICompanyMatch(userId, companyId) {
  const company = state.companies.find(c => String(c.id) === String(companyId)) || state.companies[0];
  const student = state.studentProfiles[userId || 1] || {};
  const userSkillsList = (state.userSkills[userId || 1] || []).map(s => ({ name: s.skill_name.toLowerCase(), proficiency: s.proficiency }));
  const projectsCount = (state.projects[userId || 1] || []).length;
  const certsCount = (state.certifications[userId || 1] || []).length;
  const gpa = state.academicRecords[userId || 1] ? (state.academicRecords[userId || 1].reduce((acc, r) => acc + r.gpa, 0) / state.academicRecords[userId || 1].length) : 8.8;

  const reqSkills = company.required_skills.map(s => s.toLowerCase());

  let matched = [];
  let gaps = [];

  reqSkills.forEach(req => {
    const found = userSkillsList.find(u => u.name === req || u.name.includes(req) || req.includes(u.name));
    if (found) {
      matched.push({ skill: req, reqLevel: 'Advanced', studentLevel: found.proficiency, gap: 'No Gap' });
    } else {
      gaps.push({ skill: req, reqLevel: 'Advanced', studentLevel: 'Not Added', gap: 'High Gap' });
    }
  });

  const skillScorePct = Math.round((matched.length / reqSkills.length) * 100);
  const academicScorePct = gpa >= company.min_cgpa ? 95 : 60;
  const projScorePct = Math.min(100, projectsCount * 40 + 20);
  const certScorePct = Math.min(100, certsCount * 45 + 10);

  const matchPct = Math.round(skillScorePct * 0.40 + academicScorePct * 0.30 + projScorePct * 0.15 + certScorePct * 0.15);

  const recommendations = [];
  if (gaps.length > 0) {
    gaps.forEach(g => recommendations.push(`Master ${g.skill.toUpperCase()} fundamentals and add to skills portfolio`));
  }
  recommendations.push('Practice 20 Medium/Hard Data Structures & Algorithm problems on LeetCode');
  recommendations.push('Complete cloud deployment certification to increase recruiter match rate');

  return {
    company,
    studentScore: 82,
    matchPercentage: Math.min(98, Math.max(45, matchPct)),
    matchedSkills: matched,
    skillGaps: [...matched, ...gaps],
    recommendations
  };
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
    // 1. AUTHENTICATION REST APIS
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { fullName, email, mobile, studentId, college, department, password } = await parseJSON(req);

      if (!fullName || !email || !password || !studentId) {
        return sendJSON(400, { error: 'Full Name, Email, Student ID, and Password are required.' });
      }

      const existing = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return sendJSON(400, { error: 'Email is already registered. Please log in.' });

      const newId = Date.now();
      const { salt, hash } = hashPassword(password);

      const newUser = { id: newId, email, username: email.split('@')[0], student_id: studentId, password_hash: hash, salt, role: 'student' };
      state.users.push(newUser);

      state.studentProfiles[newId] = {
        user_id: newId,
        name: fullName,
        email,
        phone: mobile || '+91 9876543210',
        student_id: studentId,
        college: college || 'Anna University',
        department: department || 'Computer Science & Engineering',
        degree: 'B.Tech CSE',
        year: '4th Year',
        semester: '7th Semester',
        location: 'Chennai, India'
      };

      const token = generateToken({ id: newUser.id, email: newUser.email, role: 'student' });
      return sendJSON(201, { token, user: newUser, profile: state.studentProfiles[newId] });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { identity, password } = await parseJSON(req);
      const user = state.users.find(u => u.email.toLowerCase() === (identity || '').toLowerCase() || u.student_id === identity || u.username === identity);

      if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
        return sendJSON(401, { error: 'Invalid Email/Student ID or Password credentials.' });
      }

      const token = generateToken({ id: user.id, email: user.email, role: 'student' });
      return sendJSON(200, { token, user, profile: state.studentProfiles[user.id] || state.studentProfiles[1] });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      return sendJSON(200, {
        user: state.users.find(u => u.id === userId) || state.users[0],
        profile: state.studentProfiles[userId] || state.studentProfiles[1]
      });
    }

    // 2. MY PROFILE & RESUME & LINKS REST APIS
    if (pathname === '/api/student/profile' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const profile = state.studentProfiles[userId] || state.studentProfiles[1];
      const completion = calculateProfileCompletion(userId);
      const resume = state.resumes[userId] || state.resumes[1];
      return sendJSON(200, { profile, completion, resume });
    }

    if (pathname === '/api/student/profile' && req.method === 'PUT') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const body = await parseJSON(req);

      state.studentProfiles[userId] = { ...(state.studentProfiles[userId] || {}), ...body };
      return sendJSON(200, { success: true, profile: state.studentProfiles[userId], completion: calculateProfileCompletion(userId) });
    }

    if (pathname === '/api/student/resume' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const { file_name, file_url } = await parseJSON(req);

      state.resumes[userId] = {
        file_name: file_name || 'Student_Resume_2026.pdf',
        upload_date: new Date().toISOString().split('T')[0],
        file_url: file_url || '/uploads/Arjun_Sharma_Resume.pdf',
        status: 'Verified & Active'
      };
      return sendJSON(200, { success: true, resume: state.resumes[userId], completion: calculateProfileCompletion(userId) });
    }

    // 3. ACADEMICS REST APIS
    if (pathname === '/api/student/academics' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const records = state.academicRecords[userId] || state.academicRecords[1];
      const school = state.schoolEducation[userId] || state.schoolEducation[1];
      const backlog = state.backlogs[userId] || state.backlogs[1];
      const gpaAvg = records.length ? (records.reduce((acc, r) => acc + r.gpa, 0) / records.length).toFixed(2) : 8.8;

      return sendJSON(200, { cgpa: Number(gpaAvg), records, school, backlog });
    }

    if (pathname === '/api/student/academics/semester' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const { semester, gpa, status, details } = await parseJSON(req);

      if (!state.academicRecords[userId]) state.academicRecords[userId] = [];
      const newRec = { id: Date.now(), semester, gpa: Number(gpa), status: status || 'Completed', details: details || 'Academic Semester Record' };
      state.academicRecords[userId].push(newRec);

      return sendJSON(201, { success: true, records: state.academicRecords[userId] });
    }

    // 4. SKILLS REST APIS
    if (pathname === '/api/student/skills' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const technical = state.userSkills[userId] || state.userSkills[1];
      const coding = state.codingSkills[userId] || state.codingSkills[1];
      return sendJSON(200, { technical, coding });
    }

    if (pathname === '/api/student/skills' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const { skill_name, proficiency } = await parseJSON(req);

      if (!state.userSkills[userId]) state.userSkills[userId] = [];
      const pMap = { Beginner: 50, Intermediate: 75, Advanced: 90, Expert: 98 };
      const newSkill = { id: Date.now(), skill_name, category: 'Technical', proficiency: proficiency || 'Intermediate', level_pct: pMap[proficiency] || 75 };
      state.userSkills[userId].push(newSkill);

      return sendJSON(201, { success: true, technical: state.userSkills[userId] });
    }

    if (pathname.startsWith('/api/student/skills/') && req.method === 'DELETE') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const skillId = Number(pathname.split('/').pop());

      if (state.userSkills[userId]) {
        state.userSkills[userId] = state.userSkills[userId].filter(s => s.id !== skillId);
      }
      return sendJSON(200, { success: true, technical: state.userSkills[userId] });
    }

    // 5. ASSESSMENTS REST APIS
    if (pathname === '/api/student/assessments' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      return sendJSON(200, state.assessments[userId] || state.assessments[1]);
    }

    // 6. MY PORTFOLIO REST APIS (Projects, Internships, Certs, Seminars, Workshops, Hackathons, Achievements)
    if (pathname === '/api/student/portfolio' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      return sendJSON(200, {
        projects: state.projects[userId] || state.projects[1],
        internships: state.internships[userId] || state.internships[1],
        certifications: state.certifications[userId] || state.certifications[1],
        seminars: state.seminars[userId] || state.seminars[1],
        workshops: state.workshops[userId] || state.workshops[1],
        hackathons: state.hackathons[userId] || state.hackathons[1],
        achievements: state.achievements[userId] || state.achievements[1]
      });
    }

    if (pathname === '/api/student/projects' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const body = await parseJSON(req);

      if (!state.projects[userId]) state.projects[userId] = [];
      const newProj = { id: Date.now(), ...body, technologies: Array.isArray(body.technologies) ? body.technologies : (body.technologies || '').split(',') };
      state.projects[userId].push(newProj);
      return sendJSON(201, { success: true, project: newProj, projects: state.projects[userId] });
    }

    if (pathname.startsWith('/api/student/projects/') && req.method === 'DELETE') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const projId = Number(pathname.split('/').pop());

      if (state.projects[userId]) state.projects[userId] = state.projects[userId].filter(p => p.id !== projId);
      return sendJSON(200, { success: true, projects: state.projects[userId] });
    }

    if (pathname === '/api/student/internships' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const body = await parseJSON(req);

      if (!state.internships[userId]) state.internships[userId] = [];
      const newInt = { id: Date.now(), ...body };
      state.internships[userId].push(newInt);
      return sendJSON(201, { success: true, internship: newInt, internships: state.internships[userId] });
    }

    if (pathname === '/api/student/certificates' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const body = await parseJSON(req);

      if (!state.certifications[userId]) state.certifications[userId] = [];
      const newCert = { id: Date.now(), ...body };
      state.certifications[userId].push(newCert);
      return sendJSON(201, { success: true, certificate: newCert, certifications: state.certifications[userId] });
    }

    // 7. AI SKILL ANALYZER REST APIS
    if (pathname === '/api/ai/companies' && req.method === 'GET') {
      return sendJSON(200, state.companies);
    }

    if (pathname.startsWith('/api/ai/company/') && req.method === 'GET') {
      const companyId = pathname.split('/').pop();
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const analysis = calculateAICompanyMatch(userId, companyId);
      return sendJSON(200, analysis);
    }

    // 8. OPPORTUNITIES & APPLY REST APIS
    if (pathname === '/api/opportunities' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;

      const jobsWithMatch = state.jobs.map(j => {
        const analysis = calculateAICompanyMatch(userId, j.company_id);
        return {
          ...j,
          match_percentage: analysis.matchPercentage
        };
      });
      return sendJSON(200, jobsWithMatch);
    }

    if (pathname.startsWith('/api/opportunities/') && req.method === 'GET') {
      const jobId = Number(pathname.split('/').pop());
      const job = state.jobs.find(j => j.id === jobId);
      if (!job) return sendJSON(404, { error: 'Job Opportunity not found' });
      return sendJSON(200, job);
    }

    if (pathname === '/api/student/apply' && req.method === 'POST') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const { jobId } = await parseJSON(req);

      const targetJob = state.jobs.find(j => j.id === Number(jobId));
      if (!targetJob) return sendJSON(404, { error: 'Job not found' });

      const existingApp = state.applications.find(a => a.student_id === userId && a.job_id === targetJob.id);
      if (existingApp) return sendJSON(400, { error: 'You have already applied for this position.' });

      const newApp = {
        id: Date.now(),
        student_id: userId,
        job_id: targetJob.id,
        company_name: targetJob.company_name,
        job_title: targetJob.title,
        applied_at: new Date().toISOString().split('T')[0],
        status: 'Applied',
        last_updated: new Date().toISOString().split('T')[0],
        next_step: 'Application submitted successfully. Under Review.'
      };

      state.applications.unshift(newApp);
      return sendJSON(201, { success: true, application: newApp });
    }

    // 9. APPLICATIONS REST APIS
    if (pathname === '/api/student/applications' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      const userApps = state.applications.filter(a => a.student_id === userId || userId === 1);
      return sendJSON(200, userApps);
    }

    // 10. NOTIFICATIONS REST APIS
    if (pathname === '/api/student/notifications' && req.method === 'GET') {
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;
      return sendJSON(200, state.notifications[userId] || state.notifications[1] || []);
    }

    if (pathname.startsWith('/api/student/notifications/') && pathname.endsWith('/read') && req.method === 'PUT') {
      const parts = pathname.split('/');
      const notifId = Number(parts[parts.length - 2]);
      const authUser = getAuthUser();
      const userId = authUser ? authUser.id : 1;

      const list = state.notifications[userId] || state.notifications[1] || [];
      const item = list.find(n => n.id === notifId);
      if (item) item.is_read = true;

      return sendJSON(200, { success: true, notifications: list });
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
  console.log(` SkillBridge Student Module Server Running on Port ${port}`);
  console.log(`=======================================================`);
});