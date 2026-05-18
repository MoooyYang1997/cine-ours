#!/usr/bin/env node
/**
 * 根据 git 提交记录更新 CONTEXT.md 的「当前状态」与「进度日报」。
 * 默认汇总「北京时间昨日」的提交（配合每天 00:00 定时任务）。
 *
 * 用法：
 *   node scripts/update-context.cjs              # 昨日（北京时间）
 *   node scripts/update-context.cjs --today      # 今日至今
 *   node scripts/update-context.cjs --date 2026-05-18
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTEXT_PATH = path.join(ROOT, 'CONTEXT.md');
const TZ = 'Asia/Shanghai';
const MAX_DAILY_ENTRIES = 14;
const AUTO_COMMIT_RE = /^auto:\s*Cursor\s*会话后同步线上/i;

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function shanghaiParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = fmt.format(date).split('-').map(Number);
  return { y, m, d };
}

function formatDateKey({ y, m, d }) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDays(parts, delta) {
  const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + delta, 12, 0, 0));
  return shanghaiParts(dt);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--today')) {
    const today = shanghaiParts();
    return { label: '今日', ...today, mode: 'today' };
  }
  const i = args.indexOf('--date');
  if (i !== -1 && args[i + 1]) {
    const [y, m, d] = args[i + 1].split('-').map(Number);
    return { label: args[i + 1], y, m, d, mode: 'fixed' };
  }
  const yesterday = addDays(shanghaiParts(), -1);
  return { label: formatDateKey(yesterday), ...yesterday, mode: 'yesterday' };
}

function dayRange({ y, m, d, mode }) {
  const start = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} 00:00:00 +0800`;
  let end;
  if (mode === 'today') {
    const now = shanghaiParts();
    end = `${formatDateKey(now)} 23:59:59 +0800`;
  } else {
    const next = addDays({ y, m, d }, 1);
    end = `${formatDateKey(next)} 00:00:00 +0800`;
  }
  return { start, end };
}

function gitLogSince(since, until) {
  try {
    return sh(
      `git log --since="${since}" --until="${until}" --no-merges --pretty=format:%s___%h`
    );
  } catch {
    return '';
  }
}

function gitDiffStat(since, until) {
  try {
    const range = until
      ? `git log --since="${since}" --until="${until}" --format=%H`
      : `git log --since="${since}" --format=%H`;
    const hashes = sh(range)
      .split('\n')
      .filter(Boolean);
    if (!hashes.length) return '';
    const first = hashes[hashes.length - 1];
    const last = hashes[0];
    if (first === last) {
      return sh(`git show --stat --format= ${first}`);
    }
    return sh(`git diff --stat ${first}^..${last}`);
  } catch {
    return '';
  }
}

function parseDiffStat(statText) {
  const files = [];
  for (const line of statText.split('\n')) {
    const m = line.match(/^\s*(.+?)\s+\|\s+\d+/);
    if (m) files.push(m[1].trim());
  }
  return files;
}

function summarizeCommits(raw) {
  if (!raw) return { commits: [], meaningful: [] };
  const commits = raw.split('\n').filter(Boolean).map((line) => {
    const [msg, hash] = line.split('___');
    return { msg: msg || line, hash: hash || '' };
  });
  const meaningful = commits.filter((c) => !AUTO_COMMIT_RE.test(c.msg));
  return { commits, meaningful };
}

function buildDaySummary(commits, files) {
  const { commits: all, meaningful } = commits;
  if (!all.length) return '（当日无 git 提交）';

  const parts = [];
  if (meaningful.length) {
    const msgs = meaningful.slice(0, 6).map((c) => c.msg);
    parts.push(msgs.join('；'));
  } else {
    parts.push(`共 ${all.length} 次提交`);
  }

  if (files.length) {
    const top = files.slice(0, 8).join('、');
    parts.push(`涉及文件：${top}${files.length > 8 ? ' 等' : ''}`);
  }
  return parts.join('。');
}

function readContext() {
  return fs.readFileSync(CONTEXT_PATH, 'utf8');
}

function replaceBlock(content, startMarker, endMarker, body) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`CONTEXT.md 缺少标记：${startMarker} / ${endMarker}`);
  }
  const before = content.slice(0, start + startMarker.length);
  const after = content.slice(end);
  return `${before}\n${body}\n${after}`;
}

function parseDailyLog(content) {
  const start = content.indexOf('<!-- CONTEXT_DAILY_START -->');
  const end = content.indexOf('<!-- CONTEXT_DAILY_END -->');
  if (start === -1 || end === -1) return [];
  const block = content.slice(start, end);
  const entries = [];
  const re = /^### (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=^### |\s*$)/gm;
  let m;
  while ((m = re.exec(block)) !== null) {
    entries.push({ date: m[1], body: m[2].trim() });
  }
  return entries;
}

function upsertDaily(entries, dateKey, summary) {
  const filtered = entries.filter((e) => e.date !== dateKey);
  filtered.unshift({
    date: dateKey,
    body: summary,
  });
  return filtered.slice(0, MAX_DAILY_ENTRIES);
}

function formatDailyMarkdown(entries) {
  if (!entries.length) return '_暂无日报记录_';
  return entries
    .map((e) => `### ${e.date}\n${e.body}`)
    .join('\n\n');
}

function main() {
  const day = parseArgs();
  const dateKey = formatDateKey(day);
  const { start, end } = dayRange(day);
  const nowKey = formatDateKey(shanghaiParts());

  const rawLog = gitLogSince(start, end);
  const commitInfo = summarizeCommits(rawLog);
  const diffStat = gitDiffStat(start, end);
  const files = parseDiffStat(diffStat);
  const summary = buildDaySummary(commitInfo, files);

  let content = readContext();
  const daily = parseDailyLog(content);
  const updatedDaily = upsertDaily(daily, dateKey, summary);

  const statusBody = `**最近自动更新：** ${nowKey} 00:00 北京时间

**上次完成（${dateKey}）：** ${summary}

**正在做：** —

**下一步：** 按「进度日报」与 Issue/对话继续推进；新功能上线后记得在 Supabase Dashboard 验证`;

  content = replaceBlock(
    content,
    '<!-- CONTEXT_STATUS_START -->',
    '<!-- CONTEXT_STATUS_END -->',
    statusBody
  );

  content = replaceBlock(
    content,
    '<!-- CONTEXT_DAILY_START -->',
    '<!-- CONTEXT_DAILY_END -->',
    formatDailyMarkdown(updatedDaily)
  );

  fs.writeFileSync(CONTEXT_PATH, content);
  console.log(`已更新 CONTEXT.md · 汇总 ${dateKey}（${day.label}）`);
  console.log(summary);
}

main();
