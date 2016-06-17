import React from 'react';
import MapAxis from './MapAxis.jsx';
import Filter from './Filter.jsx';


class Mapping extends React.Component {

  constructor(props) {
    super(props);

    // set initial state
    this.state = {
      mapping: props.initialMapping
    };

    // bind methods to this
    this.handleAxisVariableChange = this.handleAxisVariableChange.bind(this);
    this.handleAxisFilterChange = this.handleAxisFilterChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  handleAxisVariableChange(change) {
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
    this.setState({mapping: new_mapping});
  }

  handleAxisFilterChange(change) {
    let new_mapping = this.state.mapping;
    if (!new_mapping._filter) new_mapping._filter = {};
    new_mapping._filter[change.variable] = change.filter;
    if (typeof this.props.onChange === "function")
      this.props.onChange(new_mapping);
    this.setState({mapping: new_mapping});
  }

  handleFilterChange(filter) {
    let new_mapping = this.state.mapping;
    new_mapping._filter = filter;
    if (typeof this.props.onChange === "function")
      this.props.onChange(new_mapping);
    this.setState({mapping: new_mapping});
  }

  render() {
    const {variables, description} = this.props;
    const {mapping} = this.state;

    if (variables === undefined || mapping === undefined) {
      return (<div className="mapping">Foo bar</div>);
    }

    const self = this;
    const axes = description.axes.map(function(axis, i) {
      const types = axis.accepts;
      const fields = variables.fields
        .filter((f) => types.indexOf(f.type) >=0)
        .sort((a,b) => a.title > b.title); // sort on title
      const value = mapping[axis.name];
      if (axis.required && fields && fields.length && !value) {
        //mapping[axis.name] = fields[0].name;
        self.handleAxisVariableChange({name: axis.name, value: fields[0].name});
      }
      return (
        <MapAxis key       = {i}
                 axis      = {axis}
                 variables = {fields}
                 mapping   = {mapping}
                 value     = {null}
                 onChange  = {self.handleAxisVariableChange}
                 onFilterChange = {self.handleAxisFilterChange}
        />
      );
    });

    return (
      <div className="mapping">
        {axes}
        <Filter mapping={mapping} variables={variables.fields}
          onChange={this.handleFilterChange}/>
      </div>);
  }

}

export default Mapping;
