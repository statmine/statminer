const api  = require('./cbsodatasvc.js');

const meta_cache = {}

function get_data(table_id, mapping, on_data){
    const filter = {};
    const res = {};
    for (let a in mapping){
        let vf = mapping[a];
        if (vf.length){
            vf = vf[0]
        } else {
            continue
        }
        if (vf.filter){
            filter[vf.variable] = vf.filter;
        }
        res[vf.variable] = true;
    }
    const select = Object.keys(res);
    console.log(filter, res);
    api.get_data(table_id, filter, select).then( (result, err) =>{
        on_data(err, result);
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