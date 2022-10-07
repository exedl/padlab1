var net = require('net');
const client = new net.Socket();

var BROKER_PROTO_PATH = __dirname + '/broker.proto';
var SUBSCRIBER_PROTO_PATH = __dirname + '/subscriber.proto';

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

let broker_proto = grpc.loadPackageDefinition(brokerPackageDefinition).broker;
let subscriber_proto = grpc.loadPackageDefinition(subscriberPackageDefinition).subscriber;

module.exports = class MessageBrokerAPI {
    constructor(params) {
        this.proto = params.proto;

        if (params.proto == 'tcp') {
            this.connection = new net.Socket();
            this.connection.connect(((params.type == 'subscriber') ? 3901 : 3900), '127.0.0.1', () => {});
            MessageBrokerAPI.callback = params.callback;
            
            this.connection.on('data', function(data) {
                var data = JSON.parse(data.toString());
                
                MessageBrokerAPI.callback(data);
            });
            
            this.connection.on('close', function() {
                console.log('Connection closed');
            });
            
            this.connection.on('error', function() {
                console.log('Connection closed (Error)');
            });
        } else if (params.proto == 'grpc') {
            if (params.type == 'subscriber') {
                this.port = Math.floor(Math.random() * (55000 - 50100 + 1) + 50100);

                this.subscriberServer = new grpc.Server();
                this.subscriberServer.addService(subscriber_proto.SubscriberServer.service, {
                    updateCallback: this.updateCallback
                });
                this.subscriberServer.bindAsync('0.0.0.0:' + this.port, grpc.ServerCredentials.createInsecure(), () => {
                    this.subscriberServer.start();
                });
            }

            this.subscriberClient = new broker_proto.BrokerServer('127.0.0.1:50051', grpc.credentials.createInsecure());

            MessageBrokerAPI.callback = params.callback;
        }
    }

    updateCallback(call, callback) {
        MessageBrokerAPI.callback(call.request);

        callback(null, {
            type: 'update',
            message: 'true'
        });
    }

    createTopic(topic, callback) {
        this.topic = topic;

        if (this.proto == 'tcp') {
            this.connection.write(JSON.stringify({
                type: 'start',
                message: topic
            }));
        } else if (this.proto == 'grpc') {
            this.subscriberClient.registerTopic({topic: topic}, function(err, response) {
                callback(response);
            });
        }
    }

    listTopics(callback) {
        if (this.proto == 'tcp') {
            this.connection.write(JSON.stringify({
                type: 'topics_list'
            }));
        } else if (this.proto == 'grpc') {
            this.subscriberClient.listTopics({}, function(err, response) {
                callback(response);
            });
        }
    }

    updateTopic(message, callback) {
        if (this.proto == 'tcp') {
            this.connection.write(JSON.stringify({
                type: 'message',
                message: message
            }));
        } else if (this.proto == 'grpc') {
            this.subscriberClient.updateTopic({topic: this.topic, message: message}, (err, response) => {
                callback(response);
            });
        }
    }

    subscribeTopic(topic, callback) {
        this.topic = topic;

        if (this.proto == 'tcp') {
            this.connection.write(JSON.stringify({
                type: 'subscribe',
                topic: topic
            }));
        } else if (this.proto == 'grpc') {
            this.subscriberClient.subscribeTopic({topic: topic, port: this.port}, function(err, response) {
                callback(response);
            });
        }
    }
}