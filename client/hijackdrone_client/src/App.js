import React, { Component } from 'react';
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor(props){
    super(props);
    this.state={
      endpoint: 'http://127.0.0.1:4001',
      history: [],
    };
  }

  componentDidMount=()=>{
    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint);
    this.socket.emit("method1",'hi');
    this.socket.on("send to react",value=>{
      const now=new Date();
      const sended=new Date(value);
      console.log(now-sended);
      
      let history=this.state.history;
      history.push(now-sended);
      this.setState({history});
    });
  }
  
  render() {
    return (
      <div className="App">
        {this.state.history.map((e,i)=>(
          <p key={i}>{e} mili seconds</p>
        ))}
      </div>
    );
  }
}

export default App;
