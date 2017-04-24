const PriorityQueue = require('updatable-priority-queue');
const socket_io = require('socket.io');
const utils = require('./brokerUtils');
const jsonfile = require('jsonfile');

const port = process.env.PORT || '8080';

const io = socket_io(port);
const serverSocket = io.of('/server');
const clientSocket = io.of('/client');

console.log(`Listening on ${port}`);

const DB_NAME = 'DB.json';
const serverQueue = new PriorityQueue();

// Init database
jsonfile.spaces = 2;
jsonfile.readFile(DB_NAME, (err, data) => {
  if (err) {
    jsonfile.writeFile(DB_NAME, { files: {} }, err => {
      if (err) {
        return console.error(err);
      }
      console.log('DB initialized');
    });
  }
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

  wsServer.on('upload_end', serverData => {
    const filename = serverData.filename;
    const server = serverData.server;
    jsonfile.readFile(DB_NAME, (err, db) => {
      db.files[filename] = server;
      jsonfile.writeFile(DB_NAME, db, err => {
        if (err) {
          console.error(`Error updating the db ${err}`);
        } else {
          console.log(`Saved ${filename} in server: ${server}`);
          listFiles(clientSocket);
        }
      });
    });
  });

  wsServer.on('disconnect', () => {
    console.log(`Server socket at ${wsServer.dir} has disconnected`);
    // Put MAX_SAFE_INTEGER in order that this socket is never taken
    serverQueue.updateKey(wsServer.dir, Number.MAX_SAFE_INTEGER);
  });
});

// ############################################################################
function listFiles(wsClient) {
  jsonfile.readFile(DB_NAME, (err, db) => {
    const res = {};
    if (err) {
      console.error(`[list] Error getting the db: ${err}`);
      res.status = false;
    } else {
      const filenames = Object.keys(db.files);
      res.status = true;
      res.files = filenames;
    }
    wsClient.emit('list_files', res);
  });
}

clientSocket.on('connection', wsClient => {
  console.info(`Client socket connected, ID: ${wsClient.id}`);

  wsClient.on('list_files', () => {
    console.log('List files asked', wsClient.id);
    listFiles(wsClient);
  });

  wsClient.on('download_getServer', fileData => {
    const filename = fileData.filename;
    console.log(`Download ${filename} asked by: ${wsClient.id}`);
    jsonfile.readFile(DB_NAME, (err, db) => {
      const res = {};
      if (err) {
        console.error(`[upload] Error getting the db ${err}`);
        res.status = false;
      } else {
        const server = db.files[filename];
        res.status = true;
        res.server = server;
        console.log(`${filename} is in server: ${server}`);
      }
      wsClient.emit('download_getServer', res);
    });
  });

  wsClient.on('upload_getServer', fileData => {
    const filename = fileData.filename;
    console.log(`Upload ${filename} asked by: ${wsClient.id}`);
    const bestServer = serverQueue.peek().item;

    jsonfile.readFile(DB_NAME, (err, db) => {
      let res = { status: false };
      if (err) {
        console.error(`[upload] Error getting the db ${err}`);
        res.message = 'Error getting the db';
        wsClient.emit('upload_getServer', res);
      } else {
        if (!db.files[filename]) {
          res.status = true;
          res.server = bestServer;
          wsClient.emit('upload_getServer', res);
        } else {
          res.message = 'File exists';
          wsClient.emit('upload_getServer', res);
        }
      }
    });
  });

  wsClient.on('disconnect', () => {
    console.log('Client socket has disconnected');
  });
});
