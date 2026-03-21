import cp from 'child_process';
try {
  const out = cp.execSync('npx vercel ls frontend --yes').toString();
  const match = out.match(/https:\/\/frontend-[^\s]*\.vercel\.app/);
  console.log('URL=', match ? match[0] : 'not found');
} catch (e) {
  console.error(e);
}
