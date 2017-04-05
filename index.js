var io = require('socket.io')(process.env.PORT);

let numServers = 0;
let serverIndex = {}; // store id for a server, by key=ip_address:port
let serverDir = {}; // store ip_address:port for a server, by key=id

console.info(`Now running on localhost:${process.env.PORT}`);

io.on('connection', function (socket) {
  console.info(`socket connected, ID: ${socket.id}`);

  // events with servers
  socket.on('register-server', (data) => {
    const serverDir = data.dir;
    const diskSpace = data.disk;
    // TODO: init server function
  });

  socket.on('update-server', (data) => {
    const serverDir = data.dir;
    const load = data.load;
    const diskSpace = data.disk;
    // TODO: update server info function
  });

  // events with client

  socket.on('disconnect', function () {
    console.log('Socket has disconnected');
  });
});
