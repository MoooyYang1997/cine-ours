#!/usr/bin/env node
/**
 * 从 data/places.js 生成 data/places-picker.json（油猴脚本自动拉取）
 * 用法: node scripts/sync-places-picker.cjs
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.join(__dirname, '..')
const src = path.join(root, 'data/places.js')
const out = path.join(root, 'data/places-picker.json')

const code = fs.readFileSync(src, 'utf8')
const sandbox = { PL: null }
vm.runInNewContext(`${code}\nPL = PL;`, sandbox)

if (!Array.isArray(sandbox.PL) || !sandbox.PL.length) {
  console.error('places.js 中未找到 PL 数组')
  process.exit(1)
}

const picker = sandbox.PL.map((p) => ({
  id: p.id,
  nm: p.nm,
  cy: p.cy,
}))

fs.writeFileSync(out, JSON.stringify(picker, null, 2) + '\n')
console.log(`已写入 ${picker.length} 个地点 → data/places-picker.json`)
