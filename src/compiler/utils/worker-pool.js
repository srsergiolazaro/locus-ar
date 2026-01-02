import { Worker } from 'node:worker_threads';
import os from 'node:os';

export class WorkerPool {
    constructor(workerPath, poolSize = os.cpus().length) {
        this.workerPath = workerPath;
        this.poolSize = poolSize;
        this.workers = [];
        this.queue = [];
        this.activeWorkers = 0;
    }

    runTask(taskData) {
        return new Promise((resolve, reject) => {
            const task = { taskData, resolve, reject };
            if (this.workers.length > 0) {
                this._executeTask(this.workers.pop(), task);
            } else if (this.activeWorkers < this.poolSize) {
                this._executeTask(this._createWorker(), task);
            } else {
                this.queue.push(task);
            }
        });
    }

    _createWorker() {
        this.activeWorkers++;
        const worker = new Worker(this.workerPath);
        return worker;
    }

    _executeTask(worker, task) {
        const onMessage = (msg) => {
            if (msg.type === 'progress' && task.taskData.onProgress) {
                task.taskData.onProgress(msg.percent);
            } else if (msg.type === 'compileDone') {
                cleanup();
                this._finishTask(worker, task.resolve, msg.trackingData);
            } else if (msg.type === 'matchDone') {
                cleanup();
                this._finishTask(worker, task.resolve, msg.matchingData);
            } else if (msg.type === 'error') {
                cleanup();
                this._finishTask(worker, task.reject, new Error(msg.error));
            }
        };

        const onError = (err) => {
            cleanup();
            this._finishTask(worker, task.reject, err);
        };

        const cleanup = () => {
            worker.removeListener('message', onMessage);
            worker.removeListener('error', onError);
        };

        worker.on('message', onMessage);
        worker.on('error', onError);

        // Create a copy of taskData without functions for the worker
        const serializableData = {};
        for (const [key, value] of Object.entries(task.taskData)) {
            if (typeof value !== 'function') {
                serializableData[key] = value;
            }
        }

        worker.postMessage({
            type: 'compile',
            ...serializableData
        });
    }

    _finishTask(worker, callback, result) {
        if (this.queue.length > 0) {
            this._executeTask(worker, this.queue.shift());
        } else {
            this.workers.push(worker);
        }
        callback(result);
    }

    async destroy() {
        await Promise.all(this.workers.map(w => w.terminate()));
        this.workers = [];
        this.activeWorkers = 0;
    }
}
