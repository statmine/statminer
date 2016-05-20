import React from 'react';

class FilterDimension extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const variable = this.props.variable;

    let options = []
    // TODO: a variable of type date doesn't have categories; how do we filter
    // such a variable when we don't know the valid values? A range with type 
    // (year/quarters/..)?
    if (variable.categories) {
      options = variable.categories.map((c) =>
        (<option key={c.name} value={c.name}>{c.title}</option>));
    }

    return (
      <div className="filterdimension">
        <h4>{variable.title}</h4>
        <select>
          {options}
        </select>
      </div>
    );
  }
}

class Filter extends React.Component {
  
  constructor(props) {
    super(props);
  }

  render() {
    const selection = this.props.selection;

    // Select the unselected categorical variables
    let variables = this.props.variables.filter(function(variable) {
      if (variable.type === 'number') return false;
      for (let i in selection) {
        if (selection.hasOwnProperty(i) && selection[i] === variable.name) 
          return false
      }
      return true;
    }).map(function(variable, i) {
      return (<FilterDimension variable={variable} key={i}/>);
      //return (<p>{variable.title}</p>);
    });

    console.log(selection, variables);
     
    // create select
    return (
      <div className="filter">
        <h3>Filter</h3>
        {variables}
      </div>
    );
  }
}

export default Filter;

