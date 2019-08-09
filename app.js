const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const port = 4000;

server.listen(port)

app.get('/',(req,res)=>{
    res.end('HIJACK DRONE\'s API server.');
});

let room=[];
// 최후의 수단.
// let cleanRoom=setInterval(()=>{
//     const len_prev=room.length;
//     room=room.filter(e=>{
//         return e.drone[0] || e.control[0]
//     });
//     const len_next=room.length;
//     console.log(len_prev-len_next,'room(s) cleaned.');
// },60000);

io.on('connection', (socket)=>{
    const id=socket.id;
    console.log(`user ${id} connected`);
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
        if(pw.length===0){
            socket.emit('rejected room','room name must be longer than 0')
            return;
        }
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
                if(!room[idx].control[0] && !room[idx].drone[0]) room.splice(idx,1);
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
    socket.on('debug',value=>{
	    console.log('from debug ::', value);
    });
})

const checkRoom=(idx,pw,type,socketID)=>{
    // type = 'd' or 'c'
    if(room[idx]){ //room exist?
        // console.log('room exist');
        if(!room[idx].drone[0] && !room[idx].control[1]){ //false & false room
            if(type === 'd' ) room[idx].drone=[true,socketID];
            else room[idx].control=[true,socketID];
            return [true, 'false && false room error solved.']
        }
        // 뭔가 있다.
        if(room[idx].drone.length === 4 && type==='d'){ // drone 방 다참
            return [false, `${type} already exists.`];
        } else if(room[idx].drone.length <= 2 && type==='d'){ // drone 방 들어가자.
            try{
                room[idx].drone.push(true,socketID);
            } catch(e) { // drone not existed
                room[idx].drone=[true,socketID];
            }
            if(room[idx].control[0]) return [true, true];
            else return [false, 'waiting controller.'];
        } else if(room[idx].control[0] && type==='c'){ // controller 방 들어가자.
            room[idx].control=[true,socketID];
            if(room[idx].drone.length === 4) return [true, true];
            else return [false, 'waiting drone'];
        } else { // unknown error
            const roomToJson=JSON.stringify(room);
            return [false, `unknown error, room : ${roomToJson}`];
        }
    }else{
        // console.log('room doesn\'t exist');
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
