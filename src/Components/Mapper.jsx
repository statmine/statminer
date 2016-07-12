import React from 'react';
import MapAxis from './MapAxis.jsx';
import Filter from './Filter.jsx';

class Mapper extends React.Component {

  constructor(props) {
    super(props);
    // bind methods to this
    this.handleAxisVariableChange = this.handleAxisVariableChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  handleAxisVariableChange(change) {
    let mapping = this.props.mapping;
    if (!change.value) {
      mapping.remove_variable_from_axis(change.name);
    } else {
      mapping.add_variable_to_axis(change.name, change.value);
    }
    // signal mapping change
    if (typeof this.props.onChange === "function")
      this.props.onChange(mapping);
  }

  handleFilterChange(change) {
    let mapping = this.props.mapping;
    mapping.add_filter(change.variable, change.filter);
    // signal mapping change
    if (typeof this.props.onChange === "function")
      this.props.onChange(mapping);
  }

  render() {
    const {mapping, schema, description} = this.props;
    if (schema === undefined)
      return (<div className="mapping">Foo bar</div>);
    // Create one element for each of the axes of the graph with which the
    // variables for that axis can be selected
    const self = this;
    const axes = description.axes.map(function(axis, i) {
      const axis_mapping = mapping.mapping[axis.name];
      return (
        <MapAxis key={i} axis={axis} schema={schema} mapping={axis_mapping}
          onChange={self.handleAxisVariableChange}
          onFilterChange={self.handleFilterChange}/>
      );
    });
    // Return mapper component
    return (
      <div className="mapping">
        {axes}
        <Filter filter={mapping.mapping.filter} schema={schema}
          onChange={this.handleFilterChange}/>
      </div>);
  }

}

export default Mapper;
