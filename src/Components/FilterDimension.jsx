import React from 'react';
import Select from 'react-select';

class FilterDimension extends React.Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    if (typeof this.props.onChange === "function") {
      this.props.onChange({
        variable: this.props.schema.name,
        filter: [event ? event.value :
          this.defaultCategory(this.props.schema)]
      });
    }
  }

  render() {
    const {schema, filter} = this.props;
    // Create the list with categories on which can be filtered
    // TODO: a variable of type date doesn't have categories; how do we filter
    // such a variable when we don't know the valid values? A range with type
    // (year/quarters/..)?
    const options = !schema.categories ? [] :
      schema.categories.map((c) => ({value: c.name, label: c.title}));
    // Determine from filter which is the currently selecte categorie
    // TODO: check length of filter; and validity
    const selected_category = options.filter((v) =>
      (filter && filter.indexOf(v.value) !== -1))[0];
    //const selected_category = this.selectedCategory(filter, schema);
    return (
      <div className="filterdimension">
        <h4>{schema.title}</h4>
        <Select value={selected_category} options={options}
          onChange={this.handleChange}/>
      </div>
    );
  }
}

export default FilterDimension;
