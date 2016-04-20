import React from 'react';
import Selector_axis from './react_selector_axis.jsx';


class Selector_graph extends React.Component {
  
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
    for (var axis  in new_selection) {
      if (new_selection.hasOwnProperty(axis))
        if (new_selection[axis] == change.value) new_selection[axis] = undefined;
    }
    // set variable to new axis
    new_selection[change.name] = change.value;
    // update state
    if (typeof this.props.onChange === "function") 
      this.props.onChange(new_selection);
    this.setState({selection: new_selection});
  }

  render() {
    if (this.props.variables === undefined || this.state.selection === undefined) {
      return (<div className="graph">Foo bar</div>);
    }
    var self = this;
    var axes = this.props.description.axes.map(function(d, i) {
      return (<Selector_axis key={i} description={d} variables={self.props.variables.fields} 
        selection={self.state.selection} onVariableChange={self.handleAxisVariableChange} />);
    });
    return (<div className="graph">{axes}</div>);
  }
 
}

module.exports = Selector_graph;

