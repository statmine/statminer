import React from 'react';
import ReactDOM from 'react-dom';
import Dimensions from 'react-dimensions'

class Graph extends React.Component {

  constructor(props) {
    super(props);
  }

  renderGraph() {
    const {graph, schema, data, mapping, height, width} = this.props;
    const w = (this.props.containerWidth - 10) || this.props.width;
    const h = (this.props.containerHeight - 100) || this.props.height;
    const map = this.convertMapping(mapping.mapping);
    if (graph.can_draw(schema, data, map)) {
      //TODO add a spinning wheel while drawing...
      var svg = ReactDOM.findDOMNode(this);
      // clear previous graph
      d3.selectAll(svg.childNodes).remove();
      // setup of graph
      graph.graph.width(w).height(h)
        .schema(schema).assign(map).data(data);
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
    const w = (this.props.containerWidth - 10) || this.props.width;
    const h = (this.props.containerHeight - 100) || this.props.height;
    // TODO: check if style is the best way to get the graph to scale correctly
    // with its container
    const style = { position: "absolute"};
    if (graph.can_draw(schema, data, map)) {
      return (<svg style={style} width={w} height={h}></svg>);
    } else {
      return (<span>No data</span>);
    }
  }
}

export default Dimensions()(Graph);
