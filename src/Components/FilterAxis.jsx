import React from 'react';
import Select from 'react-select';

class FilterAxis extends React.Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    if (typeof this.props.onChange === "function") {
      const filter = event ? event.map((c) => (c.value)) : [];
      this.props.onChange({
        variable: this.props.variable.name,
        filter: filter
      });
    }
  }

  render() {
    const {schema, filter} = this.props;
    // Only need to render when a categorical variable is selected on the axis
    if (!variable || !schema.categories) return null;
    // Create the list of categories from which the user can select
    var options = schema.categories.map((c) =>
      ({value: c.name, label: c.title}));
    // Check existence of current filter; derive value for select from this
    const value = options.filter((v) =>
      (filter && filter.indexOf(v.value) !== -1));
    // Create filter dialog
    return (
      <div className="axis-filter">
        <h4>Select categories</h4>
        <Select value={value} options={options}
          onChange={this.handleChange} multi={true}/>
      </div>);
  }
}

export default FilterAxis;
