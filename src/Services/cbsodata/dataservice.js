const api  = require('./cbsodatasvc.js');
import rest from 'rest';

let cached_list = null;
let language_ = "en";
let debug = false;

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
    }).catch((err) => console.log(err));
}

function get_schema(table_id, on_schema){
    api.get_schema(table_id).then((result, err) =>{
        on_schema(err, result);
    }).catch((err) => console.log(err));
}

function get_table_list(on_list){
    if (cached_list){
        on_list(null, cached_list)
        return;
    }
    
    if (debug){
        console.log("debug")
    }
    
    //api.get_tables({Language: "nl", OutputStatus: "Regulier"})
    api.get_tables({Language: language_})
    .then((result, err) => {
        //console.log(result)
        result = result.map( (ti) => {
          return { name: ti.Identifier, title: ti.Title, summary: ti.Summary}
        });
        cached_list = result;
        on_list(err, result)
    }).catch((err) => console.log(err));
}

export default {
    get_data : get_data,
    get_schema: get_schema,
    get_table_list: get_table_list,
    get language(){
        return language_;
    },
    set language(la){
        language_ = la;
        cached_list = null;
    },
    name: "cbs",
    title: "Statistics Netherlands/CBS opendata",
    license: "© Centraal Bureau voor de Statistiek, 2016",
    url: "http://www.cbs.nl"
}
