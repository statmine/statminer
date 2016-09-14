import React from 'react';
import ReactDOM from 'react-dom';
// TODO move this to the GraphPage dependency?
import graph_descriptions from './graph_descriptions.js';
import { Router, Route, hashHistory, browserHistory, IndexRoute, IndexRedirect, withRouter } from 'react-router';
import GraphPage from './Pages/GraphPage.jsx';
import TableListPage from './Pages/TableListPage.jsx';
import simpledata_svc from './Services/dataservice.js';
import cbsodata_svc from './Services/cbsodata/dataservice.js';


// App is a simple container needed for Route
const App = (props) => <div>{props.children}</div>

// needed to map route.params unto GraphPage props.
const DemoGraphPageParams = (props) => <GraphPage graph_descriptions={graph_descriptions} provider={simpledata_svc} {...props.params} history={props.history}/>
const DemoTableListPage = (props) => <TableListPage provider={simpledata_svc} {...props} {...props.params} />

const CbsGraphPageParams = (props) => <GraphPage graph_descriptions={graph_descriptions}  provider={cbsodata_svc} {...props.params} router={props.router}/>
const CbsTableListPage = (props) => <TableListPage provider={cbsodata_svc} {...props} {...props.params} />

ReactDOM.render(
  <Router history={hashHistory}>
    <Route path="/" component={App}>
      <IndexRedirect to="demo/graph/diabetes" />
      <IndexRedirect to="cbs/graph/03766eng" />
      <Route path="demo" component={DemoTableListPage} />
      <Route path="demo/graph/:table_id" component={DemoGraphPageParams} />
      <Route path="cbs" component={CbsTableListPage} />
      <Route path="cbs/graph/:table_id" component={withRouter(CbsGraphPageParams)} />
    </Route>
  </Router>,
  document.getElementById('app')
);
