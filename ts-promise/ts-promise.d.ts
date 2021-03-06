declare module 'ts-promise/util' {
	export function assert(condition: any, msg?: string): void;

}
declare module 'ts-promise/async' {
	export class Async {
		private _pool;
		private _ring;
		private _current;
		private _flusher;
		private _flushing;
		private _scheduled;
		private _scheduler;
		/**
		 * Configure alternative scheduler to use.
		 * The scheduler function will be called with a flusher, which needs to be
		 * executed to flush the queue. Note: the flusher may throw an
		 * exception, if any of the callbacks on the queue throws one.
		 * This will result in another flush to be scheduled before returning.
		 *
		 * Call with `null` to reset the scheduler to the default (setImmediate).
		 *
		 * Example usage (this is basically the default):
		 *   setScheduler((flusher) => setImmediate(flusher));
		 */
		setScheduler(scheduler: (flusher: () => void) => void): void;
		enqueue(callback: (arg: any) => void, arg: any): void;
		private _schedule();
		private _scheduledFlush();
		flush(): void;
	}
	export var async: Async;
	export default async;

}
declare module 'ts-promise/Stack' {
	export default class Stack {
		private stack;
		constructor(ignoreUntil?: Function);
		inspect(): string;
	}

}
declare module 'ts-promise/Trace' {
	import Stack from 'ts-promise/Stack';
	/**
	 * Stack trace container with optional source traces.
	 *
	 * Typically used for capturing traces across asynchronous calls (e.g.
	 * with Promises or Events).
	 */
	export default class Trace {
		stack: Stack;
		sources: Stack[];
		constructor(ignoreUntil?: Function);
		static traceLimit: number;
		/**
		 * Assign another Trace as the source of this Trace.
		 *
		 * Note: the stack of `source` is copied to this Trace, in order to allow
		 * truncating the trace length to `Trace.traceLimit` to prevent memory
		 * exhaustion on e.g. recursive traces.
		 *
		 * @param source Trace to use as source.
		 */
		setSource(source: Trace): void;
		inspect(): string;
	}

}
declare module 'ts-promise/BaseError' {
	export default class BaseError implements Error {
		name: string;
		message: string;
		stack: string;
		constructor(name: string, message: string);
	}

}
declare module 'ts-promise/Promise' {
	import Trace from 'ts-promise/Trace';
	import BaseError from 'ts-promise/BaseError';
	export interface Thenable<T> {
		then<R>(onFulfilled?: (value: T) => R | Thenable<R>, onRejected?: (reason: Error) => R | Thenable<R>): Thenable<R>;
	}
	/**
	 * A ts-promise implements the 'synchronous inspection' interface which allows
	 * to synchronously determine the promise's current state.
	 */
	export interface Inspection<T> {
		/**
		* @return `true` when promise is fulfilled, `false` otherwise.
		*/
		isFulfilled(): boolean;
		/**
		* @return `true` when promise is rejected, `false` otherwise.
		*/
		isRejected(): boolean;
		/**
		* @return `true` when promise is pending (may be resolved to another pending
		*		 promise), `false` otherwise.
		*/
		isPending(): boolean;
		/**
		* @return Fulfillment value if fulfilled, otherwise throws an error.
		*/
		value(): T;
		/**
		* @return Rejection reason if rejected, otherwise throws an error.
		*/
		reason(): any;
	}
	/**
	 * Thrown when a rejected promise is explicitly terminated with `.done()`.
	 */
	export class UnhandledRejectionError extends BaseError {
		/**
		 * Original promise rejection reason.
		 */
		reason: any;
		/**
		 * Trace of rejected promise.
		 */
		trace: Trace;
		constructor(reason: any, trace: Trace);
	}
	/**
	 * Combination of a promise and its resolve/reject functions.
	 * Created using Promise.defer().
	 *
	 * It is generally better (and slightly faster) to use the Promise
	 * constructor to create a promise, as that will also catch any exception
	 * thrown while running the resolver.
	 *
	 * A Deferred can be useful in some scenarios though, e.g. when working with
	 * timers, protocol request/response pairs, etc.
	 */
	export interface Deferred<T> {
		/**
		 * Initially unresolved promise, resolved by the resolve or reject
		 * function on this object.
		 */
		promise: Promise<T>;
		/**
		 * Resolve corresponding promise.
		 * The first call to either resolve or reject resolves the promise, any
		 * other calls are ignored.
		 * This function is a free function (i.e. not a 'method' on this object).
		 * Note: resolving with a rejected Thenable leads to a rejected promise.
		 */
		resolve: (value: T | Thenable<T>) => void;
		/**
		 * Reject corresponding promise.
		 * The first call to either resolve or reject resolves the promise, any
		 * other calls are ignored.
		 * This function is a free function (i.e. not a 'method' on this object).
		 */
		reject: (reason: Error) => void;
	}
	/**
	 * Convenience version of Deferred that allows calling resolve() without an
	 * argument.
	 *
	 * Deferred is a combination of a promise and its resolve/reject functions.
	 * Created using Promise.defer().
	 *
	 * It is generally better (and slightly faster) to use the Promise
	 * constructor to create a promise, as that will also catch any exception
	 * thrown while running the resolver.
	 *
	 * A Deferred can be useful in some scenarios though, e.g. when working with
	 * timers, protocol request/response pairs, etc.
	 */
	export interface VoidDeferred extends Deferred<void> {
		/**
		 * Resolve corresponding promise.
		 * The first call to either resolve or reject resolves the promise, any
		 * other calls are ignored.
		 * This function is a free function (i.e. not a 'method' on this object).
		 * Note: resolving with a rejected Thenable leads to a rejected promise.
		 */
		resolve: (value?: void | Thenable<void>) => void;
	}
	/**
	 * Generic Error class descriptor.
	 *
	 * Allows to pass classes to e.g. `Promise.catch()` which derive from Error.
	 */
	export interface ErrorClass {
		new (...args: any[]): Error;
	}
	/**
	 * Fast, robust, type-safe promise implementation.
	 */
	export class Promise<T> implements Thenable<T>, Inspection<T> {
		private _id;
		private _state;
		private _result;
		private _handlers;
		private _trace;
		/**
		 * Create new Promise.
		 *
		 * Pass a callback that will receive a `resolve()` and `reject()` function
		 * to seal the promise's fate.
		 *
		 * @param  resolver Called with resolve and reject functions
		 */
		constructor(resolver: (resolve: (value: T | Thenable<T>) => void, reject: (reason: Error) => void) => void);
		/**
		 * Run either `onFulfilled` or `onRejected` callbacks when the promise is
		 * resolved. Returns another promise for the return value of such a
		 * callback.
		 *
		 * The callback will always be called at most once, and always
		 * asynchronously (i.e. some time after e.g. the `resolver` passed to the
		 * constructor has resolved the promise).
		 *
		 * Any error thrown or rejected promise returned from a callback will cause
		 * the returned promise to be rejected with that error.
		 *
		 * If either or both callbacks are missing, the fulfillment or rejection is
		 * passed on unmodified.
		 *
		 * Use `.catch(onRejected)` instead of `.then(undefined, onRejected)` for
		 * stronger typing, better readability, and more functionality (predicates).
		 *
		 * @param onFulfilled Callback called with promise's fulfillment
		 *					value iff promise is fulfilled. Callback can return
		 *					another value or promise for a value.
		 * @param onRejected  Optional callback called with promise's rejection
		 *					reason iff promise is rejected. Callback can return
		 *					another value or promise for a value.
		 * @return Promise for value returned by either of the callbacks
		 */
		then<R>(onFulfilled: (value: T) => R | Thenable<R>, onRejected?: (reason: Error) => R | Thenable<R>): Promise<R>;
		/**
		 * Run either `onFulfilled` or `onRejected` callbacks when the promise is
		 * resolved. If the callback throws an error or the returned value resolves
		 * to a rejection, the library will (asynchronously) throw an
		 * `UnhandledRejectionError` with that error.
		 *
		 * The callback will always be called at most once, and always
		 * asynchronously (i.e. some time after e.g. the `resolver` passed to the
		 * constructor has resolved the promise).
		 *
		 * @param onFulfilled Optional callback called with promise's fulfillment
		 *					value iff promise is fulfilled. Any error thrown or
		 *					rejection returned will cause an UnhandledRejectionError
		 *					to be thrown.
		 * @param onRejected  Optional callback called with promise's rejection
		 *					reason iff promise is rejected. Any error thrown or
		 *					rejection returned will cause an UnhandledRejectionError
		 *					to be thrown.
		 */
		done<R>(onFulfilled?: (value: T) => void | Thenable<void>, onRejected?: (reason: Error) => void | Thenable<void>): void;
		/**
		 * Catch all errors in case promise is rejected.
		 *
		 * The returned promise is resolved with the output of the callback, so it
		 * is possible to re-throw the error, but also to return a 'replacement'
		 * value that should be used instead.
		 *
		 * Convenience helper for `.then(undefined, onRejected)`.
		 *
		 * @param onRejected  Callback called with promise's rejection reason iff
		 *					promise is rejected. Callback can return another value
		 *					or promise for a value.
		 * @return Promise for original value, or 'replaced' value in case of error
		 */
		catch<R>(onRejected: (reason: Error) => R | Thenable<R>): Promise<T | R>;
		/**
		 * Catch only errors of the specified class in case promise is rejected.
		 *
		 * The returned promise is resolved with the output of the callback, so it
		 * is possible to re-throw the error, but also to return a 'replacement'
		 * value that should be used instead.
		 *
		 * @param predicate   Error class to match (e.g. RangeError)
		 * @param onRejected  Callback called with promise's rejection reason iff
		 *					promise is rejected. Callback can return another value
		 *					or promise for a value.
		 * @return Promise for original value, or 'replaced' value in case of error
		 */
		catch<R>(predicate: ErrorClass, onRejected: (reason: Error) => R | Thenable<R>): Promise<T | R>;
		/**
		 * Catch only errors of the specified classes in case promise is rejected.
		 *
		 * The returned promise is resolved with the output of the callback, so it
		 * is possible to re-throw the error, but also to return a 'replacement'
		 * value that should be used instead.
		 *
		 * @param predicate   Error classes to match (e.g. [RangeError, TypeError])
		 * @param onRejected  Callback called with promise's rejection reason iff
		 *					promise is rejected. Callback can return another value
		 *					or promise for a value.
		 * @return Promise for original value, or 'replaced' value in case of error
		 */
		catch<R>(predicate: ErrorClass[], onRejected: (reason: Error) => R | Thenable<R>): Promise<T | R>;
		/**
		 * Catch only errors that match the predicate function in case promise is
		 * rejected.
		 * The callback will be called if the predicate function returns a truthy
		 * value for the given rejection reason.
		 *
		 * The returned promise is resolved with the output of the callback, so it
		 * is possible to re-throw the error, but also to return a 'replacement'
		 * value that should be used instead.
		 *
		 * @param predicate   If `predicate(reason)` returns true for given error,
		 *					onRejected is called
		 * @param onRejected  Callback called with promise's rejection reason iff
		 *					promise is rejected. Callback can return another value
		 *					or promise for a value.
		 * @return Promise for original value, or 'replaced' value in case of error
		 */
		catch<R>(predicate: (reason: Error) => boolean, onRejected: (reason: Error) => R | Thenable<R>): Promise<T | R>;
		/**
		 * Asynchronous equivalent of try { } finally { }.
		 *
		 * Runs `handler` when promise resolves (fulfilled or rejected).
		 * Handler is passed the current promise (which is guaranteed to be
		 * resolved), and can be interrogated with e.g. `isFulfilled()`, `.value()`,
		 * etc.
		 *
		 * When `handler` returns `undefined` or its promise is fulfilled, the
		 * promise from `finally()` is resolved to the original promise's resolved
		 * value or rejection reason.
		 * If `handler` throws an error or returns a rejection, the result of
		 * `finally()` will be rejected with that error.
		 *
		 * Example:
		 * someLenghtyOperation().finally((result) => {
		 *   if (result.isFulfilled()) {
		 *	 console.log("succeeded");
		 *   } else {
		 *	 console.log("failed", result.reason());
		 *   }
		 * });
		 *
		 * @param  handler [description]
		 * @return promise with same value/reason as this one, after `handler`'s
		 *		 result (if any) has been fulfilled, or a promise rejected with
		 *		 `handler`'s error if it threw one or returned a rejection.
		 */
		finally(handler: (result: Promise<T>) => void | Thenable<void>): Promise<T>;
		/**
		 * @return `true` when promise is fulfilled, `false` otherwise.
		 */
		isFulfilled(): boolean;
		/**
		 * @return `true` when promise is rejected, `false` otherwise.
		 */
		isRejected(): boolean;
		/**
		 * @return `true` when promise is pending (may be resolved to another pending
		 *		 promise), `false` otherwise.
		 */
		isPending(): boolean;
		/**
		 * @return Fulfillment value if fulfilled, otherwise throws an error.
		 */
		value(): T;
		/**
		 * @return Rejection reason if rejected, otherwise throws an error.
		 */
		reason(): any;
		/**
		 * @return A human-readable representation of the promise and its status.
		 */
		inspect(): string;
		/**
		 * @return A human-readable representation of the promise and its status.
		 */
		toString(): string;
		/**
		 * Create a promise that resolves with the same value of this promise, after
		 * `ms` milliseconds. The timer will start when the current promise is
		 * resolved.
		 * If the current promise is rejected, the resulting promise is also
		 * rejected, without waiting for the timer.
		 *
		 * @param ms Number of milliseconds to wait before resolving
		 * @return Promise that fulfills `ms` milliseconds after this promise fulfills
		 */
		delay(ms: number): Promise<T>;
		/**
		 * Return a promise that resolves to `value` after this promise is
		 * fulfilled.
		 * Returned promise is rejected if this promise is rejected.
		 *
		 * Equivalent to `.then(() => value)`.
		 *
		 * @param value Value or promise for value of returned promise
		 * @return Promise resolved to value after this promise fulfills
		 */
		return<R>(value: R | Thenable<R>): Promise<R>;
		/**
		 * Return a promise that resolves to `value` after this promise is
		 * fulfilled.
		 * Returned promise is rejected if this promise is rejected.
		 *
		 * Equivalent to `.then(() => value)`.
		 *
		 * @return Void promise resolved to value after this promise fulfills
		 */
		return(): Promise<void>;
		/**
		 * Return a promise that is rejected with `reason` after this promise is
		 * fulfilled.
		 * If this promise is rejected, returned promise will rejected with that
		 * error instead.
		 *
		 * Equivalent to `.then(() => { throw value; })`.
		 *
		 * @param reason Error reason to reject returned promise with
		 * @return Promise rejected with `reason` after this promise fulfills
		 */
		throw(reason: Error): Promise<T>;
		/**
		 * Create an immediately resolved promise (in case of a 'normal' value), or
		 * a promise that 'follows' another `Thenable` (e.g. a Promise from another
		 * library).
		 *
		 * @param value Value (or Thenable for value) for returned promise
		 * @return Promise resolved to `value`
		 */
		static resolve<R>(value: R | Thenable<R>): Promise<R>;
		/**
		 * Create an immediately resolved void-promise.
		 *
		 * @return Promise resolved to void (i.e. `undefined`)
		 */
		static resolve(): Promise<void>;
		/**
		 * Create an immediately rejected void-promise.
		 *
		 * Note: to create a rejected promise of another type, use e.g.
		 * `Promise.reject<number>(myError)`
		 *
		 * @param reason Error object to set rejection reason
		 * @return Void promise resolved to rejection `reason`
		 */
		static reject(reason: Error): Promise<void>;
		/**
		 * Create an immediately rejected promise.
		 *
		 * @param reason Error object to set rejection reason
		 * @return Promise resolved to rejection `reason`
		 */
		static reject<T>(reason: Error): Promise<T>;
		/**
		 * Return a promise for an array of all resolved input promises (or values).
		 * If any of the input promises is rejected, the returned promise is
		 * rejected with that reason.
		 * When passing an empty array, the promises is immediately resolved to an
		 * empty array.
		 *
		 * @param thenables Array of values or promises for them
		 * @return promise that resolves with array of all resolved values
		 */
		static all<X>(thenables: (X | Thenable<X>)[]): Promise<X[]>;
		/**
		 * Return a promise that resolves to the fulfillment or rejection of the
		 * first input promise that resolves.
		 * When passing an empty array, the promise will never resolve.
		 *
		 * @param thenables Array of values or promises for them
		 * @return promise that resolves to first resolved input promise
		 */
		static race<X>(thenables: (X | Thenable<X>)[]): Promise<X>;
		/**
		 * Create tuple of a promise and its resolve and reject functions.
		 *
		 * It is generally better (and slightly faster) to use the Promise
		 * constructor to create a promise, as that will also catch any exception
		 * thrown while running the resolver.
		 *
		 * A Deferred can be useful in some scenarios though, e.g. when working with
		 * timers, protocol request/response pairs, etc.
		 *
		 * @return Deferred object, containing unresolved promise and its
		 *		 resolve/reject functions
		 */
		static defer(): VoidDeferred;
		/**
		 * Create tuple of a promise and its resolve and reject functions.
		 *
		 * It is generally better (and slightly faster) to use the Promise
		 * constructor to create a promise, as that will also catch any exception
		 * thrown while running the resolver.
		 *
		 * A Deferred can be useful in some scenarios though, e.g. when working with
		 * timers, protocol request/response pairs, etc.
		 *
		 * @return Deferred object, containing unresolved promise and its
		 *		 resolve/reject functions
		 */
		static defer<X>(): Deferred<X>;
		/**
		 * Create a promise that resolves to a void value (`undefined`) after `ms`
		 * milliseconds.
		 *
		 * @param ms Number of milliseconds to wait before resolving
		 * @return Promise that fulfills with a void value after `ms` milliseconds
		 */
		static delay(ms: number): Promise<void>;
		/**
		 * Create a promise that resolves to the given value (or promise for a
		 * value) after `ms` milliseconds. The timer will start when the given value
		 * is resolved.
		 * If the input value is a rejected promise, the resulting promise is also
		 * rejected, without waiting for the timer.
		 *
		 * @param value Value or promise for value to be delayed
		 * @param ms Number of milliseconds to wait before resolving
		 * @return Promise that fulfills `ms` milliseconds after given (promise for)
		 *		 value is fulfilled
		 */
		static delay<R>(value: R | Thenable<R>, ms: number): Promise<R>;
		/**
		 * Enable or disable long stack trace tracking on promises.
		 *
		 * This allows tracing a promise chain through the various asynchronous
		 * actions in a program. For example, when a promise is rejected, the last
		 * few locations of any preceding promises are included in the error's stack
		 * trace.
		 *
		 * Note: it is possible to enable/disable long tracing at runtime.
		 *
		 * When chaining off of a promise that was created while tracing was enabled
		 * (e.g. through `.then()`), all children will also have long traces, even
		 * when tracing is turned off. This allows to trace just some promise paths.
		 *
		 * Tracing is disabled by default as it incurs a memory and performance
		 * overhead, although it's still faster with tracing than some major
		 * promise libraries without tracing, so don't worry too much about it.
		 *
		 * @param enable Set to true to enable long traces, false to disable
		 */
		static setLongTraces(enable: boolean): void;
		/**
		 * Set trace function that is called for internal state changes of a
		 * promise.
		 * Call with `undefined` or `null` to disable such tracing (this is the
		 * default).
		 *
		 * @param tracer Callback called for various stages during lifetime of a promise
		 */
		static setTracer(tracer: (promise: Promise<any>, msg: string) => void): void;
		/**
		 * Recursively flush the async callback queue until all `.then()` and
		 * `.done()` callbacks for fulfilled and rejected Promises have been called.
		 * Useful in e.g. unit tests to advance program state to the next 'tick'.
		 *
		 * Note that if e.g. `.done()` encounters a rejected promise, `flush()` will
		 * immediately throw an error (e.g. `UnhandledRejectionError`).
		 * It is safe to call `flush()` again afterwards, but it will also be called
		 * automatically by the async queue on the next 'real' tick.
		 *
		 * It is an error to call `flush()` while it is already running (e.g. from
		 * a `.then()` callback).
		 */
		static flush(): void;
		private _setSource(source);
		private _resolve(x);
		private _tryGetThen(x);
		private _fulfill(value);
		private _reject(reason);
		private _followPromise(slave);
		private _followThenable(slave, then);
		private _enqueue(onFulfilled, onRejected, slave, done);
		/**
		 * Schedule any pending .then()/.done() callbacks and follower-promises to
		 * be called/resolved.
		 * Clears our queue, any callbacks/followers attached after this will be
		 * scheduled without going through our handlers queue.
		 */
		private _flush();
		/**
		 * 'Unwrap' a promise handler, i.e. call a .then()/.done() callback, or
		 * resolve a promise that's following us.
		 * @param handler The handler being processed
		 */
		private _unwrap(handler);
		/**
		 * Helper for unwrapping promise handler.
		 * It's not a closure so it's cheap to schedule, and because it directly
		 * calls the _unwrap() method on a promise, it's (way) faster than having to
		 * use e.g. .call().
		 * @param handler The handler being processed
		 */
		private static _unwrapper(handler);
	}
	export default Promise;

}
declare module 'ts-promise/index' {
	export { default, Promise, Thenable, UnhandledRejectionError, Deferred, VoidDeferred } from 'ts-promise/Promise';
	export { default as BaseError } from 'ts-promise/BaseError';

}
declare module 'ts-promise' {
	export * from 'ts-promise/index';
	export { default as default } from 'ts-promise/index';
}
