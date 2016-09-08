git checkout gh-pages
git merge dev
npm run build
git commit -am 'github deploy'
git push
git checkout dev
