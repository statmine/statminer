//const strings = require("json!./Strings.json");
import strings from "./Strings.json";

function get_language(){
  let language = navigator.language;
  language = language.substr(0, 2);
  return language;
}

class Localize {
    constructor(){
      this.$language = get_language();
      this.default = "en";
    }
    
    get language(){
      return this.$language;
    }
    
    set language(value){
      this.$language = value;      
    } 

    get strings() {
      return strings[this.$language];
    }
}

const localize = new Localize();

// this is a singleton for the app (one global object)
export default localize;