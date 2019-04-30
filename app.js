const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const port = 4001;

server.listen(port)

app.get('/',(req,res)=>{
    res.end('HIJACK DRONE\'s API server.');
});

let room=[];

io.on('connection', (socket)=>{
    const id=socket.id;
    console.log(`user ${id} connected`,++users);
    socket.on('greeting',(value)=>{
        console.log(value,id);
    });
    socket.on('disconnect',()=>{
        console.log(`user ${id} disconnected`);
        if(room.length>0){
            const idx=room.findIndex(e=> e.drone[1]===id || e.control[1]===id)
            if(idx>=0){
                if(room[idx].drone[1]===id){
                    room[idx].drone=[false,''];
                    socket.to(room[idx].pw).emit('drdis');
                } 
                else{
                    room[idx].control=[false,''];
                    socket.to(room[idx].pw).emit('crdis');
                }
                if(!room[idx].control && !room[idx].drone) room.splice(idx,1);
            }
        }
        console.log('room :',room)
    });

    // 2 joining room
    socket.on('find room', value=>{
        pw=value[0];
        type=value[1];
        const idx=room.findIndex(e=>e.pw === pw);
        const roomAvailable = checkRoom(idx,pw,type,socket.id); //[ true|false, errorMessage ]
        console.log(roomAvailable);

        if(roomAvailable[0]){
            socket.emit('found room', pw);
            console.log('found room');
            socket.join(pw);
            if(roomAvailable[1]===true){
                socket.emit('connected');
                socket.to(pw).emit('connected');
            }
        }else{
            socket.emit('rejected room',roomAvailable[1]);
            console.log('rejected room',roomAvailable[1]);
        }
    });
    socket.on('leave room',value=>{
        pw=value[0];
        type=value[1];
        if(pw!==''){
            const idx=room.findIndex(e=>e.pw === pw);
            if(idx<0) socket.emit('err', 'room not existing');
            else{
                socket.leave(pw);
                if(type==='d'){
                    room[idx].drone=[false,''];
                    socket.to(room[idx].pw).emit('drdis');
                }
                else {
                    room[idx].control=[false,''];
                    socket.to(room[idx].pw).emit('crdis');
                }
                if(!room[idx].control && !room[idx].drone) room.splice(idx,1);
                console.log('room :',room);
            }
        }
    });
    // 3 controll with drone & controller
    // maybe many room will be stucked here... considering 'move' moves to line 30
    socket.on('move',value=>{ 
        const pw=value[0];
        const data=value[1];
        // console.log(pw,data);
        socket.to(pw).emit('accept move',data);
    });
})

const checkRoom=(idx,pw,type,socketID)=>{
    // if(idx<0) return [false, 'can\'t find room'];
    if(room[idx]){ //room exist?
        console.log('room exist');
        if(room[idx].drone || room[idx].control){
            const existUserType = room[idx].drone[0]?'d':'c';
            if( existUserType === type ) return [false, `${existUserType} already exists.`];
            if( type === 'd') room[idx].drone=[true,socketID];
            else room[idx].controller=[true,socketID];
            return [true,true];
        }else return [false, '1:1 connection already made.'];
    }else{
        console.log('room doesn\'t exist');
        if(type==='d'){
            room.push({
                pw, drone: [true, socketID], control: [false,'']
            });
        }
        else if(type==='c'){
            room.push({
                pw, drone: [false,''], control: [true, socketID]
            });
        }
        return [true,`made room ${pw}`];
    }
}