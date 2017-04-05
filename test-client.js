const socket = require('socket.io-client')('http://localhost:8080');
socket.on('connect', function() {
  console.log('Connected to server');
});
socket.on('message', function(data) {
  console.log('Got data: ', data);
});
socket.on('disconnect', function() {
  console.log('Disconnected from server');
});

socket.emit('list-files');

socket.on('list-files', data => {
  console.log(data);
});
