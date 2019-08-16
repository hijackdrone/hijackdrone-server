// const express = require('express');
import express from 'express';
import * as http from 'http';
import io from 'socket.io';

type User = {
	id: string,
};
type Room = {
	name: string,
	controllers?: User[],
	drones?: User[],
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

app.get('/', (req, res) => {
	res.end('HIJACK DRONE\'s API server.');
});

const MAX_CONTROLLER = 2;
const MAX_DRONE = 1;

let Rooms: Room[] = [];

Socket.on('connection', (socket) => {
	const id = socket.id;
	log(`user ${id} connected.`);

	socket.on('disconnect', () => {
		const {idx}=findRoomIdxWithUserId(id);
		if(idx>=0){
			socket.to(Rooms[idx].name).emit('wait');
		}
		exitUser(id,socket);
		log(`user ${id} disconnected.`);
	});

	socket.on('leave room', value => {
		const {idx}=findRoomIdxWithUserId(id);
		try { 
			socket.to(Rooms[idx].name).emit('wait');
			const roomName=Rooms[idx].name;
			socket.emit('wait');
			log(`user ${id} will leave room ${roomName}`);
			exitUser(id,socket);
		} catch(err){
			log(`user ${id} changed roll`);
		}
	});

	socket.on('find room', value => {
		const roomName = value[0];
		const roll = value[1];
		if (roomName.length === 0) {
			socket.emit('rejected room', 'Name of \'Room\' must be longer than 0')
			return;
		}
		const idx = findRoom(roomName);
		if (idx < 0) {
			// non existed room -> crete room
			let room : Room={
				name: roomName,
				controllers: [],
				drones: [],
			};
			if(roll === 'c'){
				room.controllers=[{id: id}];
			} else {
				room.drones=[{id: id}];
			}
			Rooms.push(room);
			socket.emit('found room',roomName);
			socket.join(roomName);
			log(`user ${id} created room "${roomName}"`);
		} else {
			// room exists -> check available
			const check = available(idx, roll);
			log(`available restuls : ${JSON.stringify(check)}`);
			if (check.status) {
				addUser(idx, id, roll);
				if(isRoomFull(idx)){
					// socket.emit('connected');
					socket.emit('found room',roomName);
					socket.join(roomName);
					socket.to(roomName).emit('connected');
					log(`${roomName} connected. ${JSON.stringify(Rooms[idx])}`);
				}else {
					socket.emit('found room',roomName);
					socket.join(roomName);
					log(`user ${id} entered room "${roomName}"`);
				}
			} else {
				socket.emit('rejected room', check.msg);
				log(`rejected room, to access ${JSON.stringify(Rooms[idx])}`);
			}
		}
		log(`find room results : ${JSON.stringify(Rooms)}`);
	});
});

function findRoom(name: string): number {
	return Rooms.findIndex(function(room) { return room.name === name })
}

function available(roomIdx: number, roll: string): Result {
	const room = Rooms[roomIdx];
	let res: Result = { status: false, msg: ''};
	switch (roll) {
		case 'c':
			if (!room.controllers) {
				res.status = true;
			} else {
				res.status = (room.controllers).length < MAX_CONTROLLER;
				res.msg = res.status ? '' : 'Max # of controller';
			}
			break;
		case 'd':
			if (!room.drones) {
				res.status = true;
			} else {
				res.status = (room.drones).length < MAX_DRONE;
				res.msg = res.status ? '' : 'Max # of drone';
			}
			break;
		default:
			res.status = false;
			res.msg = res.status ? '' : 'Here comes hacker.';
			break;
	}
	return res;
}
function addUser(idx: number, id: string, roll: string): void {
	const Room = Rooms[idx];
	switch (roll) {
		case 'c':
			if (Room.controllers) {
				Room.controllers.push({ id: id });
			} else {
				Room.controllers = [{ id: id }];
			}
			break;
		case 'd':
			if (Room.drones) {
				Room.drones.push({ id: id });
			} else {
				Room.drones = [{ id: id }];
			}
			break;
		default:
			break;
	}
}
function exitUser(id: string, socket: io.Socket): void {
	const {idx,roll} = findRoomIdxWithUserId(id);
	try {
		switch (roll) {
			case 'c':
				const controllers = Rooms[idx].controllers!.filter(e => e.id !== id);
				Rooms[idx].controllers = controllers;
				socket.leave(Rooms[idx].name);
				break;
			case 'd':
				const drones = Rooms[idx].drones!.filter(e => e.id !== id);
				Rooms[idx].drones = drones;
				socket.leave(Rooms[idx].name);
				break;
			default:
				// log(`exitUser ${id} may not worked.`);
				break;
		}
	} catch(err){
		log(`---exitUser---\n${err}\n--------------`);
	}
	deleteVacantRoom(idx);
}

function findRoomIdxWithUserId(id: string): {idx: number, roll: string}{
	let roll: string='';
	return {idx: Rooms.findIndex(function(room) {
		let res;
		if (room.controllers) {
			res = (room.controllers.filter(user => user.id === id)).length > 0;
			if (res){
				roll='c';
				return true;
			}
		}
		if (room.drones) {
			res = (room.drones.filter(user => user.id === id)).length > 0;
			if (res){
				roll='d';
				return true;
			}
		}
		return false;
	}), roll}
}
function deleteVacantRoom(idx: number): void {
	if (idx >= 0) {
		const ctrs = Rooms[idx].controllers;
		const drs = Rooms[idx].drones;
		let res: boolean = false;
		if (ctrs && drs) {
			if (ctrs.length === 0 && drs.length === 0) {
				// remove Rooms[idx];
				res = true;
			}
		} else if (ctrs && ctrs.length === 0) {
			res = true;
		} else if (drs && drs.length === 0) {
			res = true;
		}
		if (res) {
			// dangerous.. if some rooms are deleting simultaneously
			const roomName = Rooms[idx].name;
			Rooms = Rooms.filter(e => e.name !== roomName);
		}
	}
}
function log(msg: string): void {
	const timestamp = (new Date()).toISOString();
	console.log(timestamp, msg);
}
function isRoomFull(idx: number): boolean{
	if(Rooms[idx].controllers && Rooms[idx].drones){
		return (Rooms[idx].controllers!).length === MAX_CONTROLLER && (Rooms[idx].drones!).length === MAX_DRONE
	}
	return false;
}