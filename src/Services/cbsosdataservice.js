import {api}  from 'cbsodata';

export function get_data(table_id, mapping, on_data){
    api.get_data(table_id, mapping, null).then( (result) =>{
        on_data(result);
    });
} 

export function get_schema(table_id, on_schema){
}

export function get_table_list(on_list){
    
}