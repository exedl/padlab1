var Queue = require('./Queue.js');

var BROKER_PROTO_PATH = __dirname + '/../broker.proto';
var SUBSCRIBER_PROTO_PATH = __dirname + '/../subscriber.proto';

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var brokerPackageDefinition = protoLoader.loadSync(
    BROKER_PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);
var subscriberPackageDefinition = protoLoader.loadSync(
    SUBSCRIBER_PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);

var broker_proto = grpc.loadPackageDefinition(brokerPackageDefinition).broker;
var subscriber_proto = grpc.loadPackageDefinition(subscriberPackageDefinition).subscriber;

var connections = {};

function registerTopic(call, callback) {
    connections[call.request.topic] = {
        subscribers: [],
        queue: new Queue()
    };

    console.log(connections);

    callback(null, {
		type: 'start',
		message: 'true'
	});
}

function subscribeTopic(call, callback) {
    if (connections[call.request.topic] === undefined) {
        callback(null, {
            type: 'subscribe',
            message: 'false'
        });

        return;
    }

    connections[call.request.topic].subscribers.push(
        new subscriber_proto.SubscriberServer('127.0.0.1:' + call.request.port, grpc.credentials.createInsecure())
    );

    if (connections[call.request.topic].subscribers.length > 0) {
        while (!connections[call.request.topic].queue.empty()) {
            var message = connections[call.request.topic].queue.pop();

            connections[call.request.topic].subscribers.forEach((connection, index) => {
                connection.updateCallback({
                    type: 'new_message',
                    message: message
                }, (err, response) => {
                    console.log(response);
                });
            });
        }
    }

    callback(null, {
		type: 'subscribe',
		message: 'true'
	});
}

function listTopics(call, callback) {
    var list = [];
                    
    for (var topic in connections) {
        list.push(topic);
    }

    console.log(connections);

    callback(null, {
		topics: list
	});
}

function updateTopic(call, callback) {
    console.log(call.request.message);

    if (call.request.message != '') {
        connections[call.request.topic].queue.push(call.request.message);
    }

    if (connections[call.request.topic].subscribers.length > 0) {
        while (!connections[call.request.topic].queue.empty()) {
            var message = connections[call.request.topic].queue.pop();
            connections[call.request.topic].subscribers.forEach((connection, index) => {
                connection.updateCallback({
                    type: 'new_message',
                    message: message
                }, (err, response) => {
                    console.log(response);
                });
            });
        }
    }

    callback(null, {
		type: 'subscribe',
		message: 'true'
	});
}

var server = new grpc.Server();
server.addService(broker_proto.BrokerServer.service, {
    registerTopic: registerTopic,
    subscribeTopic: subscribeTopic,
    listTopics: listTopics,
    updateTopic: updateTopic
});
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
});