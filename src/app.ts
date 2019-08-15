// const express = require('express');
import express from 'express';
import * as http from 'http';
import io from 'socket.io';

type Controller = {
	id: string,
};
type Drone = {
	id: string,
};
type Room = {
	name: string,
	controllers?: Controller[],
	drones?: Drone[],
	count: number,
};
type Result = {
	status: boolean,
	msg: string,
}

const app = express();
const server = new http.Server(app);
const Socket = io(server);
const port = 4000;
server.listen(port)

app.get('/',(req,res)=>{
  res.end('HIJACK DRONE\'s API server.');
});

const MAX_CONTROLLER = 2;
const MAX_DRONE = 1;

let Rooms: Room[]=[];
Socket.on('connection', (socket)=>{
	const id=socket.id;
	log(`user ${id} connected.`);

	socket.on('disconnect', (socket)=>{
		log(`user ${id} disconnected.`);
	});

	socket.on('find room',value => {
		const roomName = value[0];
		const roll = value[1];
		if(roomName.length===0){
			socket.emit('rejected room','room name must be longer than 0')
			return;
		}
		const idx = findRoom(roomName);
		if(idx<0){
			// non existed room -> crete room
		}else {
			// room exists -> check available
			const check=available(idx,roll);
			if(check.status){
				// room available for roll
			} else {
				socket.emit('rejected room',check.msg);
				log(`rejected room, to access ${JSON.stringify(Rooms[idx])}`);
			}
		}
	})
});

function findRoom(name: string): number {
	return Rooms.findIndex(e=>{e.name===name})
}

function available(roomIdx: number, roll: string): Result {
	const room = Rooms[roomIdx];
	let res: Result={status: false, msg: ''};
	switch(roll){
		case 'c':
			if(!room.controllers){
				res.status=true;
			} else {
				res.status=(room.controllers).length < MAX_CONTROLLER;
				res.msg=res.status?'' :'max controller';
			}
			break;
		case 'd':
			if(!room.drones){
				res.status=true;
			} else {
				res.status=(room.drones).length < MAX_DRONE;
				res.msg=res.status?'' :'max drone';
			}
			break;
		default:
			res.status=false;
			res.msg=res.status?'' :'hack';
			break;
	}
	return res;
}

function log(msg: string): void{
	const timestamp = (new Date()).toISOString();
	console.log(timestamp, msg);
}