"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// const express = require('express');
var express_1 = __importDefault(require("express"));
var http = __importStar(require("http"));
var socket_io_1 = __importDefault(require("socket.io"));
var app = express_1.default();
var server = new http.Server(app);
var Socket = socket_io_1.default(server);
var port = 4000;
server.listen(port, function () {
    log("server started.");
});
app.get('/', function (req, res) {
    res.end('HIJACK DRONE\'s API server.');
});
var MAX_CONTROLLER = 2;
var MAX_DRONE = 1;
var Rooms = [];
Socket.on('connection', function (socket) {
    var id = socket.id;
    log("user " + id + " connected.");
    socket.on('disconnect', function () {
        var idx = findRoomIdxWithUserId(id).idx;
        if (idx >= 0) {
            socket.to(Rooms[idx].name).emit('wait');
        }
        exitUser(id, socket);
        log("user " + id + " disconnected.");
    });
    socket.on('leave room', function (value) {
        var idx = findRoomIdxWithUserId(id).idx;
        try {
            socket.to(Rooms[idx].name).emit('wait');
            var roomName = Rooms[idx].name;
            socket.emit('wait');
            log("user " + id + " will leave room " + roomName);
            exitUser(id, socket);
        }
        catch (err) {
            log("user " + id + " changed roll");
        }
    });
    socket.on('find room', function (value) {
        var roomName = value[0];
        var roll = value[1];
        if (roomName.length === 0) {
            socket.emit('rejected room', 'Name of \'Room\' must be longer than 0');
            return;
        }
        var idx = findRoom(roomName);
        if (idx < 0) {
            // non existed room -> crete room
            var room = {
                name: roomName,
                controllers: [],
                drones: [],
            };
            if (roll === 'c') {
                room.controllers = [{ id: id }];
            }
            else {
                room.drones = [{ id: id }];
            }
            Rooms.push(room);
            socket.emit('found room', roomName);
            socket.join(roomName);
            log("user " + id + " created room \"" + roomName + "\"");
        }
        else {
            // room exists -> check available
            var check = available(idx, roll);
            log("available restuls : " + JSON.stringify(check));
            if (check.status) {
                addUser(idx, id, roll);
                socket.emit('found room', roomName);
                socket.join(roomName);
                log("user " + id + " entered room \"" + roomName + "\"");
                if (isRoomFull(idx)) {
                    socket.emit('connected');
                    socket.to(roomName).emit('connected');
                    log(roomName + " connected. " + JSON.stringify(Rooms[idx]));
                }
            }
            else {
                socket.emit('rejected room', check.msg);
                log("rejected room, to access " + JSON.stringify(Rooms[idx]));
            }
        }
        log("find room results : " + JSON.stringify(Rooms));
    });
    socket.on('move', function (value) {
        var roomName = value[0];
        var data = value[1][0]; // 이 부분에 데이터 양이 많아질 것.
        socket.to(roomName).emit('accept move', data);
    });
});
function findRoom(name) {
    return Rooms.findIndex(function (room) { return room.name === name; });
}
function available(roomIdx, roll) {
    var room = Rooms[roomIdx];
    var res = { status: false, msg: '' };
    switch (roll) {
        case 'c':
            if (!room.controllers) {
                res.status = true;
            }
            else {
                res.status = (room.controllers).length < MAX_CONTROLLER;
                res.msg = res.status ? '' : 'Max # of controller';
            }
            break;
        case 'd':
            if (!room.drones) {
                res.status = true;
            }
            else {
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
function addUser(idx, id, roll) {
    var Room = Rooms[idx];
    switch (roll) {
        case 'c':
            if (Room.controllers) {
                Room.controllers.push({ id: id });
            }
            else {
                Room.controllers = [{ id: id }];
            }
            break;
        case 'd':
            if (Room.drones) {
                Room.drones.push({ id: id });
            }
            else {
                Room.drones = [{ id: id }];
            }
            break;
        default:
            break;
    }
}
function exitUser(id, socket) {
    var _a = findRoomIdxWithUserId(id), idx = _a.idx, roll = _a.roll;
    try {
        switch (roll) {
            case 'c':
                var controllers = Rooms[idx].controllers.filter(function (e) { return e.id !== id; });
                Rooms[idx].controllers = controllers;
                socket.leave(Rooms[idx].name);
                break;
            case 'd':
                var drones = Rooms[idx].drones.filter(function (e) { return e.id !== id; });
                Rooms[idx].drones = drones;
                socket.leave(Rooms[idx].name);
                break;
            default:
                // log(`exitUser ${id} may not worked.`);
                break;
        }
    }
    catch (err) {
        log("---exitUser---\n" + err + "\n--------------");
    }
    deleteVacantRoom(idx);
}
function findRoomIdxWithUserId(id) {
    var roll = '';
    return { idx: Rooms.findIndex(function (room) {
            var res;
            if (room.controllers) {
                res = (room.controllers.filter(function (user) { return user.id === id; })).length > 0;
                if (res) {
                    roll = 'c';
                    return true;
                }
            }
            if (room.drones) {
                res = (room.drones.filter(function (user) { return user.id === id; })).length > 0;
                if (res) {
                    roll = 'd';
                    return true;
                }
            }
            return false;
        }), roll: roll };
}
function deleteVacantRoom(idx) {
    if (idx >= 0) {
        var ctrs = Rooms[idx].controllers;
        var drs = Rooms[idx].drones;
        var res = false;
        if (ctrs && drs) {
            if (ctrs.length === 0 && drs.length === 0) {
                // remove Rooms[idx];
                res = true;
            }
        }
        else if (ctrs && ctrs.length === 0) {
            res = true;
        }
        else if (drs && drs.length === 0) {
            res = true;
        }
        if (res) {
            // dangerous.. if some rooms are deleting simultaneously
            var roomName_1 = Rooms[idx].name;
            Rooms = Rooms.filter(function (e) { return e.name !== roomName_1; });
        }
    }
}
function log(msg) {
    var timestamp = (new Date()).toISOString();
    console.log(timestamp, msg);
}
function isRoomFull(idx) {
    if (Rooms[idx].controllers && Rooms[idx].drones) {
        return (Rooms[idx].controllers).length === MAX_CONTROLLER && (Rooms[idx].drones).length === MAX_DRONE;
    }
    return false;
}
