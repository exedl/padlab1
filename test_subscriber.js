let MessageBrokerAPI = require('./MessageBrokerAPI');

var api = new MessageBrokerAPI({
    proto: 'tcp',
    type: 'subscriber',
    callback: (data) => {
        console.log('callback');
        console.log(data);
    }
});

api.listTopics((data) => {
    console.log('list topics');
    console.log(data);
});

api.subscribeTopic('news', (data) => {
    console.log('subscribe');
    console.log(data);
});