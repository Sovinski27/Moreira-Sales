const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\lemes\\.gemini\\antigravity\\brain';
const targetDir = 'C:\\Users\\lemes\\Documents\\antigravity\\peaceful-mendel';
const exactPrefix = targetDir.replace(/\\/g, '/').toLowerCase() + '/';

const sessions = fs.readdirSync(brainDir);
let allActions = [];

for (const session of sessions) {
  const transcriptPath = path.join(brainDir, session, '.system_generated', 'logs', 'transcript_full.jsonl');
  if (!fs.existsSync(transcriptPath)) continue;
  
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim() !== '');
  for (const line of lines) {
    try {
      const step = JSON.parse(line);
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'default_api:write_to_file' || tc.name === 'write_to_file') {
            allActions.push({
              time: new Date(step.created_at).getTime(),
              type: 'write',
              file: tc.args.TargetFile,
              content: tc.args.CodeContent
            });
          } else if (tc.name === 'default_api:replace_file_content' || tc.name === 'replace_file_content') {
            allActions.push({
              time: new Date(step.created_at).getTime(),
              type: 'replace',
              file: tc.args.TargetFile,
              target: tc.args.TargetContent,
              replacement: tc.args.ReplacementContent
            });
          }
        }
      }
    } catch(e) {}
  }
}

allActions.sort((a, b) => a.time - b.time);

const vfs = {};

for (const action of allActions) {
  if (!action.file) continue;
  const normalizedFile = action.file.replace(/\\/g, '/').toLowerCase();
  
  // Strict check: must be exactly in the targetDir, not a branched workspace like peaceful-mendel_123
  if (!normalizedFile.startsWith(exactPrefix)) continue;
  
  // Use the original case for the key to save it correctly
  const fileKey = action.file.replace(/\\/g, '/');
  
  if (action.type === 'write') {
    vfs[fileKey] = action.content;
  } else if (action.type === 'replace') {
    // We need to find the correct key case-insensitively just in case
    const actualKey = Object.keys(vfs).find(k => k.toLowerCase() === normalizedFile);
    if (actualKey && vfs[actualKey]) {
      vfs[actualKey] = vfs[actualKey].replace(action.target, action.replacement);
    }
  }
}

let count = 0;
for (const file of Object.keys(vfs)) {
  const normalizedTarget = targetDir.replace(/\\/g, '/');
  // Match prefix ignoring case
  const regex = new RegExp('^' + normalizedTarget, 'i');
  if (regex.test(file)) {
    const relPath = file.substring(normalizedTarget.length + 1);
    const absPath = path.join(targetDir, relPath);
    const dirName = path.dirname(absPath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    fs.writeFileSync(absPath, vfs[file], 'utf8');
    count++;
  }
}

console.log('Restored ' + count + ' files successfully (strict mode)!');
