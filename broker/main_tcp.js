var net = require('net');
var Queue = require('./Queue.js');

let connections = [];

function getSenderIndexByTopic(topic) {
    connections.forEach((connection, index) => {
        if (connection.sender.topic == topic)
            return index;
    });

    return -1;
}

let socket_read = net.createServer(function(socket) {
    socket.topic = '';
    socket.subscribers = [];
    socket.queue = new Queue();

    console.log('New sender connection');

    socket.on('data', (data) => {
        try {
            console.log(data.toString());
            data = JSON.parse(data.toString());
            
            if (socket.topic == '') {
                if (data.type == 'start') {
                    var topic = data.message;

                    if (connections.topic !== undefined) {
                        socket.write(JSON.stringify({type: 'start', error: 'Already existing'}));
                    } else {
                        socket.topic = topic;
                        connections[topic] = {};
                        connections[topic].subscribers = [];
                        connections[topic].queue = new Queue();

                        socket.write(JSON.stringify({type: 'start', topic: topic}));
                    }
                }
            } else {
                var topic = socket.topic;
                
                if (data.message != '') {
                    connections[topic].queue.push(data.message);
                }

                if (connections[topic].subscribers.length > 0) {
                    while (!connections[topic].queue.empty()) {
                        var message = connections[topic].queue.pop();
                        var response = {
                            type: 'new_message',
                            topic: topic,
                            message: message
                        };

                        connections[topic].subscribers.forEach((connection, index) => {
                            connection.write(JSON.stringify(response));
                        });
                    }
                }
            }
        } catch (error) {
            
        }
    });

    socket.on('error', function(error) {
        for (var topic in connections) {
            console.log(topic);
        }

        if (connections[socket.topic] === undefined)
            return;

        if (connections[socket.topic].subscribers.length > 0) {
            connections[socket.topic].subscribers.forEach((connection, index) => {
                connection.write(JSON.stringify({type: 'offline'}));
            });
        }

        connections[socket.topic] = undefined;
	});

	socket.on('close', function(close) {
        for (var topic in connections) {
            console.log(topic);
        }

        if (connections[socket.topic] === undefined)
            return;

		if (connections[socket.topic].subscribers.length > 0) {
            connections[socket.topic].subscribers.forEach((connection, index) => {
                connection.write(JSON.stringify({type: 'offline'}));
            });
        }

        connections[socket.topic] = undefined;
	});
});

let socket_send = net.createServer(function(socket) {
    socket.subscribed = '';

    console.log('New client connection');

    socket.on('data', (data) => {
        try {
            data = JSON.parse(data.toString());

            console.log(data);

            if (socket.subscribed == '') {
                if (data.type == 'topics_list') {
                    var list = [];
                    
                    for (var topic in connections) {
                        list.push(topic);
                    }

                    var response = {
                        type: 'topics_list',
                        message: list
                    };

                    socket.write(JSON.stringify(response));
                } else if (data.type == 'subscribe') {
                    var topic = data.topic;

                    if (connections[topic] !== undefined) {
                        connections[topic].subscribers.push(socket);

                        if (connections[topic].subscribers.length > 0) {
                            while (!connections[topic].queue.empty()) {
                                var message = connections[topic].queue.pop();
                                var response = {
                                    type: 'new_message',
                                    topic: topic,
                                    message: message
                                };
    
                                connections[topic].subscribers.forEach((connection, index) => {
                                    connection.write(JSON.stringify(response));
                                });
                            }
                        }
                    } else {
                        // no such topic
                    }
                }
            } else {
                
            }
        } catch (error) {
            
        }
    });

    socket.on('error', function(error) {
        // todo: remove from list
	});

	socket.on('close', function(close) {
		// todo: remove from list
	});
});

socket_read.listen(3900, function() {
    console.log('Server listening at tcp://localhost:' + 3900);
});

socket_send.listen(3901, function() {
    console.log('Server listening at tcp://localhost:' + 3901);
});

socket_read.on('error', function(error) {
	//console.log('Error: ', error.message);
});

socket_read.on('close', function(error) {
	console.log('Socket closed');
});

socket_send.on('error', function(error) {
	//console.log('Error: ', error.message);
});

socket_send.on('close', function(error) {
	console.log('Socket closed');
});