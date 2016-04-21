import React from 'react';

const EMPTY = "";

class MapAxis extends React.Component {
  
  constructor(props) {
    super(props);
    this.handleVariableChange = this.handleVariableChange.bind(this);
  }

  handleVariableChange(event) {
    var value = event.target.value === EMPTY ? undefined : event.target.value;
    this.props.onChange({
      name: this.props.axis.name, 
      value: value
    });
  }
  
  componentWillMount(props){
    
  }

  render() {
    // create list with options = variables
    const {axis, variables, selection, value} = this.props;
     
    const options = variables.map(function(v) {
      return (<option key={v.name} value={v.name}>{v.title}</option>);
    });
    
    // add empty option to front of list
    var selected_var = selection[axis.name] || EMPTY;
    options.unshift(<option key={-1} value={EMPTY}>No variable selected</option>);
    // create select
    return (
      <div className="axis">
        <h3>{axis.title}</h3>
        <select value={selected_var} onChange={this.handleVariableChange}>
          {options}
        </select>
      </div>
    );
  }
}

export default MapAxis;

