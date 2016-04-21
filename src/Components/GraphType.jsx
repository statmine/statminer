import React from 'react';

class GraphType extends React.Component {
  constructor(props) {
    super(props);
    // set initial state
    this.state = {
      selection: props.initialSelection
    };
    // bind methods to this
    this.handleTypeChange = this.handleTypeChange.bind(this);
  }

  handleTypeChange(event) {
    var value = event.target.value;
    this.setState({selection: value});
    if (this.props.onTypeChange) {
      var index = undefined;
      for (var i = 0; i < this.props.graphtypes.length; ++i) {
        if (this.props.graphtypes[i].name === value) {
	  index = i;
	  break;
	}
      }
      this.props.onTypeChange({name: value, index: index});
    }
  }

  render() {
    // create list with options = variables
    
    let options = this.props.graphtypes.map(function(v, i) {
      return (<option key={i} value={v.name}>{v.title}</option>);
    });
    //
    const value = this.state.selection || this.props.graphtypes[0].name;
    // create select
    return (
      <div className="select_graphtype">
        <select value={value} onChange={this.handleTypeChange}>
        {options}
        </select>
      </div>
    );
  }
}

export default GraphType;