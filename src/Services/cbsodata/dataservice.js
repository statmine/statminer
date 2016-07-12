import api from './cbsodatasvc.js';

const meta_cache = {}

export function get_data(table_id, mapping, on_data){
    api.get_data(table_id, mapping, null).then( (result, err) =>{
        let res = { data: result
                  , schema: api.get_data_fields(meta_cache[table_id], mapping.filter, mapping.select) 
                  }
        on_data(err, result);
    });
} 

export function get_schema(table_id, on_schema){
    api.get_meta(table_id).then((result, err) =>{
        meta_cache[table_id] = result;
        on_schema(err, result);
    })
}

export function get_table_list(on_list){
}