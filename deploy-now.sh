
echo 'DEPLOYING ZEOCHAT: START'

. ./.secrets
#now rm zeochat-web -y
#now rm zeochat-adminweb -y
#now rm zeochat-socket -y
#now rm zeochat-match -y
#now rm zeochat-monitor -y

cd proxy
npm run deploy
cd ../web
npm run deploy
npm run deploy-s3
cd ../adminweb
npm run deploy
cd ../socket
npm run deploy
cd ../match
npm run deploy
cd ../monitor
npm run deploy
cd ..

echo 'DEPLOYING ZEOCHAT: END'