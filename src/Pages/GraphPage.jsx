import React from 'react';
import ReactDOM from 'react-dom';
import Graph from '../Components/Graph.jsx';
import Mapper from '../Components/Mapper.jsx';
import GraphType from '../Components/GraphType.jsx';
import dataservice from '../Services/dataservice.js';
import { Router, Route, hashHistory } from 'react-router';


class GraphPage extends React.Component {

  constructor(props) {
    super(props);
    // set initial state
    this.state = {
      mapping: {},
      table_id: props.table_id,
      table_info: null,
      table_schema: undefined,
      data: undefined,
      schema: undefined,
      graph_type: 0
    };

    // bind methods to this
    this.handleMappingChange = this.handleMappingChange.bind(this);
    this.handleGraphTypeChange = this.handleGraphTypeChange.bind(this);
  }

  componentDidMount() {
    var self = this;
    // get the meta from the server; not sure if this is the right method to
    // put this into
    const {table_id} = this.state;
    if (!table_id){
      return;
    }

    dataservice.get_schema(table_id, function(e, d) {
      if (e) {
        console.log("Failed to load meta:", e);
        return;
      }
      self.setState({
        table_schema : (d ? d.resources[0].schema : d),
        table_info   : d
      });
    });
  }

  handleMappingChange(mapping) {
    this.setState({'mapping': mapping});
    var self = this;
    dataservice.get_data(this.state.table_id, mapping.mapping, function(e, d) {
      if (e) {
        console.log("Failed to load data:", e);
        return;
      }
      self.setState({data: d.data, schema: d.schema});
    });
  }

  handleGraphTypeChange(description) {
    const type = this.props.graph_descriptions.findIndex(
      (x) => (x.name === description.name));
    this.setState({graph_type: type});
  }

  render() {

    const {mapping, table_schema, schema, data, graph_type, table_info} = this.state;
    const {graph_descriptions} = this.props;
    const graph_description = graph_descriptions[graph_type];

    const info = {title: "<Unknown>"};
    Object.assign(info, table_info);

    console.log("info", info)

    return (
      <div id="main">
        <article>
          <h2>{info.title}</h2>
          <Graph width="900" height="400"
            graph={graph_description}
            schema={schema} data={data}
            mapping={mapping} />
        </article>
        <nav>
          <GraphType graphtypes={graph_descriptions}
            value = {graph_description}
            onChange={this.handleGraphTypeChange}/>
          <Mapper description={graph_description}
            schema={table_schema}
            initialMapping={mapping}
            onChange={this.handleMappingChange}/>
        </nav>
      </div>
    );
  }
}

export default GraphPage;
