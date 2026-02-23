import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('GitHub not connected');
  return accessToken;
}

const OWNER = 'cecetropicana';
const REPO = 'ClaimFlow';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createBlobWithRetry(octokit: Octokit, content: string, retries = 5): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const blob = await octokit.git.createBlob({ owner: OWNER, repo: REPO, content, encoding: 'base64' });
      return blob.data.sha;
    } catch (e: any) {
      if ((e.status === 403 || e.status === 429) && attempt < retries - 1) {
        const waitTime = Math.min((attempt + 1) * 20000, 60000);
        console.log(`  Rate limited, waiting ${waitTime / 1000}s (attempt ${attempt + 1})...`);
        await sleep(waitTime);
      } else {
        throw e;
      }
    }
  }
  throw new Error('Failed after retries');
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });
  console.log('Authenticated with GitHub.');

  const output = execSync('git ls-files', { encoding: 'utf-8', cwd: '/home/runner/workspace' });
  const files = output.trim().split('\n').filter(f => f.length > 0);
  console.log(`Found ${files.length} tracked files.`);

  const treeItems: Array<{ path: string; mode: '100644' | '100755'; type: 'blob'; sha: string }> = [];
  let processed = 0;
  const BATCH = 10;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (filePath) => {
      const fullPath = path.join('/home/runner/workspace', filePath);
      if (!fs.existsSync(fullPath)) return null;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) return null;
      const content = fs.readFileSync(fullPath).toString('base64');
      const sha = await createBlobWithRetry(octokit, content);
      return { path: filePath, mode: ((stat.mode & 0o111) !== 0 ? '100755' : '100644') as '100644' | '100755', type: 'blob' as const, sha };
    }));
    for (const r of results) { if (r) treeItems.push(r); }
    processed += batch.length;
    console.log(`  ${processed}/${files.length} files uploaded`);
    if (i + BATCH < files.length) await sleep(3000);
  }

  console.log('Creating tree...');
  let parentSha: string | undefined;
  try {
    const ref = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
    parentSha = ref.data.object.sha;
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  const tree = await octokit.git.createTree({ owner: OWNER, repo: REPO, tree: treeItems });
  let commitMsg = 'Update from Replit';
  try { commitMsg = execSync('git log -1 --format=%s', { encoding: 'utf-8', cwd: '/home/runner/workspace' }).trim(); } catch {}

  const commit = await octokit.git.createCommit({
    owner: OWNER, repo: REPO, message: commitMsg, tree: tree.data.sha, parents: parentSha ? [parentSha] : [],
  });

  try {
    await octokit.git.updateRef({ owner: OWNER, repo: REPO, ref: 'heads/main', sha: commit.data.sha, force: true });
  } catch (e: any) {
    if (e.status === 422) {
      await octokit.git.createRef({ owner: OWNER, repo: REPO, ref: 'refs/heads/main', sha: commit.data.sha });
    } else throw e;
  }

  console.log(`\nPush successful!`);
  console.log(`Commit: ${commit.data.sha}`);
  console.log(`URL: https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => { console.error('Push failed:', err.message || err); process.exit(1); });
