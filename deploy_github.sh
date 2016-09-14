git checkout gh-pages
git merge dev
npm run build
MESSAGE: "deploy to github $(date +%F)"
echo $MESSAGE
#git commit -am 'deploy to github $(date +%F)'
#git push
#git checkout dev
