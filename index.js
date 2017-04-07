const PriorityQueue = require('updatable-priority-queue');
const io = require('socket.io')(process.env.PORT);
const utils = require('./brokerUtils');
const jsonfile = require('jsonfile');

const serverSocket = io.of('/server');
const clientSocket = io.of('/client');

const DB_NAME = 'DB.json';
const serverQueue = new PriorityQueue();

// Init database
jsonfile.spaces = 2;
jsonfile.writeFile(DB_NAME, { files: {} }, err => {
  if (err) return console.err(err);
  console.log('DB initialized');
});

serverSocket.on('connection', wsServer => {
  console.info(`Server socket connected, ID: ${wsServer.id}`);

  wsServer.on('register_server', serverData => {
    const serverDir = serverData.dir;
    const diskSpace = serverData.disk;
    const priority = utils.getServerPriority(0, diskSpace);
    serverQueue.insert(serverDir, priority);
    wsServer.dir = serverDir;
    serverSocket.emit('register_server');
  });

  wsServer.on('update_server', serverData => {
    const serverDir = serverData.dir;
    const diskSpace = serverData.disk;
    const load = serverData.load;
    const newPriority = utils.getServerPriority(load, diskSpace);
    serverQueue.updateKey(serverDir, newPriority);
    serverSocket.emit('update_server');
  });

  wsServer.on('disconnect', () => {
    console.log(`Server socket at ${wsServer.dir} has disconnected`);
    // Put MAX_SAFE_INTEGER in order that this socket is never taken
    serverQueue.updateKey(wsServer.dir, Number.MAX_SAFE_INTEGER);
  });
});

// ############################################################################

clientSocket.on('connection', wsClient => {
  console.info(`Client socket connected, ID: ${wsClient.id}`);

  wsClient.on('list_files', () => {
    console.log('List files asked');
    jsonfile.readFile(DB_NAME, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[list] Error getting the db: ${err}`);
        res.res = 'FAILED';
      } else {
        const filenames = Object.keys(db.files);
        res.res = 'OK';
        res.files = filenames;
      }
      clientSocket.emit('list_files', res);
    });
  });

  wsClient.on('download_getServer', fileData => {
    console.log('download files asked');
    const filename = fileData.filename;
    jsonfile.readFile(DB_NAME, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[upload] Error getting the db ${err}`);
        res.res = 'FAILED';
      } else {
        const server = db.files[filename];
        res.res = 'OK';
        res.server = server;
      }
      clientSocket.emit('download_getServer', res);
    });
  });

  wsClient.on('upload_getServer', fileData => {
    console.log('upload files asked');
    const filename = fileData.filename;
    const bestServer = serverQueue.peek();

    jsonfile.readFile(DB_NAME, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[upload] Error getting the db ${err}`);
        res.res = 'FAILED';
      } else {
        db.files[filename] = bestServer;
        res.res = 'OK';
        res.server = bestServer;
        jsonfile.writeFile(DB_NAME, db, err => {
          if (err) console.err(`[upload] Error updating the db ${err}`);
          clientSocket.emit('upload_getServer', res);
        });
      }
    });
  });

  wsClient.on('disconnect', () => {
    console.log('Client socket has disconnected');
  });
});
