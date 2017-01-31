import React from 'react';

class GraphDataDump extends React.Component {

  constructor(props) {
    super(props);
  }

  convertMapping(mapping) {
    // grph.js component uses different format for mapping than used inside
    // StatMiner. Convert StatMiner mapping object to grph.js type
    let map = {};
    for (let axis in mapping) {
      if (mapping.hasOwnProperty(axis) && mapping[axis].length &&
        axis !== "filter") map[axis] = mapping[axis][0].variable;
    }
    return map;
  }

  render() {
    const {graph, schema, data, mapping} = this.props;
    const map = this.convertMapping(mapping.mapping);
    const json = JSON.stringify({graph_type: graph.name,
      mapping: mapping.mapping, map: map, schema: schema, data: data}, null, 2);
    return (<div>
        <h5>Dump of data send to graph</h5>
        <pre>{json}</pre>
      </div>);
  }

}

export default GraphDataDump;
