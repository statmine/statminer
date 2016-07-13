// Generated by CoffeeScript 1.10.0
(function() {
  var DIMENSION, GEO, NUMERIC, TIME, TOPIC, add_categories, add_data_props, api, catalog, get_data, get_data_fields, get_dims, get_meta, get_schema, get_tables, my_filter, odata_to_schema, odata_to_smp, prefilter, search, select, shallow_clone, test, to_category, to_dimension, to_label, to_table, to_tablelistitem, to_variable,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  api = require("cbsodata").api;

  catalog = require("cbsodata").catalog;

  TIME = "Cbs.OData.TimeDimension";

  GEO = "Cbs.OData.GeoDimension";

  TOPIC = "Cbs.OData.Topic";

  DIMENSION = ["Cbs.OData.Dimension", TIME, GEO];

  NUMERIC = ["Double", "Float", "Integer", "Long"];

  to_label = function(label) {
    label = label.replace(/_/g, "");
    return label;
  };

  to_tablelistitem = function(odata_table) {
    var item;
    item = {
      id: odata_table.Identifier,
      name: odata_table.ShortTitle,
      summary: odata_table.Summary
    };
    return item;
  };

  to_table = function(odata_tableinfo) {
    var table;
    odata_tableinfo = odata_tableinfo[0];
    table = {
      id: odata_tableinfo.Identifier,
      name: odata_tableinfo.ShortTitle,
      summary: odata_tableinfo.Summary,
      description: odata_tableinfo.Description,
      variables: {},
      dimensions: {}
    };
    return table;
  };

  to_variable = function(odata_topic) {
    var variable;
    variable = {
      id: odata_topic.Key,
      name: to_label(odata_topic.Title),
      description: odata_topic.Description,
      unit: odata_topic.Unit,
      type: 'numeric',
      ID: odata_topic.ID
    };
    return variable;
  };

  to_dimension = function(odata_dim) {
    var dim;
    dim = {
      id: odata_dim.Key,
      name: odata_dim.Title,
      description: odata_dim.Description,
      ID: odata_dim.ID,
      type: ["categorical"]
    };
    if (odata_dim['odata.type'] === GEO) {
      dim.type.push("geo");
    }
    if (odata_dim['odata.type'] === TIME) {
      dim.type.push("time");
      dim.type.push("ordinal");
      dim.istime = true;
    }
    return dim;
  };

  to_category = function(odata_code) {
    var cat;
    cat = {
      id: odata_code.Key,
      name: odata_code.Title,
      level: odata_code.Key,
      description: odata_code.Description
    };
    return cat;
  };

  get_dims = function(data_props) {
    var d, i, len, ref, results;
    results = [];
    for (i = 0, len = data_props.length; i < len; i++) {
      d = data_props[i];
      if (ref = d['odata.type'], indexOf.call(DIMENSION, ref) >= 0) {
        results.push(d.Key);
      }
    }
    return results;
  };

  add_data_props = function(table, data_props) {
    var d, dimensions, i, j, len, len1, t, v, variables;
    variables = (function() {
      var i, len, ref, results;
      results = [];
      for (i = 0, len = data_props.length; i < len; i++) {
        t = data_props[i];
        if (ref = t.Datatype, indexOf.call(NUMERIC, ref) >= 0) {
          results.push(to_variable(t));
        }
      }
      return results;
    })();
    for (i = 0, len = variables.length; i < len; i++) {
      v = variables[i];
      if (v.id && v.id !== "") {
        table.variables[v.id] = v;
      }
    }
    dimensions = (function() {
      var j, len1, ref, results;
      results = [];
      for (j = 0, len1 = data_props.length; j < len1; j++) {
        d = data_props[j];
        if (ref = d['odata.type'], indexOf.call(DIMENSION, ref) >= 0) {
          results.push(to_dimension(d));
        }
      }
      return results;
    })();
    for (j = 0, len1 = dimensions.length; j < len1; j++) {
      d = dimensions[j];
      table.dimensions[d.id] = d;
    }
    return table;
  };

  add_categories = function(table, dimkey, codelist) {
    var cats, code, dim, idx;
    dim = table.dimensions[dimkey];
    cats = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = codelist.length; i < len; i++) {
        code = codelist[i];
        results.push(to_category(code));
      }
      return results;
    })();
    dim.categories = cats;
    idx = dim.istime ? cats.length - 1 : 0;
    dim["default"] = cats[idx].id;
    if (!idx) {
      dim.aggregate = cats[idx].id;
    }
    return table;
  };

  odata_to_smp = function(metadata) {
    var data_properties, dim_keys, dimkey, i, len, table, table_infos;
    data_properties = metadata.DataProperties;
    table_infos = metadata.TableInfos;
    dim_keys = get_dims(data_properties);
    table = to_table(table_infos);
    add_data_props(table, data_properties);
    for (i = 0, len = dim_keys.length; i < len; i++) {
      dimkey = dim_keys[i];
      add_categories(table, dimkey, metadata[dimkey]);
    }
    return table;
  };

  odata_to_schema = function(metadata) {
    var cat, categories, col, data_properties, datapkg, field, fields, i, j, len, len1, ocat, ref, schema, ti;
    data_properties = metadata.DataProperties;
    ti = metadata.TableInfos[0];
    datapkg = {
      name: ti.Identifier,
      title: ti.Title,
      summary: ti.Summary,
      description: ti.Description,
      resources: []
    };
    schema = {
      name: datapkg.name,
      path: "?",
      fields: []
    };
    fields = schema.fields;
    for (i = 0, len = data_properties.length; i < len; i++) {
      col = data_properties[i];
      if (!(col.Position != null)) {
        continue;
      }
      field = {
        name: col.Key,
        title: col.Title,
        description: col.Description
      };
      field.type = col.Type === "Topic" ? "number" : col.Type === "Dimension" ? "categorical" : col.Type === "GeoDimension" ? "categorical" : col.Type === "TimeDimension" ? "date" : "string";
      if (col.Unit != null) {
        field.unit = col.Unit;
      }
      if (field.type === "categorical") {
        categories = field.categories = [];
        ref = metadata[field.name];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          ocat = ref[j];
          cat = {
            name: ocat.Key,
            title: ocat.Title,
            description: ocat.Description
          };
          categories.push(cat);
        }
      }
      fields.push(field);
    }
    schema.fields = fields;
    datapkg.resources.push(schema);
    return datapkg;
  };

  get_meta = function(table) {
    return api.get_meta(table).then(odata_to_smp);
  };

  get_schema = function(table) {
    return api.get_meta(table).then(odata_to_schema);
  };

  prefilter = function(filter) {
    var odata_filter, post_filter, res, v, varfilter;
    odata_filter = {};
    post_filter = {};
    for (v in filter) {
      varfilter = filter[v];
      res = odata_filter;
      if (varfilter.length > 10) {
        res = post_filter;
      }
      res[v] = varfilter;
    }
    return {
      filter: filter,
      post_filter: post_filter,
      odata_filter: odata_filter
    };
  };

  get_data = function(table, filter, select) {
    var pf;
    pf = prefilter(filter);
    return api.get_data(table, pf.odata_filter, select);
  };

  shallow_clone = function(obj, res) {
    var k, v;
    if (res == null) {
      res = {};
    }
    for (k in obj) {
      v = obj[k];
      res[k] = v;
    }
    return res;
  };

  get_data_fields = function(schema, filter, select) {
    var cats, df, fields, i, len, v;
    df = {
      name: schema.name,
      title: schema.title,
      resources: [
        {
          name: schema.name,
          fields: []
        }
      ]
    };
    fields = df.resources[0].fields = schema.resources[0].fields.filter(function(f) {
      var ref;
      return ref = f.name, indexOf.call(select, ref) >= 0;
    }).map(shallow_clone);
    for (i = 0, len = fields.length; i < len; i++) {
      v = fields[i];
      cats = filter[v.name];
      if (cats) {
        v.categories = v.categories.filter(function(cat) {
          var ref;
          return ref = cat.name, indexOf.call(cats, ref) >= 0;
        });
      }
    }
    return df;
  };

  search = function(query) {
    return catalog.get_tables(query);
  };

  get_tables = function(filter, select, cb) {
    return catalog.get_tables(filter, select, cb);
  };

  module.exports = {
    get_data: get_data,
    get_data_fields: get_data_fields,
    get_tables: get_tables,
    get_schema: get_schema
  };

  test = true;

  if (test != null) {
    my_filter = {
      Goods: ['K', 'C'],
      Periods: ['2008JJ00']
    };
    select = ["Goods", "Periods", "ExportValue_2"];
    get_schema("80576eng").then(function(schema) {
      var fields;
      console.log("hello");
      fields = get_data_fields(schema, my_filter, select);
      return console.log(fields);
    });
  }

}).call(this);