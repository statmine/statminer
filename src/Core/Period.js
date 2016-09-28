// detect multiple time scales in a time dimension and create pseudo dimensions

const YEAR = /^\d{4}$/;
const QUARTER = /^\d{4}Q0?\d/;
const MONTH = /^\d{4}M\d{2}/;

let codes = ["2001", "2001Q1", "2001M01"];

// auxilary function for filtering
function test(type){
  return (p) => type.test(p);
}

export default function check_period(codes){
  let years = codes.filter(test(YEAR));
  let quarters = codes.filter(test(QUARTER));
  let months = codes.filter(test(MONTH));

  //console.log("years", years);
  //console.log("months", months);
  //console.log("quarters", quarters);

  if ( years.length == 0 
    && months.length == 0 
    && quarters.length == 0
    ){
    return codes;
  }
}


check_period(codes);