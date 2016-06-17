
var dataservice = (function() {
  var address = 'http://localhost:8088';

  var dataservice = {};

  dataservice.get_schema = function(id, on_schema) {
    // TODO currently only the schema of the first resource in tehe data package
    // is returned; on_schema should be able to handle a complete data package
    // which also contains info about the table (title, description).
    d3.json(address + `/table/${id}/schema`, function(err, data) {
      //if (!err && data) data = data.resources[0].schema;
      on_schema(err, data);
    });
  };

  dataservice.get_data = function(id, mapping, on_data) {
    const query = [];
    // create a copy of filter as we will be modifying filter
    let filter = mapping._filter ? Object.assign({}, mapping._filter) : {};
    // process variables that are mapped to an axis
    for (var axis in mapping) {
      if (mapping.hasOwnProperty(axis) && axis !== "_filter") {
        let query_line = {name: mapping[axis]};
        // check if there is a filter for variable
        if (filter[mapping[axis]]) {
          query_line.categories = filter[mapping[axis]];
          delete filter[mapping[axis]];
        }
        query.push(query_line);
      }
    }
    // process variables not on a axis to which a filter has been applied
    for (let variable in filter) {
      if (filter.hasOwnProperty(axis)) {
        query.push({ name: variable, categories: filter[variable]});
      }
    }
    d3.json(address + `/table/${id}/query`)
      .header('Content-Type', 'application/json')
      .post(JSON.stringify(query), on_data);
  }

  dataservice.get_table_list = function(on_list){
    //TODO implement list of table
    d3.json(address, "tables", on_list);
  }

  return dataservice;
})();

module.exports = dataservice;
