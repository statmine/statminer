
var React = require('react');
var ReactDOM = require('react-dom');
var Graph = require('./react_graph.jsx');
var Selector_graph = require('./react_selector_graph.jsx');
var graph_descriptions = require('./graph_descriptions.js');

var App = React.createClass({
  getInitialState: function() {
    return { 
      mapping: {},
      table_schema: undefined,
      data: undefined,
      schema: undefined
    };
  },
  componentDidMount: function() {
    var self = this;
    // get the meta from the server; not sure if this is the right method to 
    // put this into
    d3.json("http://localhost:8088/meta", function(e, d) {
      if (e) {
        console.log("Failed to load meta:", e);
        return;
      }
      self.setState({table_schema: d});
    });
  },
  handleMappingChange: function(mapping) {
    this.setState({'mapping': mapping});
    var self = this;
    d3.json("http://localhost:8088/data")
      .header("Content-Type", "application/json")
      .post(JSON.stringify(mapping), function(e, d) {
        if (e) {
          console.log("Failed to load data:", e);
          return;
        }
        console.log(d);
        self.setState({data: d.data, schema: d.meta});
      });
  },
  render: function() {
    return (<div>
      <Graph width="900" height="400" 
        graph={this.props.graph_descriptions[1]}
        schema={this.state.schema} data={this.state.data} 
        mapping={this.state.mapping}/>
      <Selector_graph description={this.props.graph_descriptions[1]} 
        variables={this.state.table_schema} 
        initialSelection={this.state.mapping} 
        onChange={this.handleMappingChange}/>
    </div>);
  }
});


ReactDOM.render(
  <App graph_descriptions={graph_descriptions}/>, 
  document.getElementById('app')
);

