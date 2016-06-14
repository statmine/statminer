import React from 'react';

class FilterDimension extends React.Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    var new_category = event.target.value;
    if (typeof this.props.onChange === "function") {
      this.props.onChange({
        variable: this.props.variable.name,
        filter: new_category
      });
    }
  }

  render() {
    const {variable, filter} = this.props;

    // Create the list with categories on which can be filtered
    let options = []
    // TODO: a variable of type date doesn't have categories; how do we filter
    // such a variable when we don't know the valid values? A range with type 
    // (year/quarters/..)?
    if (variable.categories) {
      options = variable.categories.map((c) =>
        (<option key={c.name} value={c.name}>{c.title}</option>));
    }

    // Determine from filter which is the currently selecte categorie
    // TODO: check length of filter; and validity
    let selected_category = filter;
    if (!selected_category) {
      selected_category = variable.default || variable.aggregate;
    }

    return (
      <div className="filterdimension">
        <h4>{variable.title}</h4>
        <select value={selected_category} onChange={this.handleChange}>
          {options}
        </select>
      </div>
    );
  }
}

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

