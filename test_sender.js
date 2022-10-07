let MessageBrokerAPI = require('./MessageBrokerAPI');

var api = new MessageBrokerAPI({
    proto: 'tcp',
    callback: (data) => {
        console.log('callback');
        console.log(data);
    }
});

api.createTopic('news', (data) => {
    console.log('create topic');
    console.log(data);
});

api.topic = 'news';

api.updateTopic('test', (data) => {
    console.log('update topic');
    console.log(data);
});