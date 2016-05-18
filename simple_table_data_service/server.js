
// ============================================================================
// Return the first element in vector with a given name
// 
// It is assumed that vector has the following form:
//   [ {"name": "...", ...}, {"name": "...", ...}, ... ]
// The first element from vector with a name equal to name is returned. When no
// element is found undefined is returned. 
//
function find_name(vector, name) {
  for (var i = 0; i < vector.length; ++i) {
    if (vector[i].name == name) return vector[i];
  }
  return undefined;
}

// Add non-selected fields to query and add information on default and 
// aggregate categories to query.
//
function complete_query(schema, query) {
  var res = schema.fields.map(function(f) {
    var dimension = f.type == 'date' || f.categories !== undefined;
    var q = find_name(query, f.name);
    var selected = q !== undefined;
    return {'name': f.name, 'selected': selected, 'default': f.default, 
      'aggregate': f.aggregate};
  });
  return res;
}

// Filter schema using query: for categorical variables only select categories 
// that will be returned in the resulting data set. 
//
function filter_schema(schema, query) {
  schema.fields = schema.fields.map(function(f) {
    if (f.categories) {
      var q = find_name(query, f.name);
      f.categories = f.categories.filter(function(c) {
        if (q.selected) {
          // select everything except aggregate
          return c.name !== q.aggregate;
        } else {
          // select aggregate or if not defined default
          return c.name === (q.default || q.aggregate);
        }
      });
    }
    return f;
  });
  return schema;
}

// Filter data using query. 
//
function filter_data(data, query) {
  return data.filter(function(d) {
    var select = true
    for (var i = 0; i < query.length; ++i) {
      var q = query[i];
      if (q.aggregate || q.default) {
        if (q.selected) {
          // select everything except aggregate
          select &= d[q.name] != q.aggregate;
        } else {
          // select aggregate or if not defined default
          select &= d[q.name] == (q.default || q.aggregate);
        }
        // TODO: I use a '==' and a '!=' in the code above; this is because 
        // csv-parse imports all fields as strings, while the schema contains
        // the categories as number where relevant. It would be better if
        // the fields are converted to number based on the schema.
      }
    }
    return select;
  });
}


// ============================================================================
var fs = require('fs');
var csv_parse = require('csv-parse');

var restify = require('restify');
var server = restify.createServer();
server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser({mapParams: false}));


server.get('/table/:id/schema', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  var path = 'data/' + req.params.id + '/datapackage.json';
  fs.readFile(path, function(err, data) {
    if (err) return next(err);
    res.header('Content-Type', 'application/json');
    res.status(200);
    res.end(data);
    return next();
  });
});

server.get('/table/:id/data', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  var path = 'data/' + req.params.id + '/data.csv';
  fs.readFile(path, function(err, data) {
    if (err) return next(err);
    res.header('Content-Type', 'text/csv');
    res.status(200);
    res.end(data);
    return next();
  });
});

server.post('/table/:id/query', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  var query = req.body;

  console.log(req.body);
  console.log(req.params);

  fs.readFile('data/' + req.params.id + '/datapackage.json', function(err, table_schema) {
    if (err) return next(err);

    var table_schema = JSON.parse(table_schema);
    var schema = table_schema.resources[0].schema;

    query = complete_query(schema, query);
    schema = filter_schema(schema, query);

    fs.readFile('data/' + req.params.id + '/data.csv', function(err, data) {
      if (err) return next(err);

      csv_parse(data, {columns: true}, function(err, data) {
        if (err) return next(err);

        data = filter_data(data, query);

        // return data with schema
        res.header('Content-Type', 'application/json');
        res.status(200);
        res.end(JSON.stringify({data: data, schema: schema}));
        return next();
      });
    });
  });
});

server.get('/tables', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  fs.readFile('data/tables.json', function(err, data) {
    if (err) return next(err);
    res.header('Content-Type', 'application/json');
    res.status(200);
    res.end(data);
    return next();
  });
});



server.get('/meta', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  fs.readFile('data/example_table.meta.json', function(err, data) {
    if (err) return next(err);
    res.status(200);
    res.end(data);
    return next();
  });
});

server.post('/data', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  //console.log(req.body);
  // determine which variables are selected in request
  var selected_variables = [];
  for (axis in req.body) {
    if (req.body.hasOwnProperty(axis)) {
      selected_variables.push(req.body[axis]);
    }
  }
  //console.log("Selected variables:", selected_variables);

  // read meta data
  fs.readFile('data/example_table.meta.json', function(err, meta) {
    if (err) return next(err);

    // determine which variables are selected and whether to return the 
    // aggregate of variables or the non-aggregates
    var meta = JSON.parse(meta);

    var dimensions = meta.fields.filter(function(f) {
      return f.type !== "number";
    }).map(function(f) {
      var variable_name = f.name;
      // check if variable present in selected variables
      var selected = selected_variables.indexOf(variable_name) >= 0;
      return {'variable': variable_name, 'selected': selected,
        'aggregate': f.aggregate || f.default};
    });

    // filter meta
    // remove categories that are not included in returned data
    for (dim in dimensions) {
      for (var i = 0; i < meta.fields.length; ++i) {
        console.log(meta.fields[i].name, dim);
        if (meta.fields[i].name == dimensions[dim].variable && meta.fields[i].categories) {
          meta.fields[i].categories = meta.fields[i].categories.filter(function(c) {
            return (dimensions[dim].selected) !== (dimensions[dim].aggregate == c.name);
          });
          console.log(meta.fields[i].categories);
        }
      }
    }


    // read data
    fs.readFile('data/example_table.json', function(err, data) {
      if (err) return next(err);
      var data = JSON.parse(data);

      // filter data; only select correct categories
      data = data.filter(function(d) {
        var selected = true;
        for (dim in dimensions) {
          selected &= (dimensions[dim].selected) !== 
            (dimensions[dim].aggregate == d[dimensions[dim].variable]);
        }
        return selected;
      });
      // return data with meta
      res.status(200);
      res.end(JSON.stringify({data: data, meta: meta}));
      return next();
    });
  });
});

server.listen(8088);


