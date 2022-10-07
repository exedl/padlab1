module.exports = class Queue {
    constructor() {
        this.q = [];
    }

    push(item) {
        this.q.push(item);
    }

    pop() {
        return this.q.shift();
    }

    empty() {
        return (this.q.length ? false : true);
    }
}