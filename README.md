StatMiner
====================================

Install modules

```
npm install
```

Build and run web server

```
npm start
```

(which runs the following command)
```
webpack-dev-server --progress --colors
```

Before the app can be used the simple data service needs to be started, so data can be retrieved from the service

```
cd simple_table_data_service
node server.js
```

StatMiner can be accessed at [http://localhost:8080/webpack-dev-server/](http://localhost:8080/webpack-dev-server/).
