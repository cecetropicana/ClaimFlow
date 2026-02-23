/**
 * Patent Package PDF Generator
 * Generates a formatted PDF document from the patent package files
 */

import fs from 'fs';
import path from 'path';

interface FileSection {
  claim: string;
  claimTitle: string;
  files: { name: string; content: string; language: string }[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.md': 'markdown',
    '.json': 'json',
  };
  return langMap[ext] || 'text';
}

function readFilesFromDir(dirPath: string): { name: string; content: string; language: string }[] {
  const files: { name: string; content: string; language: string }[] = [];
  
  if (!fs.existsSync(dirPath)) return files;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      const subFiles = readFilesFromDir(fullPath);
      files.push(...subFiles.map(f => ({
        ...f,
        name: `${item.name}/${f.name}`
      })));
    } else if (item.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({
        name: item.name,
        content,
        language: getLanguage(item.name)
      });
    }
  }
  
  return files;
}

function generateHtml(): string {
  const patentDir = 'patent-package';
  
  const sections: FileSection[] = [
    {
      claim: 'Claim 1',
      claimTitle: 'Conditional Action Generation System',
      files: readFilesFromDir(path.join(patentDir, 'claim-1-action-generation'))
    },
    {
      claim: 'Claim 2',
      claimTitle: 'Multi-Agent Orchestration Architecture',
      files: readFilesFromDir(path.join(patentDir, 'claim-2-multi-agent-orchestration'))
    },
    {
      claim: 'Claim 3',
      claimTitle: 'Human-in-the-Loop Approval Workflows',
      files: readFilesFromDir(path.join(patentDir, 'claim-3-hitl-approval'))
    },
    {
      claim: 'Claim 4',
      claimTitle: 'Domain-Specific Agent Analysis System',
      files: readFilesFromDir(path.join(patentDir, 'claim-4-domain-agents'))
    },
    {
      claim: 'Claim 5',
      claimTitle: 'Adaptive Card Rendering System',
      files: readFilesFromDir(path.join(patentDir, 'claim-5-adaptive-cards'))
    },
    {
      claim: 'Shared',
      claimTitle: 'Type Definitions',
      files: readFilesFromDir(path.join(patentDir, 'shared'))
    }
  ];

  const license = fs.readFileSync(path.join(patentDir, 'LICENSE'), 'utf-8');
  const manifest = fs.readFileSync(path.join(patentDir, 'MANIFEST.md'), 'utf-8');

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ForeSight Patent Package</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 100%;
    }
    
    .cover {
      page-break-after: always;
      text-align: center;
      padding-top: 150px;
    }
    
    .cover h1 {
      font-size: 36pt;
      color: #0066cc;
      margin-bottom: 20px;
    }
    
    .cover .subtitle {
      font-size: 18pt;
      color: #666;
      margin-bottom: 60px;
    }
    
    .cover .patent-notice {
      background: #fff3cd;
      border: 2px solid #ffc107;
      padding: 20px;
      border-radius: 8px;
      display: inline-block;
      margin: 40px 0;
    }
    
    .cover .patent-notice h3 {
      color: #856404;
      margin: 0 0 10px 0;
    }
    
    .cover .copyright {
      font-size: 12pt;
      color: #666;
      margin-top: 80px;
    }
    
    h1 {
      color: #0066cc;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
      page-break-after: avoid;
    }
    
    h2 {
      color: #333;
      margin-top: 30px;
      page-break-after: avoid;
    }
    
    h3 {
      color: #555;
      margin-top: 20px;
      page-break-after: avoid;
    }
    
    .section {
      page-break-before: always;
    }
    
    .file-section {
      margin: 20px 0;
      page-break-inside: avoid;
    }
    
    .file-header {
      background: #f0f0f0;
      padding: 8px 12px;
      border-radius: 4px 4px 0 0;
      border: 1px solid #ddd;
      border-bottom: none;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10pt;
      color: #333;
    }
    
    pre {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 0 0 4px 4px;
      padding: 12px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.4;
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    code {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }
    
    .toc {
      page-break-after: always;
    }
    
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    
    .toc li {
      padding: 5px 0;
      border-bottom: 1px dotted #ccc;
    }
    
    .manifest {
      white-space: pre-wrap;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    
    .license {
      white-space: pre-wrap;
      font-family: 'Consolas', monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 20px;
      border: 1px solid #ddd;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: #f0f0f0;
    }
    
    .keyword { color: #0000ff; }
    .string { color: #a31515; }
    .comment { color: #008000; }
    .function { color: #795e26; }
    .type { color: #267f99; }
  </style>
</head>
<body>

<div class="cover">
  <h1>ForeSight</h1>
  <div class="subtitle">Patent Package - Source Code Documentation</div>
  
  <div class="patent-notice">
    <h3>⚠️ PATENT PENDING</h3>
    <p>This document contains proprietary inventions protected under provisional patent application.</p>
  </div>
  
  <div class="copyright">
    <p><strong>Copyright © 2025 Cece Anderson / AverNova LLC</strong></p>
    <p>All Rights Reserved</p>
    <p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</div>

<div class="toc">
  <h1>Table of Contents</h1>
  <ul>
    <li><strong>1. License and Patent Claims</strong></li>
    <li><strong>2. Manifest (Technical Index)</strong></li>
    <li><strong>3. Claim 1: Conditional Action Generation System</strong></li>
    <li><strong>4. Claim 2: Multi-Agent Orchestration Architecture</strong></li>
    <li><strong>5. Claim 3: Human-in-the-Loop Approval Workflows</strong></li>
    <li><strong>6. Claim 4: Domain-Specific Agent Analysis System</strong></li>
    <li><strong>7. Claim 5: Adaptive Card Rendering System</strong></li>
    <li><strong>8. Shared Type Definitions</strong></li>
  </ul>
</div>

<div class="section">
  <h1>1. License and Patent Claims</h1>
  <pre class="license">${escapeHtml(license)}</pre>
</div>

<div class="section">
  <h1>2. Manifest (Technical Index)</h1>
  <pre class="manifest">${escapeHtml(manifest)}</pre>
</div>
`;

  let sectionNum = 3;
  for (const section of sections) {
    html += `
<div class="section">
  <h1>${sectionNum}. ${section.claim}: ${section.claimTitle}</h1>
`;
    
    for (const file of section.files) {
      html += `
  <div class="file-section">
    <div class="file-header">📄 ${escapeHtml(file.name)}</div>
    <pre><code>${escapeHtml(file.content)}</code></pre>
  </div>
`;
    }
    
    html += `</div>`;
    sectionNum++;
  }

  html += `
</body>
</html>`;

  return html;
}

async function main() {
  console.log('Generating patent package PDF...');
  
  const html = generateHtml();
  
  const htmlPath = 'patent-package.html';
  fs.writeFileSync(htmlPath, html);
  console.log(`HTML generated: ${htmlPath}`);
  
  console.log('\nTo convert to PDF:');
  console.log('1. Open patent-package.html in a browser');
  console.log('2. Use Print -> Save as PDF');
  console.log('\nOr use a PDF conversion tool like wkhtmltopdf or Puppeteer.');
}

main().catch(console.error);
