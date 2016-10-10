import React from 'react';
import DimensionFilter from './DimensionFilter.jsx';

class Filter extends React.Component {

  constructor(props) {
    super(props);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  handleFilterChange(event) {
    if (typeof this.props.onChange === "function") {
      this.props.onChange(event);
    }
  }

  render() {
    const {filter, schema} = this.props;
    const self = this;
    let filter_variables = filter.map(function(f, i) {
      var field = schema.fields.find((x) => x.name === f.variable);
      return (<DimensionFilter key={i} schema={field}
        filter={f.filter}  onChange={self.handleFilterChange} prefix={field.title + ": "}/>);
    });
    // create select
    return (
      <div className="filter">
        <h3>Filter</h3>
        {filter_variables}
      </div>
    );
  }

}

export default Filter;
