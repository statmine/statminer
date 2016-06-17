import React from 'react';
import Select from 'react-select';

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
      const {axis, selection} = this.props;
      const filter = event ? event.map((c) => (c.value)) : [];
      this.props.onFilterChange({
        variable: selection[axis.name],
        filter: filter
      })
    }
  }

  render() {
    const {axis, variables, selection, value} = this.props;
    const selected_var = selection[axis.name];
    const options = variables.map(function(v) {
      return {value: v.name, label: v.title};
    });
    // create filter
    let filter = undefined;
    if (selected_var) {
      // lookup selected_var in schema
      let variable = undefined;
      for (let i = 0; i < variables.length; ++i) {
        if (variables[i].name == selected_var) {
          variable = variables[i];
          break;
        }
      }
      // when variable is categorical show filter dialog
      if (variable && variable.categories) {
        var categories = variable.categories.map((c) =>
          ({value: c.name, label: c.title}));
        // check existence of current filter; derive value for select from this
        const current_filter = selection._filter ?
          selection._filter[selected_var] : undefined;
        const current_value = categories.filter((v) =>
          (current_filter && current_filter.indexOf(v.value) !== -1));
        // create filter diaglog
        filter = ([<h4>Select categories</h4>,
          <Select value={current_value} options={categories}
            onChange={this.handleFilterChange} multi={true}/>
        ]);
      }
    }
    // create select
    return (
      <div className="axis">
        <h3>{axis.title}</h3>
        <Select name="filter-categories" value={selected_var} options={options}
          clearable={!axis.required} onChange={this.handleVariableChange}/>
        <div className="axis-filter">
          {filter}
        </div>
      </div>
    );
  }
}

export default MapAxis;
