import React from 'react';
import ReactDOM from 'react-dom';
// TODO move this to the GraphPage dependency?
import graph_descriptions from './graph_descriptions.js';
import { Router, Route, hashHistory, browserHistory, IndexRoute, IndexRedirect } from 'react-router';
import GraphPage from './Pages/GraphPage.jsx';


// App is a simple container needed for Route
const App = (props) => <div>{props.children}</div>

// needed to map route.params unto GraphPage props.
const GraphPageParams = (props) => <GraphPage graph_descriptions={graph_descriptions} {...props.params} />

ReactDOM.render(
  <Router history={hashHistory}>
    <Route path="/" component={App}>
      <IndexRedirect to="/demo/graph/diabetes" />
      <Route path=":provider/graph/:table_id" component={GraphPageParams} />
    </Route>
  </Router>,
  // <GraphPage graph_descriptions={graph_descriptions} table_id="diabetes" />,
  document.getElementById('app')
);
