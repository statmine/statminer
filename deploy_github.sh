git checkout gh-pages
rm bundle.js
git merge dev
npm run build
git commit -am "deploy to github $(date +%F)"
git push
git checkout dev
