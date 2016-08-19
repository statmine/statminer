import React from 'react';
import Select from 'react-select';

class DimensionFilter extends React.Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    if (typeof this.props.onChange === "function") {
      let filter = [];
      if (event) {
        if (event instanceof Array) filter = event.map((c) => (c.value));
        else filter = [event.value];
      }
      this.props.onChange({
        variable: this.props.schema.name,
        filter: filter
      });
    }
  }

  render() {
    const {schema, filter, multi} = this.props;
    const prefix = this.props.prefix || "";

    // Only need to render when a categorical variable is selected on the axis
    if (!schema || !schema.categories) return null;
    // Create the list of categories from which the user can select
    var options = schema.categories.map( (c) =>
      ({value: c.name, label: prefix + c.title})
    );
    // Check existence of current filter; derive value for select from this
    let value = options.filter((v) =>
      (filter && filter.indexOf(v.value) !== -1));
    if (!multi) value = value[0];
    // Create filter dialog
    return (
      <div className="dimensionFilter">
        <span><i className="fa fa-filter fa-fw"></i></span>
        <Select value={value} options={options}
          onChange={this.handleChange} multi={multi || false}/>
      </div>);
  }
}

DimensionFilter.propTypes = {
  prefix: React.PropTypes.string
}

export default DimensionFilter;
