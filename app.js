const express = require('express');
const app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

const port = 4001;

server.listen(port)

app.get('/',(req,res)=>{
    res.end('Welcome to API server.');
});

io.on('connection', (socket)=>{
    console.log('user connected');
    socket.on('disconnect',()=>{
        console.log('user disconnected');
    });
    socket.on('method1',value=>{
        console.log(value);
    });
})