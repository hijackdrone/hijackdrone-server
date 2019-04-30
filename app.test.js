// const server = require('./app');
// const io = require('socket.io-client');

// const ioOptions= { 
//     transports: ['websocket']
//   , forceNew: true
//   , reconnection: false
// }
// var control, drone;

// beforeEach((done)=>{
//     // start the io server
//     server.start()
//     // connect two io clients
//     control = io('http://localhost:4001/', ioOptions)
//     drone = io('http://localhost:4001/', ioOptions)
//     // finish beforeEach setup
//     done();
// });
// afterEach( (done)=>{
//     // disconnect io clients after each test
//     control.disconnect()
//     drone.disconnect()
//     server.close();
//     done();
// });
describe('testing describe',()=>{
    test('first test',()=>{
        let a=()=>{
            return 2;
        }
        expect(a()).toBe(2);
    });
    test('second test',()=>{
        let b=()=>{
            return 3;
        }
        expect(b()).toBe(3);
    });
});
describe('testing describe 2',()=>{
    test('first test 2',()=>{
        let a=()=>{
            return 2;
        }
        expect(a()).toBe(2);
    });
    test('second test 2',()=>{
        let b=()=>{
            return 3;
        }
        expect(b()).toBe(3);
    });
})
