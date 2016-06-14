import React from 'react';
import FilterDimension from './FilterDimension.jsx';

class Filter extends React.Component {
  
  constructor(props) {
    super(props);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  handleFilterChange(event) {
    if (typeof this.props.onChange === "function") {
      // update filter
      const mapping = this.props.mapping;
      let filter = mapping._filter || {};
      filter[event.variable] = event.filter;
      // signal change
      this.props.onChange(filter);
    }
  }

  render() {
    const mapping = this.props.mapping;
    const filter = mapping._filter || {};
    const self = this;

    // Select the unselected categorical variables
    let variables = this.props.variables.filter(function(variable) {
      if (variable.type === 'number') return false;
      for (let i in mapping) {
        if (i !== '_filter' && mapping.hasOwnProperty(i) && mapping[i] === variable.name) 
          return false
      }
      return true;
    }).map(function(variable, i) {
      return (<FilterDimension variable={variable} filter={filter[variable.name]} 
        onChange={self.handleFilterChange} key={i}/>);
    });

    // create select
    return (
      <div className="filter">
        <h3>Filter</h3>
        {variables}
      </div>
    );
  }
}

export default Filter;

