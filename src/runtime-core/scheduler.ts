const queue: any[] = [];
let isFlushPanding = false;
const FlushPromise = Promise.resolve();
export function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
export function nextTick(fn) {
    return fn ? FlushPromise.then(fn) : FlushPromise;
}
function queueFlush() {
    if (!isFlushPanding) {
        isFlushPanding = true;
        nextTick(flushJobs);
    }
}
function flushJobs() {
    isFlushPanding = false;
    let job: any;
    while (job = queue.shift()) {
        job && job();
    }
}

