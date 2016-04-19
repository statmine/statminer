
var React = require('react');
var ReactDOM = require('react-dom');

var Graph = React.createClass({
  getInitialState: function() {
    return {
      graph : this.props.graph.graph
    };
  },
  renderGraph: function() {
    if (this.props.graph.can_draw(this.props.schema, this.props.data, this.props.mapping)) {
      var svg = ReactDOM.findDOMNode(this);
      // clear previous graph
      d3.selectAll(svg.childNodes).remove();
      // setup of graph
      this.state.graph.width(this.props.width)
        .height(this.props.height)
        .schema(this.props.schema)
        .assign(this.props.mapping)
        .data(this.props.data);
      // render
      this.state.graph(d3.select(svg));
    }
  },
  componentDidMount: function() {
    this.renderGraph();
  },
  componentDidUpdate: function() {
    this.renderGraph();
  },
  render: function() {
    if (this.props.graph.can_draw(this.props.schema, this.props.data, this.props.mapping)) {
      return (<svg width={this.props.width} height={this.props.height}></svg>);
    } else {
      return (<span>Invalid mapping</span>);
    }
  }
});


module.exports = Graph;
