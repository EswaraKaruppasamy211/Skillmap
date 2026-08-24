const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const root = __dirname;
const dbFile = path.join(root, 'skillmap.db');

let _db = null;

async function init() {
  if (_db) return _db;
  try {
    // ensure file exists
    try { fs.openSync(dbFile, 'a').close(); } catch (e) { /* ignore */ }
    _db = await open({ filename: dbFile, driver: sqlite3.Database });
    await _db.exec(`CREATE TABLE IF NOT EXISTS skill_scores (
      user_email TEXT NOT NULL,
      skill_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      confidence REAL NOT NULL,
      components TEXT,
      last_updated INTEGER NOT NULL,
      PRIMARY KEY (user_email, skill_id)
    )`);
    await _db.exec(`CREATE TABLE IF NOT EXISTS skill_score_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      skill_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      confidence REAL NOT NULL,
      components TEXT,
      created_at INTEGER NOT NULL
    )`);
  } catch (e) {
    console.error('DB init error', e && e.message);
    _db = null;
  }
  return _db;
}

async function saveSkillScores(userEmail, scores) {
  if (!userEmail || !Array.isArray(scores)) return;
  const db = await init();
  if (!db) return;
  const insertSql = 'INSERT OR REPLACE INTO skill_scores (user_email, skill_id, skill_name, score, confidence, components, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const snapSql = 'INSERT INTO skill_score_snapshots (user_email, skill_id, score, confidence, components, created_at) VALUES (?, ?, ?, ?, ?, ?)';
  try {
    await db.run('BEGIN TRANSACTION');
    for (const r of scores) {
      const skillId = (typeof r.skillId === 'number') ? r.skillId : (r.skillId || null);
      const comps = r.components ? JSON.stringify(r.components) : null;
      await db.run(insertSql, userEmail, skillId, r.skillName || '', Math.round(r.score || 0), Number(r.confidence || 0.0), comps, Number(r.lastUpdated || Date.now()));
      await db.run(snapSql, userEmail, skillId, Math.round(r.score || 0), Number(r.confidence || 0.0), comps, Number(r.lastUpdated || Date.now()));
    }
    await db.run('COMMIT');
  } catch (e) {
    try { await db.run('ROLLBACK'); } catch (er) {}
    console.error('saveSkillScores error', e && e.message);
  }
}

async function getSkillScores(userEmail) {
  const db = await init();
  if (!db || !userEmail) return [];
  try {
    const rows = await db.all('SELECT skill_id as skillId, skill_name as skillName, score, confidence, components, last_updated as lastUpdated FROM skill_scores WHERE user_email = ?', userEmail);
    return (rows || []).map(r => ({ skillId: r.skillId, skillName: r.skillName, score: r.score, confidence: r.confidence, lastUpdated: r.lastUpdated, components: r.components ? JSON.parse(r.components) : null }));
  } catch (e) { console.error('getSkillScores error', e && e.message); return []; }
}

async function getPopulationMean(skillId) {
  const db = await init();
  if (!db || typeof skillId !== 'number') return null;
  try {
    const row = await db.get('SELECT AVG(score) as mean FROM skill_scores WHERE skill_id = ?', skillId);
    return row && row.mean ? Math.round(row.mean) : null;
  } catch (e) { console.error('getPopulationMean error', e && e.message); return null; }
}

module.exports = { init, saveSkillScores, getSkillScores, getPopulationMean };
