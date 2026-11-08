#!/bin/sh
# בנייה ופריסה ל-GitHub Pages (ענף gh-pages)
set -e
cd "$(dirname "$0")"
node tests/crossword.test.mjs > /dev/null
npx vite build
cp dist/index.html dist/404.html
[ -f CNAME ] && cp CNAME dist/CNAME
touch dist/.nojekyll
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date +%Y-%m-%d_%H:%M)"
git push -q -f https://github.com/nirbosco/hotam-newsletter.git gh-pages
rm -rf .git
echo "deployed"
