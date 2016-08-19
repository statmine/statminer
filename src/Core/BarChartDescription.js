
let barchart_description = {
    name : "barchart",
    title : "Bar chart",
    graph : grph.bar(),
    can_draw : function(schema, data, mapping) {
      // schema, data and mapping are required for drawing
      if (schema === undefined || data === undefined || !data.length || mapping === undefined)
        return false;
      // check required axes
      if (mapping.x === undefined || mapping.y === undefined)
        return false;
      // TODO?: check types
      return true;
    },
    axes: [
      {
        name : 'x',
        title : 'X-Axis',
        accepts : ['number'],
        required: true
      }, {
        name : 'y',
        title : 'Y-Axis',
        accepts: ['categorical', 'date'],
        required: true
      }, {
        name : 'colour',
        title : 'Colour',
        accepts: ['categorical', 'date']
      }, {
        name : 'column',
        title : 'Columns',
        accepts: ['categorical', 'date']
      }, {
        name : 'row',
        title : 'Rows',
        accepts: ['categorical', 'date']
      }
    ]
  };

  export default barchart_description;
  
