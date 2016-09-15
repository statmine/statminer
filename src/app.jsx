import React from 'react';
import ReactDOM from 'react-dom';
// TODO move this to the GraphPage dependency?
import graph_descriptions from './graph_descriptions.js';
import { Router, Route, hashHistory, browserHistory, Redirect, IndexRedirect, withRouter } from 'react-router';
import GraphPage from './Pages/GraphPage.jsx';
import TableListPage from './Pages/TableListPage.jsx';
import simpledata_svc from './Services/dataservice.js';
import cbsodata_svc from './Services/cbsodata/dataservice.js';
import "babel-polyfill";

// load data providers
// TODO place this into a seperate config js.
let providers = {};

function add_provider(providers, svc){
  providers[svc.name] = svc;
}

add_provider(providers, cbsodata_svc);
add_provider(providers, simpledata_svc);

// App is a simple container needed for Route
const App = (props) => <div>{props.children}</div>

const GP = (props) => <GraphPage graph_descriptions={graph_descriptions} {...props.params} provider={providers[props.params.provider]}  router={props.router} />

ReactDOM.render(
  <Router history={hashHistory}>
    <Route path="/" component={App}>
      <IndexRedirect to="demo/en/graph/diabetes" />
      <IndexRedirect to="cbs/en/graph/03766eng" />
      <IndexRedirect to="cbs/nl/graph/82311NED" />
      <Redirect from=":provider" to=":provider/en" />       
      <Redirect from=":provider/:language" to=":provider/:language/graph/unknown" />       
      <Route path=":provider/:language/graph/:table_id" component={withRouter(GP)} />
    </Route>
  </Router>,
  document.getElementById('app')
);

 //     <Route path="demo/en/graph/:table_id" component={DemoGraphPageParams} />

      //<Route path="cbs/:language/graph/:table_id" component={withRouter(CbsGraphPageParams)} />
