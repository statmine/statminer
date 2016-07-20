import React from 'react';
import Select from 'react-select';
import DimensionFilter from './DimensionFilter.jsx'


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
    //test
    const {axis, schema, mapping} = this.props;
    // Create the list of fields from which can be selected for the axis.
    // - Filter on supported types for axis
    // - Sort on title
    // - Map to option-list for react-select.
    const supported_types = axis.accepts;
    const options = schema.fields
      .filter((f) => supported_types.indexOf(f.type) >= 0)
      .sort((a,b) => a.title > b.title)
      .map((f) => ({value: f.name, label: f.title}))
      ;

    // Determine if and which variable is currently selected
    const selected_var = mapping.length ? mapping[0].variable : undefined;
    
    const no_choice = (selected_var) && options.length < 2;
    // Lookup schema and filter of selected variable for filter
    const variable_schema = schema.fields.find((x) => x.name === selected_var);
    const filter = mapping.length ? mapping[0].filter : undefined;
    // Render
    return (
      <div className="axis">
        <h3>{axis.title}</h3>
        <Select name="filter-axis" value={selected_var} options={options}
          clearable={!axis.required} onChange={this.handleVariableChange} disabled={no_choice} />
        <DimensionFilter schema={variable_schema} filter={filter}
            onChange={this.handleFilterChange} multi={true} />
      </div>
    );
  }
}

export default MapAxis;
