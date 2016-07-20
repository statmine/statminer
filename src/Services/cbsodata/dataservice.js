const api  = require('./cbsodatasvc.js');

const meta_cache = {}

function get_data(table_id, mapping, on_data){
    api.get_data(table_id, mapping, null).then( (result, err) =>{
        on_data(err, res);
    });
} 

function get_schema(table_id, on_schema){
    api.get_schema(table_id).then((result, err) =>{
        on_schema(err, result);
    })
}

function get_table_list(on_list){
}

export default {
    get_data : get_data,
    get_schema: get_schema,
    get_table_list: get_table_list
}