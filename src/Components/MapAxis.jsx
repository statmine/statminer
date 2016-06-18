import React from 'react';
import Select from 'react-select';
import FilterAxis from './FilterAxis.jsx'
import {lookup} from '../Utils/utils.js'


class MapAxis extends React.Component {

  constructor(props) {
    super(props);
    this.handleVariableChange = this.handleVariableChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  handleVariableChange(event) {
    if (typeof this.props.onChange === "function") {
      this.props.onChange({
        name: this.props.axis.name,
        value: event ? event.value : undefined
      });
    }
  }

  handleFilterChange(event) {
    if (typeof this.props.onFilterChange === "function") {
      this.props.onFilterChange(event);
    }
  }

  render() {
    const {axis, variables, mapping, value} = this.props;
    const selected_var = mapping[axis.name];
    const variable = lookup(variables, selected_var);
    const options = variables.map(function(v) {
      return {value: v.name, label: v.title};
    });
    return (
      <div className="axis">
        <h3>{axis.title}</h3>
        <Select name="filter-categories" value={selected_var} options={options}
          clearable={!axis.required} onChange={this.handleVariableChange}/>
        <FilterAxis variable={variable} filter={mapping._filter}
          onChange={this.handleFilterChange} />
      </div>
    );
  }
}

export default MapAxis;
