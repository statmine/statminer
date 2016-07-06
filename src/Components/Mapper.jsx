import React from 'react';
import MapAxis from './MapAxis.jsx';
import Filter from './Filter.jsx';
import Mapping from '../Core/Mapping.js';

class Mapper extends React.Component {

  constructor(props) {
    super(props);
    // set initial state
    this.state = {
      mapping: props.initialMapping,
      mapping2: new Mapping(props.description, props.variables)
    };

    // bind methods to this
    this.handleAxisVariableChange = this.handleAxisVariableChange.bind(this);
    this.handleAxisFilterChange = this.handleAxisFilterChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  componentWillReceiveProps(next_props) {
    // Often the property variables will not be set when the contructor of
    // Mapper is called as the schema is obtained asynchronically. The property
    // variables is set later. Therefore, we need to update the Mapper object
    // with the new schema
    if (next_props.variables) {
      let mapping = this.state.mapping2;
      mapping.set_schema(next_props.variables);
      this.setState({mapping2: mapping})
    }
  }

  handleAxisVariableChange(change) {
    // === NEW
    let mapping = this.state.mapping2;
    if (!change.value) {
      mapping.remove_variable_from_axis(change.name);
    } else {
      mapping.add_variable_to_axis(change.name, change.value);
    }
    // === OLD
    var new_mapping = this.state.mapping;
    // set variable to new axis
    new_mapping[change.name] = change.value;
    // Check if variable is used in filter; if so remove filter
    if (change.value && new_mapping._filter) {
      delete new_mapping._filter[change.value];
    }
    // when variable is removed from axis; also remove variable from filter
    if (change.value === undefined) {
      const prev = this.state.mapping[change.name];
      if (prev && new_mapping._filter) {
        delete new_mapping._filter[prev]
      }
    }
    // update state
    if (typeof this.props.onChange === "function")
      this.props.onChange(new_mapping);
    this.setState({mapping: new_mapping, mapping2: mapping});
  }

  handleAxisFilterChange(change) {
    // NEW
    let mapping = this.state.mapping2;
    mapping.add_filter(change.variable, change.filter);
    // OLD
    let new_mapping = this.state.mapping;
    if (!new_mapping._filter) new_mapping._filter = {};
    new_mapping._filter[change.variable] = change.filter;
    if (typeof this.props.onChange === "function")
      this.props.onChange(new_mapping);
    this.setState({mapping: new_mapping, mapping2: mapping});
  }

  handleFilterChange(filter) {
    console.log("Mapper::handleFilterChange:", filter);
    return this.handleAxisFilterChange(filter);

    console.log(filter);
    // NEW
    // TODO: now complete filter object is updated; change this as in
    // handleAxisFilterChange
    let mapping = this.state.mapping2;
    for (let variable in filter) {
      if (filter.hasOwnProperty(variable)) {
        mapping.add_filter(variable, filter[variable]);
      }
    }
    // OLD
    let new_mapping = this.state.mapping;
    new_mapping._filter = filter;
    if (typeof this.props.onChange === "function")
      this.props.onChange(new_mapping);
    this.setState({mapping: new_mapping, mapping2: mapping});
  }

  render() {
    const {variables, description} = this.props;
    const {mapping, mapping2} = this.state;

    console.log("Mapper::render", this.state.mapping2.mapping);

    if (variables === undefined || mapping === undefined) {
      return (<div className="mapping">Foo bar</div>);
    }
    // Create one element for each of the axes of the graph with which the
    // variables for that axis can be selected
    const self = this;
    const axes = description.axes.map(function(axis, i) {
      const mapping = mapping2.mapping[axis.name];
      return (
        <MapAxis key={i} axis={axis}  schema={variables} mapping={mapping}
          onChange={self.handleAxisVariableChange}
          onFilterChange={self.handleAxisFilterChange}/>
      );
    });
    // Return mapper componten
    return (
      <div className="mapping">
        {axes}
        <Filter filter={mapping2.mapping.filter} schema={variables}
          onChange={this.handleFilterChange}/>
      </div>);
  }

}

export default Mapper;
