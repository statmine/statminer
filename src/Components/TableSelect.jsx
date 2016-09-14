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
    const {router, provider} = this.props;
    if (event) {
      const location = `/${provider.name}/${provider.language}/graph/${event.value}`;
      //console.log("location", location);
      router.push(location);
    }
  }
  
  componentDidMount(){
    this.componentWillReceiveProps(this.props);
    // const provider = this.props.provider;
    // provider.language = this.props.language;

    // const set_tables = (e, table_list) => {
    //   table_list = table_list
    //     .map( function(t){return {value: t.name, label: t.title, summary: t.summary}; })
    //     .sort((a,b) => a.label > b.label)
    //     ;
    //   this.setState({table_list, loading: false})
    // }
    // provider.get_table_list(set_tables)
  }

  componentWillReceiveProps(props){
    const provider = props.provider;
    provider.language = props.language;

    const set_tables = (e, table_list) => {
      table_list = table_list
        .map( function(t){ return {value: t.name, label: t.title, summary: t.summary}; })
        .sort((a,b) => a.label > b.label)
        ;
      this.setState({table_list, loading: false})
    }
    provider.get_table_list(set_tables)
  }

  renderValue(value) {
    return (
      <div>
        <span><i className="fa fa-table" aria-hidden="true"></i> </span>
        {value.label}
      </div>
    );
  }

  renderOption({option}) {
      return (
      <div title={option.summary}> 
      <span><i className="fa fa-table" aria-hidden="true"></i> </span>
        {option.label}
      </div>
      );
  }

  render() {
    const {table_list} = this.state;
    const {value} = this.props;
    return (
      <div className="table-select">
        <label>Table:</label>
        <Select value={value} options={table_list} valueRenderer={this.renderValue}
          onChange={this.handleChange}  />
      </div>);
  }
}

TableSelect.propTypes = {
  value: React.PropTypes.string,
  provider: React.PropTypes.object,
  language: React.PropTypes.string
}

export default TableSelect;