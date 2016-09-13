StatMiner
====================================

StatMiner is a tool to interactively and visually explore data sets from 
statistical agencies. 
It was developed for the statistical database of [Statistics Netherlands (cbs)](www.cbs.nl),
but can easily extended to be used on different data sources.

## Development

![https://travis-ci.org/statmine/statminer.svg?branch=dev](https://travis-ci.org/statmine/statminer.svg?branch=dev)

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

Before the app can be used the [simple table service](https://github.com/statmine/simple_table_service) needs to be started, so data can be retrieved from the service

StatMiner can be accessed at [http://localhost:8080/webpack-dev-server/](http://localhost:8080/webpack-dev-server/).
