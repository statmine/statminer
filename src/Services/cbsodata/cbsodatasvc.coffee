#test = true
api = require("cbsodata").api
catalog = require("cbsodata").catalog

TIME = "Cbs.OData.TimeDimension"
GEO = "Cbs.OData.GeoDimension"
TOPIC = "Cbs.OData.Topic"
DIMENSION = ["Cbs.OData.Dimension", TIME, GEO]
NUMERIC = ["Double", "Float", "Integer", "Long"]

# HACK!!!
cached_meta = name: null

# cleaning up statline stuff
to_label = (label) ->
	label = label.replace /_/g, ""
	label

to_tablelistitem = (odata_table) ->
	item =
		id: odata_table.Identifier
		name: odata_table.ShortTitle
		summary: odata_table.Summary
	item

to_table = (odata_tableinfo) ->
	odata_tableinfo = odata_tableinfo[0]
	table = 
		id: odata_tableinfo.Identifier
		name: odata_tableinfo.ShortTitle
		summary: odata_tableinfo.Summary
		description: odata_tableinfo.Description
		variables: {}
		dimensions: {}
	table

to_variable = (odata_topic) ->
	variable = 
		id: odata_topic.Key
		name: to_label(odata_topic.Title)
		description: odata_topic.Description
		unit: odata_topic.Unit
		type:  'numeric' # odata_topic.Datatype
		ID: odata_topic.ID
	variable

to_dimension = (odata_dim) ->
	dim = 
		id: odata_dim.Key
		name: odata_dim.Title
		description: odata_dim.Description
		ID: odata_dim.ID
		type: ["categorical"]
	if odata_dim['odata.type'] is GEO
		dim.type.push "geo"
	if odata_dim['odata.type'] is TIME
		dim.type.push "date"
		dim.type.push "ordinal"
		dim.istime = true
	dim

to_category = (odata_code) ->
	cat = 
		id: odata_code.Key
		name: odata_code.Title
		level: odata_code.Key
		description: odata_code.Description
	cat

get_dims = (data_props) ->
	(d.Key for d in data_props when d['odata.type'] in DIMENSION)

add_data_props = (table, data_props) ->
	variables = (to_variable t for t in data_props when t.Datatype in NUMERIC)
	for v in variables when v.id and v.id isnt ""
		table.variables[v.id] = v
	dimensions = (to_dimension d for d in data_props when d['odata.type'] in DIMENSION)
	for d in dimensions
		table.dimensions[d.id] = d
	table

add_categories = (table, dimkey, codelist) ->
	#console.log dimkey
	dim = table.dimensions[dimkey]

	cats = (to_category(code) for code in codelist)
	dim.categories = cats
	idx = if dim.istime then (cats.length - 1) else 0
	#console.log idx
	dim.default = cats[idx].id
	dim.aggregate = cats[idx].id unless idx
	table

# odata_to_smp = (metadata) ->
# 	data_properties = metadata.DataProperties
# 	table_infos = metadata.TableInfos
# 	dim_keys = get_dims data_properties
	
# 	#codelists = (metadata[dimkey] for dimkey in dim_keys)

# 	#console.log to_dimension(data_properties[1])
# 	#console.log add_data_props to_table(table_infos), dat   a_properties
# 	table = to_table table_infos
# 	add_data_props table, data_properties
# 	for dimkey in dim_keys
# 		add_categories table, dimkey, metadata[dimkey]
# 	table

odata_to_datapackage= (metadata) ->
	data_properties = metadata.DataProperties
	ti = metadata.TableInfos[0]
	
	datapkg = 
		name: ti.Identifier
		title: ti.Title
		summary: ti.Summary
		description: ti.Description
		resources: []
	
	schema =
		name: datapkg.name
		path: "?"
		fields: []
		
	fields = schema.fields
	for col in data_properties when col.Position?
		field = 
			name: col.Key
			title: col.Title
			description: col.Description

		field.type = if col.Type is "Topic"
			"number"
		else if col.Type is "Dimension"
			"categorical"
		else if col.Type is "GeoDimension"
			"categorical"
		else if col.Type is "TimeDimension"
			"date"
		else
			"string"

		field.unit = col.Unit if col.Unit?
		if field.type in ["categorical","date"]
			categories = field.categories = []
			for ocat in metadata[field.name]
				cat = 
					name: ocat.Key
					title: ocat.Title
					description: ocat.Description
				categories.push cat
		fields.push field
	schema.fields = fields

	datapkg.resources.push schema
	datapkg

# get_meta = (table) ->
# 	api.get_meta(table)
# 	.then(odata_to_smp)

get_datapackage = (table) ->
	api.get_meta(table)
	.then(odata_to_datapackage)
	.then((dpkg) ->
	   cached_meta = dpkg
	   dpkg 
	)

# odata cannot handle large filter statements, so we get more and do a post filter on the data
prefilter = (filter) ->
	odata_filter = {}
	post_filter = {}
	for v, varfilter of filter
		res = odata_filter
		if varfilter.length > 10 then res = post_filter
		res[v] = varfilter
	{filter:filter, post_filter:post_filter, odata_filter: odata_filter}


get_data = (table, filter, select) ->
	pf = prefilter filter
	
	add_fields = (data) ->
	  if cached_meta.name is table
	    schema: get_data_fields(cached_meta, filter, select), data: data
	  else
	    get_datapackage(table).then(() -> add_fields(data))
		
	api.get_data(table, pf.odata_filter, select)
	  .then((data) ->
	    add_fields(data)
	  )
	
shallow_clone = (obj, res={}) ->
	for k,v of obj
	    res[k] = v
	res

get_data_fields = (schema, filter, select) ->
	df = 
		name: schema.name
		title: schema.title
		resources: [{ name: schema.name, fields:[] }]
	
	#console.log schema.resources[0].fields
	# TODO clone fields and filter categories 
	fields = schema.resources[0].fields
	  .map((v) -> shallow_clone v)
	  .filter( (v) -> v.name in select)
	  	
	for v in fields
		cats = filter[v.name]
		if cats and v.categories
			v.categories = v.categories.filter (cat) -> cat.name in cats
	
	df.resources[0].fields = fields
	df
	
	
search = (query) ->
	catalog.get_tables(query)

get_tables = (filter, select, cb) ->
	catalog.get_tables(filter, select, cb)


module.exports =
	#get_meta: get_meta
	get_data: get_data
	get_data_fields: get_data_fields
	get_tables: get_tables
	get_datapackage: get_datapackage
	get_schema: get_datapackage
	#search: search


test = off
if test?
	# fs = require 'fs'
	# metadata = require "./cbsodata.json"
	#get_tables().then(console.log)
	my_filter = 
		Goods: ['K', 'C']
		Periods: ['2008JJ00']
	
	select = ["Goods","Periods","ExportValue_2"]
		
	get_data("80576eng", my_filter, ["Goods","Periods","ExportValue_2"])
	  .then console.log
	  
	# get_datapackage("80576eng")
	#   .then((schema) ->
	# 	   data_schema = get_data_fields schema, my_filter, select
	# )
	# get_datapackage("80576eng")
	#   .then (meta) ->
	#      console.log meta.resources[0].fields[0] 
	#get_data().then(console.log)
	#console.log (JSON.stringify (odata_to_datapackage)metadata), true)
	#console.log odata_to_datapackage)metadata
	#get_datapackage("71311NED").then(console.log)
	#get_datapackage("71311NED").
	#then((meta) -> console.log meta)

	#.then((str) -> fs.writeFileSync("smp.json", str))
