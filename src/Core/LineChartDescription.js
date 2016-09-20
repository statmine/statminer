
let linechart_description = {
  name : "linechart",
  title : "Line chart",
  graph : grph.line(),
  is_compatible: (schema) => {
    if (!schema){
      return false;
    }
    const fields = schema.fields;
    return (  fields.find( (field) => field.type == "number")
           && fields.find( (field) => field.type == "date")
    );
  },
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
};

export default linechart_description;
