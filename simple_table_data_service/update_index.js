

var fs = require('fs');
var path = require('path');

update_tables = function(data_dir, fields_to_copy) {

  data_dir = data_dir || "./data"
  fields_to_copy = fields_to_copy || ["name", "title", "summary", "description"];

  var tables = [];

  function add_table(file) {

    fs.readFile(data_dir + "/" + file + '/datapackage.json', function(err, table_schema) {
      console.log("===========================");
      console.log("Reading table in '" + file + "'.");
      if (err) {
        console.log("Failed to read datapackage.json.");
        console.log(err);
        return;
      }
      var schema = JSON.parse(table_schema);

      var table = {};
      for (var i = 0; i < fields_to_copy.length; ++i) {
        var f = fields_to_copy[i];
        if (schema[f] !== undefined) table[f] = schema[f];
      }
      // check if table name matches directory name; table service expects table
      // with name x to be in directory x.
      if (table.name !== file) {
        console.log("Name of table '" + table.name + 
          "' doesn't match director name '" + file + "'. Changing name to " +
          "directory name.");
        table.name = file;
      }
      // print some info
      console.log("Name: '" + table.name + "'");
      console.log("Title: '" + table.title + "'");
      // add table to list
      tables.push(table);
      // write tables to file
      fs.writeFile(data_dir + "/tables.json", JSON.stringify(tables));
    });
  };

  fs.readdir(data_dir, function(err, files) {
    if (err) throw err;
    files.forEach(function(file) {
      fs.stat(path.join(data_dir, file), function(err, stat) {
        if (stat.isDirectory()) add_table(file);
      });
    });
  });
}

update_tables();


