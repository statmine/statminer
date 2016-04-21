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
    const value = event.target.value;
    //this.setState({selection: value});
    const {graphtypes, onChange} = this.props;
    if (typeof onChange === "function"){
      for (var t of graphtypes){
        if (value == t.name){
          onChange(t);
          return;
        }
      }
    }
  }
  
  componentWillMount(){
    this.componentWillReceiveProps(this.props);
  }
  
  componentWillReceiveProps(props){
    console.log("props..")
    if (props.value === undefined && typeof props.onChange === "function"){
      props.onChange(props.graphtypes[0]);
    }
  }

  render() {
    // create list with options = variables
    let {graphtypes, value, onChange} = this.props;
    
    let options = graphtypes.map(function(v, i) {
      return (<option key={v.name} value={v.name}>{v.title}</option>);
    });
    //
    
    if (value === undefined){
      if (typeof onChange === "function"){
        onChange(graphtypes[0]);
        return <div></div> ;
      }
    }    
    // create select
    return (
      <div className="graphtype">
        <select value={value.name} onChange={this.handleTypeChange}>
        {options}
        </select>
      </div>
    );
  }
}

export default GraphType;