/* eslint-disable no-console */
const PriorityQueue = require('updatable-priority-queue');
const io = require('socket.io')(process.env.PORT);
const utils = require('./brokerUtils');
const jsonfile = require('jsonfile');

const dbName = 'DB.json';
const serverQueue = new PriorityQueue();
let numServers = 0; // Current amount of servers connected
const serverIndices = {}; // store id for a server, by key=ip_address:port
const serverDirs = {}; // store ip_address:port for a server, by key=id

function increaseNumServers() {
  numServers += 1;
}

// Init database
jsonfile.spaces = 2;
jsonfile.writeFile(dbName, { files: {} }, err => {
  if (err) console.err(err);
  console.log('DB initialized');
});

// eslint-disable-next-line no-undef
io.on('connection', socket => {
  console.info(`socket connected, ID: ${socket.id}`);

  // events with servers
  socket.on('register-server', serverData => {
    const dir = serverData.dir;
    const diskSpace = serverData.disk;
    const priority = utils.getServerPriority(0, diskSpace);
    serverQueue(numServers, priority);
    serverDirs[numServers] = dir;
    serverIndices[dir] = numServers;

    increaseNumServers();
    socket.emit('register-server', { res: 'OK' });
  });

  socket.on('update-server', serverData => {
    const dir = serverData.dir;
    const diskSpace = serverData.disk;
    const load = serverData.load;
    const newPriority = utils.getServerPriority(load, diskSpace);
    serverQueue.updateKey(serverIndices[dir], newPriority);
  });

  // events with client
  socket.on('list-files', () => {
    jsonfile.readFile(dbName, (err, db) => {
      if (err) console.err(err);
      const filenames = Object.keys(db.files);
      const res = {
        res: 'OK',
        data: filenames
      };
      socket.emit('list-files', res);
    });
  });

  socket.on('get-file' () => {
    // TODO
  });

  socket.on('save-file' () => {
    // TODO
  });

  socket.on('remove-file' (req) => {
    const filename = req.filename;
    jsonfile.readFile(dbName, (err, db) => {
      if (err) console.err(err);
      const serversToRemove = db.files[filename];
      delete db.files[filename];
      jsonfile.writeFile(dbName, db, (err) => {
        if (err) console.err('Error writing db', err);
        console.log('DB Updated');
      });
      const res = {
        res: 'OK',
        data: servers
      };
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket has disconnected');
  });
});
