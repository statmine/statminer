import React from 'react';
import ReactDOM from 'react-dom';

class Graph extends React.Component {

  constructor(props) {
    super(props);
  }

  renderGraph() {
    const {graph, schema, data, mapping, height, width} = this.props;
    const map = this.convertMapping(mapping.mapping);
    if (graph.can_draw(schema, data, map)) {
      //TODO add a spinning wheel while drawing...
      var svg = ReactDOM.findDOMNode(this);
      // clear previous graph
      d3.selectAll(svg.childNodes).remove();
      // setup of graph
      graph.graph.width(width)
        .height(height)
        .schema(schema)
        .assign(map)
        .data(data);
      // render
      graph.graph(d3.select(svg));
    }
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

  componentDidMount() {
    this.renderGraph();
  }

  componentDidUpdate() {
    this.renderGraph();
  }

  render() {
    const {graph, schema, data, mapping, width, height} = this.props;
    const map = this.convertMapping(mapping.mapping);
    if (graph.can_draw(schema, data, map)) {
      return (<svg width={width} height={height}></svg>);
    } else {
      return (<span>Invalid mapping</span>);
    }
  }
}

export default Graph;
