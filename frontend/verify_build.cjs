const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const results = [];

function check(name, pass) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
}

// 1. Check all source files exist
const requiredFiles = [
  'src/App.tsx',
  'src/AnalyticsPage.tsx',
  'src/DashboardPage.tsx',
  'src/TradesPage.tsx',
  'src/SettingsPage.tsx',
  'src/AuthPage.tsx',
  'src/types.ts',
  'src/api.ts',
  'src/settings.ts',
  'src/main.tsx',
];

console.log('=== Frontend Build Verification ===\n');

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  check(`Source file exists: ${file}`, fs.existsSync(fullPath));
}

// 2. Check AnalyticsPage has the fix
const analyticsSrc = fs.readFileSync(path.join(__dirname, 'src', 'AnalyticsPage.tsx'), 'utf-8');
check('AnalyticsPage has pagination-aware trades extraction', analyticsSrc.includes('Array.isArray(tradesRes.data)'));
check('AnalyticsPage has null-safe insights', analyticsSrc.includes('?.insights ??'));
check('AnalyticsPage has null-safe recommendations', analyticsSrc.includes('?.recommendations ??'));
check('AnalyticsPage has null-safe analytics guard', analyticsSrc.includes('analytics.totalPnL !== 0'));

// 3. Check DashboardPage has the fix
const dashSrc = fs.readFileSync(path.join(__dirname, 'src', 'DashboardPage.tsx'), 'utf-8');
check('DashboardPage has pagination-aware trades extraction', dashSrc.includes('Array.isArray(data) ? data : data.trades'));

// 4. Check TradesPage uses paginated response
const tradesSrc = fs.readFileSync(path.join(__dirname, 'src', 'TradesPage.tsx'), 'utf-8');
check('TradesPage uses PaginatedTradesResponse', tradesSrc.includes('PaginatedTradesResponse'));
check('TradesPage has account_id param', tradesSrc.includes('account_id'));

// 5. Build check - try TypeScript compile
try {
  execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'pipe', timeout: 30000 });
  check('TypeScript compilation', true);
} catch (e) {
  check('TypeScript compilation', false);
  console.error('  stderr:', e.stderr?.toString().slice(0, 500));
}

// Summary
console.log('\n---');
const pass = results.filter(r => r.pass).length;
const fail = results.filter(r => !r.pass).length;
console.log(`RESULTS: ${pass}/${pass+fail} passed, ${fail} failed`);

fs.writeFileSync('verify_build_results.txt', results.map(r => `${r.pass ? 'PASS' : 'FAIL'}: ${r.name}`).join('\n') + `\n\n${pass}/${pass+fail} passed`);