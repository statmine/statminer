import React from 'react';

// Then import the virtualized Select HOC
import Select from 'react-virtualized-select';

class TableSelect extends React.Component {

  constructor(props) {

    super(props);
    this.state = {
      table_list: [],
      loading : true
    };

    console.log("router", this.props.router);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    if (event) {
      this.props.router.push("/cbs/graph/" + event.value)
    }
  }
  
  componentDidMount(){
    const provider = this.props.provider;
    const set_tables = (e, table_list) => {
      table_list = table_list
        .map( function(t){return {value: t.name, label: t.title, summary: t.summary};})
        .sort((a,b) => a.label > b.label)
        ;
      this.setState({table_list, loading: false})
    }
    provider.get_table_list(set_tables)
  }

  renderValue(value) {
    return value.label;
  }

  renderOption({option}) {
      return ( 
      <span title={option.summary}>
        {option.label}
      </span>
      );
  }

  render() {
    const {table_list} = this.state;
    const {value} = this.props;
    return (
      <div className="table-select">
        <Select value={value} options={table_list} valueRenderer={this.renderValue}
          onChange={this.handleChange}  />
      </div>);
  }
}

TableSelect.propTypes = {
  value: React.PropTypes.string,
  provider: React.PropTypes.object
}

export default TableSelect;