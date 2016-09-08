
var dataservice = (function() {
  var address = 'http://localhost:8088';

  var dataservice = {};

  dataservice.get_schema = function(id, on_schema) {
    d3.json(address + `/table/${id}/schema`, function(err, data) {
      on_schema(err, data);
    });
  };

  dataservice.get_data = function(id, mapping, on_data) {
    const query = [];
    for (let axis in mapping) {
      if (mapping.hasOwnProperty(axis)) {
        for (let i = 0; i < mapping[axis].length; ++i) {
          let query_line = {name: mapping[axis][i].variable};
          if (mapping[axis][i].filter) {
            query_line.categories = mapping[axis][i].filter;
          }
          // TODO: currently filter variables can be empty; default category
          // should be set by Mapper; in that case if statement not needed
          if (axis != "filter" || query_line.categories) query.push(query_line);
        }
      }
    }
    d3.json(address + `/table/${id}/query`)
      .header('Content-Type', 'application/json')
      .post(JSON.stringify(query), on_data);
  }

  dataservice.get_table_list = function(on_list){
    //TODO implement list of table
    d3.json(address + "/tables", on_list);
  }

  return dataservice;
})();

dataservice.name = "demo";
dataservice.title= "StatMiner demo data";
dataservice.license = "";

module.exports = dataservice;
