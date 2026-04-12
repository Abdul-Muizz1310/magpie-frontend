#!/usr/bin/env bash
set -euo pipefail

# Push secrets to GitHub Actions for Abdul-Muizz1310/magpie-frontend
# Run from workspace root where .env lives

REPO="Abdul-Muizz1310/magpie-frontend"

python3 -c "
import os, subprocess, sys
env_path = os.path.join(os.environ.get('WORKSPACE', 'c:/Personal/repos'), '.env')
secrets = {
    'VERCEL_TOKEN': 'VERCEL_TOKEN',
}
with open(env_path) as f:
    lines = f.readlines()
env = {}
for line in lines:
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    key, _, val = line.partition('=')
    env[key.strip()] = val.strip()
for gh_name, env_key in secrets.items():
    val = env.get(env_key, '')
    if not val:
        print(f'SKIP {gh_name}: not found in .env')
        continue
    proc = subprocess.run(
        ['gh', 'secret', 'set', gh_name, '--repo', '$REPO'],
        input=val.encode(),
        capture_output=True,
    )
    if proc.returncode == 0:
        print(f'OK   {gh_name}')
    else:
        print(f'FAIL {gh_name}: {proc.stderr.decode()}', file=sys.stderr)
"
