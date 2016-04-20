
var dataservice = (function() {
  var address = 'http://localhost:8088';
  
  var dataservice = {};

  dataservice.get_schema = function(on_schema) {
    d3.json(address + '/meta', on_schema);
  };

  dataservice.get_data = function(mapping, on_data) {
    d3.json(address + '/data')
      .header('Content-Type', 'application/json')
      .post(JSON.stringify(mapping), on_data);
  }

  return dataservice;
})();

module.exports = dataservice;
