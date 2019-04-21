import React, { Component } from 'react';
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor(props){
    super(props);
    this.state={
      endpoint: 'http://127.0.0.1:4001',
    };
  }

  componentDidMount() {
    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint);
    this.socket.emit("method1",'hi');
  }
  render() {
    return (
      <div className="App">
        socket io client.
      </div>
    );
  }
}

export default App;
