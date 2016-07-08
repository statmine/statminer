import React from 'react';
import MapAxis from './MapAxis.jsx';
import Filter from './Filter.jsx';
import Mapping from '../Core/Mapping.js';

class Mapper extends React.Component {

  constructor(props) {
    super(props);
    // set initial state
    // TODO: initialMapping propertiy ignored; remove?
    this.state = {
      mapping: new Mapping(props.description, props.schema)
    };
    // bind methods to this
    this.handleAxisVariableChange = this.handleAxisVariableChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  componentWillReceiveProps(next_props) {

    if (next_props.description.name !== this.props.description.name) {
      // When the graph type has changed we need to create a new mapping object
      // as the axes of the graph will probably have changed.
      this.setState({
        mapping: new Mapping(next_props.description, next_props.schema)
      })
    } else if (next_props.schema) {
      // Often the property schema will not be set when the contructor of
      // Mapper is called as the schema is obtained asynchronically. The
      // property schema is set later. Therefore, we need to update the Mapper
      // object with the new schema
      let mapping = this.state.mapping;
      mapping.set_schema(next_props.schema);
      this.setState({mapping: mapping})
    }
  }

  handleAxisVariableChange(change) {
    let mapping = this.state.mapping;
    if (!change.value) {
      mapping.remove_variable_from_axis(change.name);
    } else {
      mapping.add_variable_to_axis(change.name, change.value);
    }
    // update state
    if (typeof this.props.onChange === "function")
      this.props.onChange(mapping);
    this.setState({mapping: mapping});
  }

  handleFilterChange(change) {
    let mapping = this.state.mapping;
    mapping.add_filter(change.variable, change.filter);
    // update state
    if (typeof this.props.onChange === "function")
      this.props.onChange(mapping);
    this.setState({mapping: mapping});
  }

  render() {
    const {schema, description} = this.props;
    const {mapping} = this.state;
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
