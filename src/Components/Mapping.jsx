import React from 'react';
import MapAxis from './MapAxis.jsx';
import Filter from './Filter.jsx';


class Mapping extends React.Component {
  
  constructor(props) {
    super(props);
    
    // set initial state
    this.state = {
      selection: props.initialSelection
    };
    
    // bind methods to this
    this.handleAxisVariableChange = this.handleAxisVariableChange.bind(this);
  }

  handleAxisVariableChange(change) {
    var new_selection = this.state.selection;
    // check if variable in change.value has already been assigned to other 
    // axis; if so: remove selection
    // for (var axis  in new_selection) {
    //   if (new_selection.hasOwnProperty(axis))
    //     if (new_selection[axis] == change.value) new_selection[axis] = undefined;
    // }
    // set variable to new axis
    new_selection[change.name] = change.value;
    // update state
    if (typeof this.props.onChange === "function") 
      this.props.onChange(new_selection);
    this.setState({selection: new_selection});
  }

  render() {
    const {variables, description} = this.props;
    const {selection} = this.state;
    
    if (variables === undefined || selection === undefined) {
      return (<div className="mapping">Foo bar</div>);
    }
    
    const self = this;
    const axes = description.axes.map(function(axis, i) {
      const types = axis.accepts;
      const fields = variables.fields
        .filter( (f) => types.indexOf(f.type) >=0 )
        .sort((a,b) => a.title > b.title) // sort on title
        ;
      let value = selection[axis.name];
      if (axis.required && fields && fields.length && !value){
        //selection[axis.name] = fields[0].name;
        self.handleAxisVariableChange({name: axis.name, value: fields[0].name});
      }
      return (
        <MapAxis key       = {i} 
                 axis      = {axis} 
                 variables = {fields} 
                 selection = {selection} 
                 value     = {null}
                 onChange  = {self.handleAxisVariableChange} 
        />
      );
    });
    
    return (
      <div className="mapping">
        {axes}
        <Filter selection={selection} variables={variables.fields}/>
      </div>);
  }
 
}

export default Mapping;

