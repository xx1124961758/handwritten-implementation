const PENDING = 'pengding';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function MyPromise(excutor) {
  this.status = PENDING;
  this.value = undefined;
  this.reason = undefined;

  this.onFulfilledCallbacks = [];
  this.onRejectedCallbacks = [];

  const resolve = value => {
    if (this.status === PENDING) {
      this.status = FULFILLED;
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn());
    }
  }

  const reject = reason => {
    if (this.status === PENDING) {
      this.status = REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
    }
  }

  try {
    excutor(resolve, reject);
  } catch (error) {
    reject(error);
  }
}

function isThenable(obj) {
  return ((typeof obj === 'object' && obj !== null) || typeof obj === 'function') && typeof obj.then === 'function';
}

function resolvePromise(promise2, x, resolve, reject) {

  if (promise2 === x) {
    throw new TypeError('type error')
  }

  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    let then;
    try {
      then = x.then;
    } catch (error) {
      reject(error);
    }

    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(x, v => {
          if (called) {
            return;
          }
          called = true;
          resolvePromise(promise2, v, resolve, reject);
        }, e => {
          if (called) {
            return;
          }
          called = true;
          reject(e);
        })
      } catch (error) {
        if (called) return;
        reject(error);
      }
    } else {
      resolve(x);
    }
  } else {
    resolve(x);
  }
}

MyPromise.prototype.then = function (onFulfilled, onRejected) {

  if (typeof onFulfilled !== 'function') {
    onFulfilled = val => val;
  }

  if (typeof onRejected !== 'function') {
    onRejected = error => {
      throw error;
    }
  }

  const promise2 = new MyPromise((resolve2, reject2) => {
    if (this.status === FULFILLED) {
      setTimeout(() => {
        try {
          const x = onFulfilled(this.value);
          resolvePromise(promise2, x, resolve2, reject2);
        } catch (error) {
          reject2(error);
        }
      }, 0);
      return;
    }

    if (this.status === REJECTED) {
      setTimeout(() => {
        try {
          const x = onRejected(this.reason);
          resolvePromise(promise2, x, resolve2, reject2);
        } catch (error) {
          reject2(error);
        }
      }, 0);
      return;
    }

    if (this.status === PENDING) {
      this.onFulfilledCallbacks.push(() => {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve2, reject2);
          } catch (error) {
            reject2(error);
          }
        }, 0);
      });

      this.onRejectedCallbacks.push(() => {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve2, reject2);
          } catch (error) {
            reject2(error);
          }
        }, 0);
      });
    }
  });

  return promise2;
}

MyPromise.deferred = function () {
  const deferred = {};
  const p = new MyPromise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  deferred.promise = p;

  return deferred;
}

// 上面的代码就可以通过 promises-aplus-tests 测试了，下面添加其他的功能

MyPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
}

MyPromise.resolve = function (value) {
  return new MyPromise((resolve) => {
    resolve(value);
  });
}

MyPromise.reject = function (reason) {
  return new MyPromise((resolve, reject) => {
    reject(reason);
  });
}

MyPromise.all = function (insArr) {
  const p = new MyPromise((resolve, reject) => {
    let count = 0;
    const values = [];
    const len = insArr.length;
    for (let i = 0; i < len; i++) {
      const ins = insArr[i];
      if (isThenable(ins)) {
        ins.then((v) => {
          values[i] = v;
          count++;
          if (count === len) {
            resolve(values);  // TODO
          }
        }, (error) => {
          reject(error);
        })
      } else {
        values[i] = ins;
        count++;
        if (count === len) {
          resolve(values);
        }
      }
    }
  });
  return p;
}

MyPromise.race = function (insArr) {
  const p = new Promise((resolve, reject) => {
    for(const ins of insArr) {
      if(isThenable(ins)) {
        ins.then((v) => {
          resolvePromise(p, v, resolve, reject);
          return;
        }, error => {
          reject(error);
          return;
        })
      } else {
        resolve(ins);
        return;
      }
    }
  });

  return p;
}

MyPromise.allSettled = function (insArr) {
  const p = new MyPromise((resolve) => {
    let count = 0;
    const values = [];
    const len = insArr.length;
    for (let i = 0; i < len; i++) {
      const ins = insArr[i];
      if (isThenable(ins)) {
        ins.then((v) => {
          values[i] = {
            status: 'fulfilled',
            value: v,
          };
          count++;
          if (count === len) {
            resolve(values); // TODO
          }
        }, (error) => {
          values[i] = {
            status: 'rejected',
            reason: error,
          };
          count++;
          if (count === len) {
            resolve(values);
          }
        })
      } else {
        values[i] = {
          status: 'fulfilled',
          value: ins,
        };
        count++;
        if (count === len) {
          resolve(values);
        }
      }
    }
  });
  return p;
}

module.exports = MyPromise;