const fs = require('fs');
const cur = JSON.parse(fs.readFileSync('eslint-current.json', 'utf8'));
const baseCount = parseInt(fs.readFileSync('client/.lint-baseline', 'utf8').trim(), 10);
const count = (f) => (f.errorCount || 0) + (f.warningCount || 0);
const curCount = cur.reduce((s, f) => s + count(f), 0);
console.log('baseline:', baseCount, '| current:', curCount, '|', curCount <= baseCount ? 'OK (ratchet holds)' : 'REGRESSION +' + (curCount - baseCount));
const newIssues = cur.filter(f => count(f) > 0);
if (newIssues.length) {
  console.log('Files with issues (all must be <= baseline total):');
  newIssues.forEach(f => console.log(' -', f.filePath.replace(/\\/g, '/').split('/client/')[1], count(f)));
}