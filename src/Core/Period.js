// detect multiple time scales in a time dimension and create pseudo dimensions

const YEAR = /^\d{4}$/;
const QUARTER = /^\d{4}Q0?\d/;
const MONTH = /^\d{4}M\d{2}/;

// auxilary function for filtering
function test(type){
  return (p) => type.test(p.name);
}
const is_year = test(YEAR);
const is_quarter = test(QUARTER);
const is_month = test(MONTH);

const is_period = (field) => field.type == "date" || field.type == "period";

export function expand_schema(schema){
  const fields = schema.fields;
  //const period = fields.first(is_period);
  //const years = period.categories.filter(is_year);
  console.log(schema);
  return schema;
}


// testing 1,2,3

let codes = ["2001", "2001Q1", "2001M01"];
const schema = {
  fields: [
    {name: "period", title: "Period", is_time: true,
     categories: [{name: "2001", title:"Jaar 2001"},
                  {name: "2002Q1", title: "2002 KW 2"}
                 ]
    }
  ]
};


expand_schema(schema);