import {api}  from './cbsodata/dataservice.js';

export function get_data(table_id, mapping, on_data){
    api.get_data(table_id, mapping, null).then( (result) =>{
        console.log("result:", result);
        on_data(result);
    });
} 

export function get_schema(table_id, on_schema){
    api.get_schema(table_id).then( (result) => {
        console.log("loading schema", schema);
        on_schema(result)
    })
}

export function get_table_list(on_list){
    
}