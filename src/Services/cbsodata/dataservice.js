const api  = require('./cbsodatasvc.js');

function get_data(table_id, mapping, on_data){
    const filter = {};
    const res = {};
    for (let a in mapping){
        const vfs = mapping[a];
        for (let b in vfs){
            const vf = vfs[b];
            if (vf.filter){
                filter[vf.variable] = vf.filter;
            }
            res[vf.variable] = true;
        }
    }
    const select = Object.keys(res);
    //console.log(filter, res);
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
    api.get_tables()
    .then((result, err) => {
        //console.log(result)
        result = result.map( (ti) => {
          return { name: ti.Identifier, title: ti.Title, summary: ti.Summary}
        });
        on_list(err, result)
    }) 
}

export default {
    get_data : get_data,
    get_schema: get_schema,
    get_table_list: get_table_list
}