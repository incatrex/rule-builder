/**
 * Custom Test Reporter - Extracts and formats bug information from tests
 * Run with: node src/tests/bug-reporter.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function parseTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const bugs = [];
  
  // Match test blocks with "BUG" in the name
  const testRegex = /test\(['"](.*?BUG.*?)['"],\s*async.*?\{([\s\S]*?)\n\s*\}\);/g;
  let match;
  
  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1];
    const testBody = match[2];
    
    // Extract comments that explain the bug
    const commentRegex = /\/\/\s*(.*?BUG.*?)$/gm;
    const comments = [];
    let commentMatch;
    
    while ((commentMatch = commentRegex.exec(testBody)) !== null) {
      comments.push(commentMatch[1].trim());
    }
    
    bugs.push({
      test: testName,
      comments: comments,
      file: path.basename(filePath)
    });
  }
  
  return bugs;
}

function generateBugReport() {
  console.log(`\n${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║                    BUG REPORT - TEST SUITE                   ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Parse test files
  const testFiles = [
    './src/tests/ui-interaction.test.jsx'
  ];
  
  const allBugs = [];
  testFiles.forEach(file => {
    try {
      const bugs = parseTestFile(file);
      allBugs.push(...bugs);
    } catch (err) {
      console.error(`Error parsing ${file}:`, err.message);
    }
  });
  
  if (allBugs.length === 0) {
    console.log(`${colors.green}✓ No bugs documented in tests!${colors.reset}\n`);
    return;
  }
  
  // Print bugs
  allBugs.forEach((bug, index) => {
    console.log(`${colors.bold}${colors.red}🐛 BUG #${index + 1}${colors.reset}`);
    console.log(`${colors.yellow}Test:${colors.reset} ${bug.test}`);
    console.log(`${colors.yellow}File:${colors.reset} ${bug.file}`);
    
    if (bug.comments.length > 0) {
      console.log(`${colors.yellow}Details:${colors.reset}`);
      bug.comments.forEach(comment => {
        console.log(`  ${colors.magenta}→${colors.reset} ${comment}`);
      });
    }
    console.log('');
  });
  
  console.log(`${colors.bold}${colors.cyan}Total Bugs Documented: ${allBugs.length}${colors.reset}\n`);
  
  // Run actual tests and show status
  console.log(`${colors.bold}${colors.cyan}Running tests...${colors.reset}\n`);
  try {
    execSync('npm test -- --run --reporter=verbose', { stdio: 'inherit' });
  } catch (err) {
    // Tests may fail, that's ok for a bug report
  }
}

// Also generate HTML report
function generateHTMLReport() {
  const testFiles = ['./src/tests/ui-interaction.test.jsx'];
  const allBugs = [];
  
  testFiles.forEach(file => {
    try {
      const bugs = parseTestFile(file);
      allBugs.push(...bugs);
    } catch (err) {
      console.error(`Error parsing ${file}:`, err.message);
    }
  });
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bug Report - Rule Builder Test Suite</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .header p {
      font-size: 1.1em;
      opacity: 0.95;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 2px solid #e9ecef;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 3em;
      font-weight: bold;
      color: #f5576c;
    }
    .stat-label {
      font-size: 0.9em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    .bug-card {
      background: #fff;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .bug-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    }
    .bug-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f8f9fa;
    }
    .bug-icon {
      font-size: 3em;
      margin-right: 20px;
    }
    .bug-title {
      flex: 1;
    }
    .bug-number {
      font-size: 1.2em;
      font-weight: bold;
      color: #f5576c;
      margin-bottom: 5px;
    }
    .bug-test-name {
      font-size: 1.3em;
      font-weight: 600;
      color: #212529;
      line-height: 1.4;
    }
    .bug-meta {
      display: inline-block;
      background: #e7f3ff;
      color: #0066cc;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 500;
      margin-top: 10px;
    }
    .bug-details {
      margin-top: 20px;
    }
    .bug-details h3 {
      font-size: 1em;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }
    .bug-comment {
      background: #f8f9fa;
      border-left: 4px solid #f5576c;
      padding: 15px 20px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 0.95em;
      line-height: 1.6;
      color: #495057;
    }
    .footer {
      background: #212529;
      color: white;
      text-align: center;
      padding: 30px;
      font-size: 0.9em;
    }
    .footer a {
      color: #f5576c;
      text-decoration: none;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .stats { flex-direction: column; gap: 20px; }
      .header h1 { font-size: 2em; }
      .bug-header { flex-direction: column; align-items: flex-start; }
      .bug-icon { margin-bottom: 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐛 Bug Report</h1>
      <p>Rule Builder Test Suite - Documented Issues</p>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-number">${allBugs.length}</div>
        <div class="stat-label">Bugs Documented</div>
      </div>
      <div class="stat">
        <div class="stat-number">${testFiles.length}</div>
        <div class="stat-label">Test Files</div>
      </div>
      <div class="stat">
        <div class="stat-number">19</div>
        <div class="stat-label">Total Tests</div>
      </div>
    </div>
    
    <div class="content">
      ${allBugs.length === 0 ? 
        '<div class="bug-card"><p style="text-align:center; font-size:1.2em; color:#28a745;">✓ No bugs documented in tests!</p></div>' :
        allBugs.map((bug, index) => `
          <div class="bug-card">
            <div class="bug-header">
              <div class="bug-icon">🐛</div>
              <div class="bug-title">
                <div class="bug-number">BUG #${index + 1}</div>
                <div class="bug-test-name">${bug.test}</div>
                <div class="bug-meta">${bug.file}</div>
              </div>
            </div>
            ${bug.comments.length > 0 ? `
              <div class="bug-details">
                <h3>Details</h3>
                ${bug.comments.map(comment => `
                  <div class="bug-comment">${comment}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')
      }
    </div>
    
    <div class="footer">
      <p>Generated by Bug Reporter • ${new Date().toLocaleString()}</p>
      <p style="margin-top: 10px;">Run <code style="background: #495057; padding: 2px 8px; border-radius: 4px;">npm run test:bugs</code> to regenerate this report</p>
    </div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync('./bug-report.html', html);
  console.log(`\n${colors.green}✓ HTML report generated: bug-report.html${colors.reset}\n`);
}

// Run both reporters
generateBugReport();
generateHTMLReport();
