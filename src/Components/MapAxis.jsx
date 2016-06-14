import React from 'react';
import Select from 'react-select';

class MapAxis extends React.Component {
  
  constructor(props) {
    super(props);
    this.handleVariableChange = this.handleVariableChange.bind(this);
  }

  handleVariableChange(event) {
    if (typeof this.props.onChange === "function") {
      this.props.onChange({
        name: this.props.axis.name, 
        value: event ? event.value : undefined
      });
    }
  }

  render() {
    const {axis, variables, selection, value} = this.props;
    const selected_var = selection[axis.name];
    const options = variables.map(function(v) {
      return {value: v.name, label: v.title};
    });
    // create select
    return (
      <div className="axis">
        <h3>{axis.title}</h3>
        <Select name="filter-categories" value={selected_var} options={options}
          clearable={!axis.required} onChange={this.handleVariableChange}/>
      </div>
    );
  }
}

export default MapAxis;

