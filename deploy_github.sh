git checkout gh-pages
git pull
rm bundle.js
git merge dev
npm run build
git commit -am "deploy to github $(date +%F)"
git push
git checkout dev
