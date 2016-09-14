git checkout gh-pages
git merge dev
npm run build
git commit -am "deploy to github $(date +%F)"
git push
git checkout dev
