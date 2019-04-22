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
let room=[];

io.on('connection', (socket)=>{
    console.log('user connected',++users);

    socket.on('disconnect',()=>{
        console.log('user disconnected');
        users--;
    });

    // 2 joining room
    socket.on('find room', (pw,type)=>{
        const idx=room.findIndex(e=>e.pw === pw);
        const roomAvailable = checkRoom(idx,pw,type); //[ true|false, errorMessage ]
        if(roomAvailable[0]){
            socket.emit('found room',pw);
            if(roomAvailable[1]){
                socket.emit('connected')
            }
        }else{
            socket.emit('rejected room',pw);
        }
    });
    socket.on('leave room',(pw,type)=>{
        const idx=room.findIndex(e=>e.pw === pw);
        if(idx<0) socket.to(pw).emit('error', 'room not existing');
        else{
            room[idx].user--;
            if(type==='d')room[idx].drone=false;
            else room[idx].control=false;
            if(room[idx].user === 0) room.splice(idx,1);
        }
    });
    // 3 controll with drone & controller
    // maybe many room will be stucked here... considering 'move' moves to line 30
    socket.on('move',(pw,value)=>{ 
        socket.to(pw).emit('accept move',value);
    });
})

const checkRoom=(idx,pw,type)=>{
    if(idx<0) return [false, 'can\'t find room'];
    if(room[idx]){ //room exist?
        if(room[idx].user === 1){
            room[idx].user++;
            const existUserType = room[idx].drone?'d':'c';
            if( existUserType === type ) return [false, `${existUserType} already exists.`];

            if( type === 'd') room[idx].drone=true;
            else room[idx].controller=true;
            return [true,'1:1 connected'];
        }else return [false, '1:1 connection already made.'];
    }else{
        if(type==='d'){
            room.push({
                pw, user:1, drone: true, control: false
            });
        }
        else if(type==='c'){
            room.push({
                pw, user:1, drone: false, control: true
            });
        }
        return [true];
    }
}