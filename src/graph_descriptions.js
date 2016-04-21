
var graph_descriptions = [
  {
    name : "linechart",
    title : "Line chart",
    graph : grph.line(),
    can_draw : function(schema, data, mapping) {
      // schema, data and mapping are required for drawing
      if (schema === undefined || data === undefined || mapping === undefined) 
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
        accepts : ['date'],
        required: true
      }, {
        name : 'y',
        title : 'Y-Axis',
        accepts: ['number'],
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
  }, {
    name : "bubblechart",
    title : "Bubble chart",
    graph : grph.bubble(),
    can_draw : function(schema, data, mapping) {
      // schema, data and mapping are required for drawing
      if (schema === undefined || data === undefined || mapping === undefined) 
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
        accepts: ['number'],
        required: true
      }, {
        name : 'size',
        title : 'Size',
        accepts: ['number']
      }, {
        name : 'object',
        title : 'Object',
        accepts: ['categorical', 'date']
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
  }
];

module.exports = graph_descriptions;

