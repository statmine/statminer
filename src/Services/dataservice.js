
var dataservice = (function() {
  var address = 'http://localhost:8088';
  
  var dataservice = {};

  dataservice.get_schema = function(on_schema) {
    // TODO currently only the schema of the first resource in tehe data package
    // is returned; on_schema should be able to handle a complete data package 
    // which also contains info about the table (title, description).
    d3.json(address + '/table/diabetes/schema', function(err, data) {
      if (!err && data) data = data.resources[0].schema;
      on_schema(err, data);
    });
  };

  dataservice.get_data = function(mapping, on_data) {
    let query = [];
    for (var axis in mapping) {
      if (mapping.hasOwnProperty(axis)) {
        query.push({ name: mapping[axis]});
      }
    }
    console.log("Query:", query);
    d3.json(address + '/table/diabetes/query')
      .header('Content-Type', 'application/json')
      .post(JSON.stringify(query), on_data);
  }
  
  dataservice.get_table_list = function(on_list){
    //TODO implement list of table
    on_list();
  }
  
  return dataservice;
})();

module.exports = dataservice;
