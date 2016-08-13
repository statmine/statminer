import React from "react";
import {Link} from "react-router";

class TableListPage extends React.Component{
    constructor(props){
        super(props)
        this.state = {table_list: [], loading:true};
        this.renderItem = this.renderItem.bind(this);
        console.log(props.location)
    }

    renderItem(item) {
        const location = this.props.location.pathname + "/graph/" + item.name;
        return (
            <li> 
            <Link to={location}>
                <h3>{item.title}</h3>
                {item.summary}
            </Link>
            </li>
        )
    }

    componentDidMount(){
        const provider = this.props.provider;
        const set_tables = (e, table_list) => this.setState({table_list, loading: false})
        provider.get_table_list(set_tables)
    }

    render(){

        const {table_list, loading} = this.state;
        if (loading){
            return (
                <div>Loading...</div>
            )
        }

        return(
        <ul>
        {table_list.map(this.renderItem)}
        </ul>
        )
    }
}

export default TableListPage;