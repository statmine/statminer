import React from 'react';

import Graph from '../Components/Graph.jsx';
import GraphDataDump from '../Components/GraphDataDump.jsx';

import Mapping from "../Core/Mapping.js";
import Mapper from '../Components/Mapper.jsx';

import GraphType from '../Components/GraphType.jsx';
// import graph_descriptions from '../graph_descriptions.js';
import { Router, Route, hashHistory } from 'react-router';
import debounce from 'debounce';


class GraphPage extends React.Component {

  constructor(props) {

    super(props);

    // set initial state
    const graph_type = 0; // TODO introduce initialGraphType property
    const graph_description = props.graph_descriptions[graph_type];
    this.state = {
      mapping: new Mapping(graph_description, undefined),
      table_id: props.table_id,
      table_schema: undefined,
      data: undefined,
      schema: undefined,
      graph_type: graph_type,
      loading_data: true
    };
    // bind methods to this
    this.handleMappingChange = this.handleMappingChange.bind(this);
    this.handleGraphTypeChange = this.handleGraphTypeChange.bind(this);
  }

  componentDidMount() {
    // get the meta from the server; not sure if this is the right method to
    // put this into
    const {table_id} = this.state;
    if (!table_id){
      return;
    }
    const dataservice = this.props.provider;
    const self = this;

    dataservice.get_schema(table_id, function(e, d) {
      if (e) {
        console.log("Failed to load meta:", e);
        return;
      }
      let mapping = self.state.mapping;
      mapping.set_schema(d.resources[0].schema);
      self.setState({
        table_schema : d
      });
      self.handleMappingChange(mapping);
    });
  }

  handleMappingChange(mapping) {
    const dataservice = this.props.provider;
    // wait xxx milliseconds before starting to load the data
    // this make selecting multiple items more smooth
    const get_data = debounce(dataservice.get_data, 200);
    //const get_data = dataservice.get_data;

    this.setState({'mapping': mapping, loading_data: true});
    let self = this;
    get_data(this.state.table_id, mapping.mapping, function(e, d) {
      if (e) {
        console.log("Failed to load data:", e);
        return;
      }
      //console.log("schema", d.schema);
      self.setState({data: d.data, schema: d.schema, loading_data: false});
    });
  }

  handleGraphTypeChange(description) {
    const type = this.props.graph_descriptions.findIndex(
      (x) => (x.name === description.name));
    const graph_description = this.props.graph_descriptions[type];
    const fields = this.state.table_schema.resources[0].schema;
    const mapping = new Mapping(graph_description, fields);
    this.setState({graph_type: type, mapping: mapping});
    // triggers redraw, should event flow should be optimized..
    this.handleMappingChange(mapping);
  }

  render() {
    const {mapping, table_schema, schema, data, graph_type, loading_data} = this.state;
    const graph_description = this.props.graph_descriptions[graph_type];
    const fields = table_schema ? table_schema.resources[0].schema : undefined;
    const title = table_schema ? table_schema.title : undefined;
    const loading = (loading_data) ? 
      <div className="loading">
        <i className="fa fa-spinner fa-spin fa-3x fa-fw"></i>
      </div> : null;

    return (  
      <div>
        <div id="main">
          <article>
            <h2>{title}</h2>
            { loading }
            <Graph width="900" height="400"
              schema={schema} data={data}
              graph={graph_description}
              schema={schema} data={data}
              mapping={mapping} update={!loading_data} />
          </article>
          <nav>
            <GraphType graphtypes={this.props.graph_descriptions}
              value = {graph_description}
              onChange={this.handleGraphTypeChange}/>
            <Mapper description={graph_description}
              schema={fields}
              mapping={mapping}
              onChange={this.handleMappingChange}/>
          </nav>
        </div>
        <GraphDataDump  schema={schema} data={data}
          graph={graph_description}
          schema={schema} data={data}
          mapping={mapping} />
      </div>
    );
  }
}

export default GraphPage;
