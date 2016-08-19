import React from 'react';

class GraphType extends React.Component {
  constructor(props) {
    super(props);
    // set initial state
    // bind methods to this
    this.handleTypeChange = this.handleTypeChange.bind(this);
  }

  handleTypeChange(event) {
    const value = event.target.value;
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

  handleTypeChange2(event) {
    console.log(event.target.value);
  }

  componentWillMount(){
    this.componentWillReceiveProps(this.props);
  }

  componentWillReceiveProps(props){
    if (props.value === undefined && typeof props.onChange === "function"){
      props.onChange(props.graphtypes[0]);
    }
  }

  render() {
    let {graphtypes, value, onChange} = this.props;
    // create list with options = variables
    let self = this;
    let buttons = graphtypes.map(function(v, i) {
      const c = v.name === value.name ? "radio-btn selected" : "radio-btn";
      return (<button type="button" className={c}
          onClick={self.handleTypeChange} value={v.name}>
        {v.title}
      </button>);
    });

    // TODO remove the onchange, this should not be in the render code. (triggers another render update)
    if (value === undefined){
      if (typeof onChange === "function"){
        onChange(graphtypes[0]);
        return <div></div> ;
      }
    }
    // create select
    return (
      <div className="graphtype">
        <div className="radio-btns">
          {buttons}
        </div>
      </div>
    );
  }
}

export default GraphType;
