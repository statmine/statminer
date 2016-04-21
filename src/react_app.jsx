import React from 'react';
import ReactDOM from 'react-dom';
import Graph from './react_graph.jsx';
import Selector_graph from './react_selector_graph.jsx';
import Select_graphtype from './react_select_graphtype.jsx';
import graph_descriptions from './graph_descriptions.js';
import dataservice from './dataservice.js';

class App extends React.Component {

  constructor(props) {
    super(props);
    // set initial state
    this.state = {
      mapping: {},
      table_schema: undefined,
      data: undefined,
      schema: undefined,
      graph_type: 1
    };
    // bind methods to this
    this.handleMappingChange = this.handleMappingChange.bind(this);
    this.handleGraphTypeChange = this.handleGraphTypeChange.bind(this);
  }

  componentDidMount() {
    var self = this;
    // get the meta from the server; not sure if this is the right method to 
    // put this into
    dataservice.get_schema(function(e, d) {
      if (e) {
        console.log("Failed to load meta:", e);
        return;
      }
      self.setState({table_schema: d});
    });
  }

  handleMappingChange(mapping) {
    this.setState({'mapping': mapping});
    var self = this;
    dataservice.get_data(mapping, function(e, d) {
      if (e) {
        console.log("Failed to load data:", e);
        return;
      }
      self.setState({data: d.data, schema: d.meta});
    });
  }

  handleGraphTypeChange(type) {
    console.log("handleGraphTypeChange", type);
    this.setState({graph_type: type.graph_type});
  }

  render() {
    
    const {mapping, table_schema, schema, data, graph_type} = this.state;
    const graph_desc = this.props.graph_descriptions[graph_type];
    
    console.log("graph_desc:", graph_desc);
    console.log("objects", mapping, table_schema, schema, data);
    console.log("state:", this.state);
    
    return (<div>
      <Graph width="900" height="400" 
        graph={graph_desc}
        schema={schema} data={data} 
        mapping={mapping}/>
      <Select_graphtype graphtypes={this.props.graph_descriptions}
        initialSelection={this.props.graph_descriptions[this.state.graph_type].name}
        onTypeChange={this.handleGraphTypeChange}/>
      <Selector_graph description={graph_desc} 
        variables={table_schema} 
        initialSelection={mapping} 
        onChange={this.handleMappingChange}/>
    </div>);
  }
}


ReactDOM.render(
  <App graph_descriptions={graph_descriptions}/>, 
  document.getElementById('app')
);

/*

*/