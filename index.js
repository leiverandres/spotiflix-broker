const PriorityQueue = require('updatable-priority-queue');
const io = require('socket.io')(process.env.PORT);
const utils = require('./brokerUtils');
const jsonfile = require('jsonfile');

const dbName = 'DB.json';
const serverQueue = new PriorityQueue();

// Init database
jsonfile.spaces = 2;
jsonfile.writeFile(dbName, { files: {} }, err => {
  if (err) console.err(err);
  console.log('DB initialized');
});

io.on('connection', socket => {
  console.info(`socket connected, ID: ${socket.id}`);

  // events with servers
  socket.on('register_server', serverData => {
    const serverDir = serverData.dir;
    const diskSpace = serverData.disk;
    const priority = utils.getServerPriority(0, diskSpace);
    serverQueue(serverDir, priority);

    socket.emit('register-server', { res: 'OK' });
  });

  socket.on('update_server', serverData => {
    const serverDir = serverData.dir;
    const diskSpace = serverData.disk;
    const load = serverData.load;
    const newPriority = utils.getServerPriority(load, diskSpace);
    serverQueue.updateKey(serverDir, newPriority);
  });

  // events with client
  socket.on('list_files', () => {
    jsonfile.readFile(dbName, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[list] Error getting the db: ${err}`);
        res.res = 'FAILED';
      } else {
        const filenames = Object.keys(db.files);
        res.res = 'OK';
        res.files = filenames;
      }
      socket.emit('list-files', res);
    });
  });

  socket.on('download_getServer', fileData => {
    const filename = fileData.filename;
    jsonfile.readFile(dbName, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[upload] Error getting the db ${err}`);
        res.res = 'FAILED';
      } else {
        const server = db.files[filename];
        res.res = 'OK';
        res.server = server;
      }
      socket.emit('download_getServer', res);
    });
  });

  socket.on('upload_getServer', fileData => {
    const filename = fileData.filename;
    const bestServer = serverQueue.peek();

    jsonfile.readFile(dbName, (err, db) => {
      const res = {};
      if (err) {
        console.err(`[upload] Error getting the db ${err}`);
        res.res = 'FAILED';
      } else {
        db.files[filename] = bestServer;
        res.res = 'OK';
        res.server = bestServer;
        jsonfile.writeFile(dbName, db, err => {
          if (err) console.err(`[upload] Error updating the db ${err}`);
          socket.emit('upload_getServer', res);
        });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket has disconnected');
  });
});
