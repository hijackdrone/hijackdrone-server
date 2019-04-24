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
    socket.on('greeting',(value)=>{
        console.log(value);
    });
    socket.on('disconnect',()=>{
        console.log('user disconnected');
        users--;
    });

    // 2 joining room
    socket.on('find room', value=>{
        pw=value[0];
        type=value[1];
        const idx=room.findIndex(e=>e.pw === pw);
        const roomAvailable = checkRoom(idx,pw,type); //[ true|false, errorMessage ]
        console.log(socket.id);
        console.log(roomAvailable);

        if(roomAvailable[0]){
            socket.emit('found room');
            console.log('found room');
            socket.join(pw);
            if(roomAvailable[1]===true){
                socket.emit('connected');
                socket.to(pw).emit('connected');
            }
        }else{
            socket.emit('rejected room');
            console.log('rejected room',roomAvailable[1]);
        }
    });
    socket.on('leave room',value=>{
        pw=value[0];
        type=value[1];
        if(pw!==''){
            const idx=room.findIndex(e=>e.pw === pw);
            if(idx<0) socket.emit('error', 'room not existing');
            else{
                socket.leave(pw);
                room[idx].user--;
                if(type==='d')room[idx].drone=false;
                else room[idx].control=false;
                if(room[idx].user === 0) room.splice(idx,1);
            }
        }
    });
    // 3 controll with drone & controller
    // maybe many room will be stucked here... considering 'move' moves to line 30
    socket.on('move',(pw,value)=>{ 
        socket.to(pw).emit('accept move',value);
    });
})

const checkRoom=(idx,pw,type)=>{
    // if(idx<0) return [false, 'can\'t find room'];
    if(room[idx]){ //room exist?
        console.log('room exist');
        if(room[idx].user === 1){
            room[idx].user++;
            const existUserType = room[idx].drone?'d':'c';
            if( existUserType === type ) return [false, `${existUserType} already exists.`];
            if( type === 'd') room[idx].drone=true;
            else room[idx].controller=true;
            return [true,true];
        }else return [false, '1:1 connection already made.'];
    }else{
        console.log('room doesn\'t exist');
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
        return [true,`made room ${pw}`];
    }
}