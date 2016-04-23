
var fs = require('fs');

// initialise server
var restify = require('restify');
var server = restify.createServer();
server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser());


server.get('/meta', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  fs.readFile('data/example_table.meta.json', function(err, data) {
    if (err) return next(err);
    res.status(200);
    res.end(data);
    return next();
  });
});

server.get('/schema/:id', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  var path = 'data/' + req.params.id + '/datapackage.json';
  fs.readFile(path, function(err, data) {
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


