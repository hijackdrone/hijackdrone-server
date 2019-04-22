const express = require('express');
const app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

const port = 4001;

server.listen(port)

app.get('/',(req,res)=>{
    res.end('Welcome to API server.');
});
let users=0;

io.on('connection', (socket)=>{
    console.log('user connected',++users);

    socket.on('disconnect',()=>{
        console.log('user disconnected');
        users--;
    });

    socket.on('method1',value=>{
        console.log(value);
    });

    socket.on('json', value=>{
        console.log(value);
        socket.broadcast.emit('send to react',value);
    });
})