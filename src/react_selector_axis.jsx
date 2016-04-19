var React = require('react');

var Selector_axis = React.createClass({
  handleVariableChange: function(event) {
    var value = event.target.value === "__empty" ? undefined : event.target.value;
    this.props.onVariableChange({
      name: this.props.description.name, 
      value: value
    });
  },
  render : function() {
    // create list with options = variables
    var description = this.props.description;
    var options = this.props.variables.map(function(v, i) {
      if (description.accepts.indexOf(v.type) < 0) return undefined;
      return (<option key={i} value={v.name}>{v.title}</option>);
    });
    // add empty option to front of list
    var selected_var = this.props.selection[this.props.description.name] || "__empty";
    options.unshift(<option key={-1} value="__empty">No variable selected</option>);
    // create select
    return (
      <div className="axis">
        <h3>{this.props.description.title}</h3>
        <select value={selected_var} onChange={this.handleVariableChange}>
        {options}
        </select>
      </div>
    );
  }
});

module.exports = Selector_axis;

