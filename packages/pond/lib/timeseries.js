"use strict";
/*
 *  Copyright (c) 2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Immutable = require("immutable");
const _ = require("lodash");
const duration_1 = require("./duration");
const event_1 = require("./event");
const index_1 = require("./index");
const sortedcollection_1 = require("./sortedcollection");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
const window_1 = require("./window");
const functions_1 = require("./functions");
const types_1 = require("./types");
function buildMetaData(meta) {
    const d = meta ? meta : {};
    // Name
    d.name = meta.name ? meta.name : "";
    // Index
    if (meta.index) {
        if (_.isString(meta.index)) {
            d.index = new index_1.Index(meta.index).asString();
        }
        else if (meta.index instanceof index_1.Index) {
            d.index = meta.index.asString();
        }
    }
    // Timezone
    d.tz = "Etc/UTC";
    if (_.isString(meta.tz)) {
        d.tz = meta.tz;
    }
    return Immutable.Map(d);
}
/**
 * Create a `Time` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["time", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function timeSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat, meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new event_1.Event(time_1.time(key), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
exports.timeSeries = timeSeries;
/**
 * Create an `Index` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["index", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function indexedSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat, meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new event_1.Event(index_1.index(key), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
exports.indexedSeries = indexedSeries;
/**
 * Create a `Timerange` based `TimeSeries` using the wire format
 * ```
 * {
 *   "name": name,
 *   "columns": ["timerange", column-1, ..., column-n]
 *   "points": [
 *      [t1, v1, v2, ..., v2],
 *      [t2, v1, v2, ..., vn],
 *      ...
 *   ]
 * }
 * ```
 */
function timeRangeSeries(arg) {
    const wireFormat = arg;
    const { columns, points, tz = "Etc/UTC" } = wireFormat, meta2 = __rest(wireFormat, ["columns", "points", "tz"]);
    const [eventKey, ...eventFields] = columns;
    const events = points.map(point => {
        const [key, ...eventValues] = point;
        const d = _.zipObject(eventFields, eventValues);
        return new event_1.Event(timerange_1.timerange(key[0], key[1]), Immutable.fromJS(d));
    });
    return new TimeSeries(Object.assign({ events: Immutable.List(events) }, meta2));
}
exports.timeRangeSeries = timeRangeSeries;
/**
 * A `TimeSeries<K>` represents a series of `Event<K>`'s, contained within a `Collection<K>`,
 * along with associated meta data.
 *
 * Each `Event<K>`, a single entity in the Collection, is a combination of:
 * * `Key` of type K (`Time`, `TimeRange`, or `Index`)
 * * `data` of type Immutable.Map<string, any> - corresponding set of key/values
 *
 * To construct a `TimeSeries` you would typicaly use the wire format, which is a data
 * structure passed into one of the helper factory functions. See the constructor
 * docs below for details of this format. It's fairly simple.
 *
 * You can also construct a `TimeSeries` from a list of `Event`s.
 *
 * A `TimeSeries` supports some notion of what timezone it is in, and this can be
 * specified in the constructor. `Event`s in this `TimeSeries` are considered to
 * be in this timezone. Specifically, if they are `Event<Index>`'s an event might be
 * at "2014-08-31". The actual timerange of that representation depends on where
 * you are. Note: an `Index` of "1d-1234" is always a UTC representation.
 *
 * Methods exist to query back out of the `TimeSeries`:
 *
 *  * Specific `Event`s with `at()`, `atFirst()` and `atLast()`, or at a
 * particular time with `atTime()`.
 *  * Meta data can also be accessed using `name()`, `timezone()` and `isUTC()`,
 * along with `columns()` and the `eventList()` or `collection()` itself. More
 * general user defined meta data can be accessed with `meta()`.
 *  * The overall time range of the `TimeSeries` can be queried with `timerange()`,
 * of for convenience also see `begin()` and `end()`.
 *
 * Mutating a `TimeSeries` will always return a new `TimeSeries`:
 *  * Meta data can be modified with `setMeta()`, `setName()` and renameColumns().
 *  * The set of `Event`s can be altered with operations such as `slice()`, `crop()`.
 *  * Or alternatively you can `select()` specific columns.
 *  * You can take the `rate()` of data
 *
 * Basic statistics operations allow you to get percentiles, quantiles,
 * `avg()`, `min()`, `max()`, `sum()`, `count()` etc for any column within the
 * `TimeSeries`.
 *
 * Traversing over the `Event`s in the `TimeSeries` can be done most efficiently
 * with either `forEach()` or `map()`.
 *
 * Reducing data within a `TimeSeries` is a common task:
 *  * `collapse()` will take a list of columns an collapse those down to
 *    a single output column using a function (e.g. sum())
 *  * `fixedWindowRollup()` lets you aggregate into specific time windows
 *    to produce a new series.
 *  * `hourlyRollup()` and `dailyRollup()` similarly
 *  * You can also make a new mapping from a window to a `Collection` out
 *    of the `TimeSeries` with `collectionByWindow()`
 *  * see also static functions for reducing and merging
 *    multiple `TimeSeries` together
 *
 * Fixing or transforming non-ideal data is another important function:
 *  * `sizeValid()` will tell you how many `Event`s are valid
 *  * statistic functions all take a filter function that can filter the
 *    `Event`s being processed to handle missing or bad data
 *  * `fill()` will fix missing data by inserting a new value where undefined,
 *    null or NaN values are found, using interpolation or 0.
 *  * `align()` will change the time position of data to lie on specific time
 *    boundaries using different interpolation methods (e.g. align to each minute)
 *
 * Some static methods also exist:
 *  * `equal()` and `is()` are two was to compare if a `TimeSeries` is the same.
 *  * `timeSeriesListMerge()` can be used to concatenate two `TimeSeries` together
 *    or to merge multiple `TimeSeries` together that have different column names.
 *  * `timeSeriesListReduce()` can be used for operations like summing multiple
 *    `TimeSeries` together
 *
 */
class TimeSeries {
    /**
     * You can initialize a `TimeSeries` with either a list of `Event`'s, or with
     * what we call the wire format. Usually you would want to construct a `TimeSeries`
     * by converting your data into this format.
     *
     * The format of the data is an object which has several special keys,
     * i.e. fields that have special meaning for the `TimeSeries` and additional keys
     * that are optionally added to form the meta data for the `TimeSeries`:
     *
     * Special keys:
     *
     *  - **name** - The name of the series (optional)
     *  - **columns** - are necessary and give labels to the data in the points. The first
     *                  column is special, it is the the key for the row and should be
     *                  either "time", "timerange" or "index". Other columns are user
     *                  defined. (required)
     *  - **points** - are an array of tuples. Each row is at a different time (or timerange),
     *                 and each value corresponds to the column labels. (required)
     *  - **tz** - timezone (optional)
     *
     * You can add additional fields as meta data custom to your application.
     *
     * To create a new `TimeSeries` object from the above data format, simply use one of
     * the factory functions. For `Time` based `TimeSeries` you would use `timeSeries()`.
     * Other options are `timeRangeSeries()` and `indexedSeries()`:
     *
     * Example:
     *
     * ```
     * import { timeSeries } from "pondjs";
     *
     * const series = timeSeries({
     *     name: "traffic",
     *     columns: ["time", "in", "out"],
     *     points: [
     *         [1400425947000, 52, 12],
     *         [1400425948000, 18, 42],
     *         [1400425949000, 26, 81],
     *         [1400425950000, 93, 11],
     *         ...
     *     ]
     * });
     * ```
     *
     * Another example:
     *
     * ```
     * const availability = indexedSeries({
     *     name: "Last 3 months",
     *     columns: ["index", "uptime", incidents],
     *     points: [
     *         ["2015-06", "100%", 0], // 2015-06 specified here for June 2015
     *         ["2015-05", "92%", 2],
     *         ["2015-04", "87%", 5]
     *     ]
     * });
     * ```
     *
     * Alternatively, you can construct a `TimeSeries` with a list of events.
     * To do this you need to use the `TimeSeries` constructor directly.
     *
     * These may be `TimeEvents`, `TimeRangeEvents` or `IndexedEvents`:
     *
     * ```
     * import { TimeSeries } from "pondjs"
     * const events = [];
     * events.push(timeEvent(time(new Date(2015, 7, 1)), Immutable.Map({ value: 27 })));
     * events.push(timeEvent(time(new Date(2015, 8, 1)), Immutable.Map({ value: 14 })));
     * const series = new TimeSeries({
     *     name: "events",
     *     events: Immutable.List(events)
     * });
     * ```
     */
    constructor(arg) {
        this._collection = null;
        this._data = null;
        if (arg instanceof TimeSeries) {
            //
            // Copy another TimeSeries
            //
            const other = arg;
            this._data = other._data;
            this._collection = other._collection;
        }
        else if (_.isObject(arg)) {
            if (_.has(arg, "collection")) {
                //
                // Initialized from a Collection
                //
                const { collection } = arg, meta3 = __rest(arg, ["collection"]);
                this._collection = new sortedcollection_1.SortedCollection(collection);
                this._data = buildMetaData(meta3);
            }
            else if (_.has(arg, "events")) {
                //
                // Has a list of events
                //
                const { events } = arg, meta1 = __rest(arg, ["events"]);
                this._collection = new sortedcollection_1.SortedCollection(events);
                this._data = buildMetaData(meta1);
            }
        }
    }
    /**
     * Turn the `TimeSeries` into regular javascript objects
     */
    toJSON() {
        const e = this.atFirst();
        if (!e) {
            return;
        }
        const columns = [e.keyType(), ...this.columns()];
        const points = [];
        for (const evt of this._collection.eventList()) {
            points.push(evt.toPoint(this.columns()));
        }
        return _.extend(this._data.toJSON(), { columns, points });
    }
    /**
     * Represent the `TimeSeries` as a string, which is useful for
     * serializing it across the network.
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the extents of the `TimeSeries` as a `TimeRange`.
     */
    timerange() {
        return this._collection.timerange();
    }
    /**
     * Alias for `timerange()`
     */
    range() {
        return this.timerange();
    }
    /**
     * Gets the earliest time represented in the `TimeSeries`.
     */
    begin() {
        return this.range().begin();
    }
    /**
     * Gets the latest time represented in the `TimeSeries`.
     */
    end() {
        return this.range().end();
    }
    /**
     * Access a specific `TimeSeries` event via its position
     */
    at(pos) {
        return this._collection.at(pos);
    }
    /**
     * Returns an event in the series by its time. This is the same
     * as calling `bisect()` first and then using `at()` with the index.
     */
    atTime(t) {
        const pos = this.bisect(t);
        if (pos >= 0 && pos < this.size()) {
            return this.at(pos);
        }
    }
    /**
     * Returns the first `Event` in the series.
     */
    atFirst() {
        return this._collection.firstEvent();
    }
    /**
     * Returns the last `Event` in the series.
     */
    atLast() {
        return this._collection.lastEvent();
    }
    /**
     * Sets a new underlying collection for this `TimeSeries` and retuns a
     * new `TimeSeries`.
     */
    setCollection(collection) {
        const result = new TimeSeries(this);
        if (collection) {
            result._collection = collection;
        }
        else {
            result._collection = new sortedcollection_1.SortedCollection();
        }
        return result;
    }
    /**
     * Returns the index that bisects the `TimeSeries` at the time specified.
     */
    bisect(t, b) {
        return this._collection.bisect(t, b);
    }
    /**
     * Perform a slice of events within the `TimeSeries`, returns a new
     * `TimeSeries` representing a portion of this `TimeSeries` from
     * `begin` up to but not including `end`.
     */
    slice(begin, end) {
        const sliced = new sortedcollection_1.SortedCollection(this._collection.slice(begin, end));
        return this.setCollection(sliced);
    }
    /**
     * Crop the `TimeSeries` to the specified `TimeRange` and return a new `TimeSeries`.
     */
    crop(tr) {
        const timerangeBegin = tr.begin();
        let beginPos = this.bisect(timerangeBegin);
        const bisectedEventOutsideRange = this.at(beginPos).timestamp() < timerangeBegin;
        beginPos = bisectedEventOutsideRange ? beginPos + 1 : beginPos;
        const endPos = this.bisect(tr.end(), beginPos);
        return this.slice(beginPos, endPos + 1);
    }
    //
    // Access meta data about the series
    //
    /**
     * Fetch the `TimeSeries` name
     */
    name() {
        return this._data.get("name");
    }
    /**
     * Rename the `TimeSeries`
     */
    setName(name) {
        return this.setMeta("name", name);
    }
    /**
     * Fetch the timeSeries `Index`, if it has one. This is still in the
     * API for historical reasons but is just a short cut to calling
     * `series.getMeta("index")`.
     */
    index() {
        return index_1.index(this._data.get("index"));
    }
    /**
     * Fetch the timeSeries `Index`, as a `string`, if it has one.
     */
    indexAsString() {
        return this.index() ? this.index().asString() : undefined;
    }
    /**
     * Fetch the timeseries `Index`, as a `TimeRange`, if it has one.
     */
    indexAsRange() {
        return this.index() ? this.index().asTimerange() : undefined;
    }
    /**
     * Fetch if the timezone is UTC
     */
    isUTC() {
        return this._data.get("tz") === "Etc/UTC";
    }
    /**
     * Returns the timezone set on this `TimeSeries`.
     */
    timezone() {
        return this._data.get("tz");
    }
    /**
     * Fetch the list of column names as a list of string.
     * This is determined by traversing though the events and collecting the set.
     * Note: the order is not defined
     */
    columns() {
        const c = {};
        for (const e of this._collection.eventList()) {
            const d = e.getData();
            d.forEach((val, key) => {
                c[key] = true;
            });
        }
        return _.keys(c);
    }
    /**
     * Returns the list of Events in the `Collection` of events for this `TimeSeries`
     * The result is an Immutable.List of the `Event`s.
     */
    eventList() {
        return this.collection().eventList();
    }
    /**
     * Returns the internal `SortedCollection` of events for this `TimeSeries`
     */
    collection() {
        return this._collection;
    }
    /**
     * Returns the meta data about this `TimeSeries` as a JSON object.
     * Any extra data supplied to the `TimeSeries` constructor will be
     * placed in the meta data object. This returns either all of that
     * data as a JSON object, or a specific key if `key` is supplied.
     */
    meta(key) {
        if (!key) {
            return this._data.toJSON();
        }
        else {
            return this._data.get(key);
        }
    }
    /**
     * Set new meta data for the `TimeSeries` using a `key` and `value`.
     * The result will be a new `TimeSeries`.
     */
    setMeta(key, value) {
        const newTimeSeries = new TimeSeries(this);
        const d = newTimeSeries._data;
        const dd = d.set(key, value);
        newTimeSeries._data = dd;
        return newTimeSeries;
    }
    /**
     * Returns the number of events in this `TimeSeries`
     */
    size() {
        return this._collection ? this._collection.size() : 0;
    }
    /**
     * Returns the number of valid items in this `TimeSeries`.
     *
     * Uses the `fieldSpec` to look up values in all events.
     * It then counts the number that are considered valid, which
     * specifically are not NaN, undefined or null.
     */
    sizeValid(fieldSpec) {
        return this._collection.sizeValid(fieldSpec);
    }
    /**
     * Returns the number of events in this `TimeSeries`. Alias
     * for size().
     */
    count() {
        return this.size();
    }
    /**
     * Returns the sum of the `Event`'s in this `Collection`
     * for the `fieldspec`. Optionally pass in a filter function.
     */
    sum(fieldPath = "value", filter) {
        return this._collection.sum(fieldPath, filter);
    }
    /**
     * Aggregates the `Event`'s in this `TimeSeries` down to
     * their maximum value(s).
     *
     * The `fieldSpec` passed into the avg function is either a field name or
     * a list of fields.
     *
     * The `filter` is one of the Pond filter functions that can be used to remove
     * bad values in different ways before filtering.
     *
     * The result is the maximum value if the fieldSpec is for one field. If
     * multiple fields then a map of fieldName -> max values is returned
     */
    max(fieldPath = "value", filter) {
        return this._collection.max(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their minimum value
     */
    min(fieldPath = "value", filter) {
        return this._collection.min(fieldPath, filter);
    }
    /**
     * Aggregates the `Event`'s in this `TimeSeries` down
     * to their average(s).
     *
     * The `fieldSpec` passed into the avg function is either
     * a field name or a list of fields.
     *
     * The `filter` is one of the Pond filter functions that can be used to remove
     * bad values in different ways before filtering.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "temperature"],
     *     points: [
     *         [1509725624100, 5],
     *         [1509725624200, 8],
     *         [1509725624300, 2]
     *     ]
     * });
     * const avg = series.avg("temperature"); // 5
     * ```
     */
    avg(fieldPath = "value", filter) {
        return this._collection.avg(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their medium value
     */
    median(fieldPath = "value", filter) {
        return this._collection.median(fieldPath, filter);
    }
    /**
     * Aggregates the events down to their stdev
     */
    stdev(fieldPath = "value", filter) {
        return this._collection.stdev(fieldPath, filter);
    }
    /**
     * Gets percentile q within the `TimeSeries`. This works the same way as numpy.
     *
     * The percentile function has several parameters that can be supplied:
     * * `q` - The percentile (should be between 0 and 100)
     * * `fieldSpec` - Field or fields to find the percentile of
     * * `interp` - Specifies the interpolation method to use when the desired, see below
     * * `filter` - Optional filter function used to clean data before aggregating
     *
     * For `interp` a `InterpolationType` should be supplied if the default ("linear") is
     * not used. This enum is defined like so:
     * ```
     * enum InterpolationType {
     *     linear = 1,  // i + (j - i) * fraction
     *     lower,       // i
     *     higher,      // j
     *     nearest,     // i or j, whichever is nearest
     *     midpoint     // (i + j) / 2
     * }
     * ```
     */
    percentile(q, fieldPath = "value", interp = functions_1.InterpolationType.linear, filter) {
        return this._collection.percentile(q, fieldPath, interp, filter);
    }
    /**
     * Aggregates the `TimeSeries` `Event`s down to a single value per field.
     *
     * This makes use of a user defined function suppled as the `func` to do
     * the reduction of values to a single value. The `ReducerFunction` is defined
     * like so:
     *
     * ```
     * (values: number[]) => number
     * ```
     *
     * Fields to be aggregated are specified using a `fieldSpec` argument, which
     * can be a field name or array of field names.
     *
     * If the `fieldSpec` matches multiple fields then an object is returned
     * with keys being the fields and the values being the aggregated value for
     * those fields. If the `fieldSpec` is for a single field then just the
     * aggregated value is returned.
     *
     * Note: The `TimeSeries` class itself contains most of the common aggregation functions
     * built in (e.g. `series.avg("value")`), but this is here to help when what
     * you need isn't supplied out of the box.
     */
    aggregate(func, fieldPath = "value") {
        return this._collection.aggregate(func, fieldPath);
    }
    /**
     * Gets n quantiles within the `TimeSeries`. This works the same way as numpy's percentile().
     * For example `timeseries.quantile(4)` would be the same as using percentile
     * with q = 0.25, 0.5 and 0.75.
     */
    quantile(quantity, fieldPath = "value", interp = functions_1.InterpolationType.linear) {
        return this._collection.quantile(quantity, fieldPath, interp);
    }
    /**
     * Iterate over the events in this `TimeSeries`.
     *
     * `Event`s are in the chronological. The `sideEffect` is a user supplied
     * function which is passed the `Event<T>` and the index:
     * ```
     * (e: Event<T>, index: number) => { //... }
     * ```
     *
     * Returns the number of items iterated.
     *
     * Example:
     * ```
     * series.forEach((e, i) => {
     *     console.log(`Event[${i}] is ${e.toString()}`);
     * })
     * ```
     */
    forEach(sideEffect) {
        return this._collection.forEach(sideEffect);
    }
    /**
     * Map the `Event`s in this `TimeSeries` to new `Event`s.
     *
     * For each `Event` passed to your `mapper` function you return a new Event:
     * ```
     * (event: Event<T>, index: number) => Event<M>
     * ```
     *
     * Example:
     * ```
     * const mapped = sorted.map(e => {
     *     return new Event(e.key(), { a: e.get("x") * 2 });
     * });
     * ```
     */
    map(mapper) {
        const remapped = this._collection.map(mapper);
        return this.setCollection(remapped);
    }
    /**
     * Flat map over the events in this `TimeSeries`.
     *
     * For each `Event` passed to your callback function you should map that to
     * zero, one or many `Event`s, returned as an `Immutable.List<Event>`.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "Map Traffic",
     *     columns: ["time", "NASA_north", "NASA_south"],
     *     points: [
     *         [1400425951000, { in: 100, out: 200 }, { in: 145, out: 135 }],
     *         [1400425952000, { in: 200, out: 400 }, { in: 146, out: 142 }],
     *         [1400425953000, { in: 300, out: 600 }, { in: 147, out: 158 }],
     *         [1400425954000, { in: 400, out: 800 }, { in: 155, out: 175, other: 42 }]
     *     ]
     * });
     * const split = series.flatMap(e =>
     *     Immutable.List([
     *         e.setData(e.get("NASA_north")),
     *         e.setData(e.get("NASA_south"))
     *     ])
     * );
     * split.toString();
     *
     * // {
     * //     "name": "Map Traffic",
     * //     "tz": "Etc/UTC",
     * //     "columns": ["time","in","out","other"],
     * //     "points":[
     * //         [1400425951000, 100, 200, null],
     * //         [1400425951000, 145, 135, null],
     * //         [1400425952000, 200, 400, null],
     * //         [1400425952000, 146, 142, null],
     * //         [1400425953000, 300, 600, null],
     * //         [1400425953000, 147, 158, null],
     * //         [1400425954000, 400, 800, null],
     * //         [1400425954000, 155, 175, 42]
     * //     ]
     * // }
     * ```
     */
    flatMap(mapper) {
        const remapped = this._collection.flatMap(mapper);
        return this.setCollection(remapped);
    }
    /**
     * Filter the `TimeSeries`'s `Event`'s with the supplied function.
     *
     * The function `predicate` is passed each `Event` and should return
     * true to keep the `Event` or false to discard.
     *
     * Example:
     * ```
     * const filtered = series.filter(e => e.get("a") < 8)
     * ```
     */
    filter(predicate) {
        const filtered = this._collection.filter(predicate);
        return this.setCollection(filtered);
    }
    /**
     * Select out specified columns from the `Event`s within this `TimeSeries`.
     *
     * The `select()` method needs to be supplied with a `SelectOptions`
     * object, which takes the following form:
     *
     * ```
     * {
     *     fields: string[];
     * }
     * ```
     * Options:
     *  * `fields` - array of columns to keep within each `Event`.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "a", "b", "c"],
     *     points: [
     *         [1509725624100, 5, 3, 4],
     *         [1509725624200, 8, 1, 3],
     *         [1509725624300, 2, 9, 1]
     *     ]
     * });
     * const newSeries = series.select({
     *     fields: ["b", "c"]
     * });
     *
     * // returns a series with columns ["b", "c"] only, "a" is discarded.
     * ```
     */
    select(options) {
        const collection = new sortedcollection_1.SortedCollection(this._collection.select(options));
        return this.setCollection(collection);
    }
    /**
     * Collapse multiple columns of a `Collection` into a new column.
     *
     * The `collapse()` method needs to be supplied with a `CollapseOptions`
     * object. You use this to specify the columns to collapse, the column name
     * of the column to collapse to and the reducer function. In addition you
     * can choose to append this new column or use it in place of the columns
     * collapsed.
     *
     * ```
     * {
     *    fieldSpecList: string[];
     *    fieldName: string;
     *    reducer: any;
     *    append: boolean;
     * }
     * ```
     * Options:
     *  * `fieldSpecList` - the list of fields to collapse
     *  * `fieldName` - the new field's name
     *  * `reducer()` - a function to collapse using e.g. `avg()`
     *  * `append` - to include only the new field, or include it in addition
     *     to the previous fields.
     *
     * Example:
     * ```
     * const series = timeSeries({
     *     name: "data",
     *     columns: ["time", "a", "b"],
     *     points: [
     *         [1509725624100, 5, 6],
     *         [1509725624200, 4, 2],
     *         [1509725624300, 6, 3]
     *     ]
     * });
     *
     * // Sum columns "a" and "b" into a new column "v"
     * const sums = series.collapse({
     *     fieldSpecList: ["a", "b"],
     *     fieldName: "v",
     *     reducer: sum(),
     *     append: false
     * });
     *
     * sums.at(0).get("v")  // 11
     * sums.at(1).get("v")  // 6
     * sums.at(2).get("v")  // 9
     * ```
     */
    collapse(options) {
        const collection = new sortedcollection_1.SortedCollection(this._collection.collapse(options));
        return this.setCollection(collection);
    }
    /**
     * Rename columns in the underlying events.
     *
     * Takes a object of columns to rename. Returns a new `TimeSeries` containing
     * new events. Columns not in the dict will be retained and not renamed.
     *
     * Example:
     * ```
     * new_ts = ts.renameColumns({
     *     renameMap: {in: "new_in", out: "new_out"}
     * });
     * ```
     *
     * As the name implies, this will only rename the main
     * "top level" (ie: non-deep) columns. If you need more
     * extravagant renaming, roll your own using `TimeSeries.map()`.
     */
    renameColumns(options) {
        const { renameMap } = options;
        return this.map(e => {
            const eventType = e.keyType();
            const d = e.getData().mapKeys(key => renameMap[key] || key);
            switch (eventType) {
                case "time":
                    return new event_1.Event(time_1.time(e.toPoint(this.columns())[0]), d);
                case "index":
                    return new event_1.Event(index_1.index(e.toPoint(this.columns())[0]), d);
                case "timerange":
                    const timeArray = e.toPoint(this.columns())[0];
                    return new event_1.Event(timerange_1.timerange(timeArray[0], timeArray[1]), d);
            }
        });
    }
    /**
     * Take the data in this `TimeSeries` and "fill" any missing or invalid
     * values. This could be setting `null` values to zero so mathematical
     * operations will succeed, interpolate a new value, or pad with the
     * previously given value.
     *
     * The fill is controlled by the `FillOptions`. This is an object of the form:
     * ```
     * {
     *     fieldSpec: string | string[];
     *     method?: FillMethod;
     *     limit?: number;
     * }
     * ```
     * Options:
     *  * `fieldSpec` - the field to fill
     *  * `method` - the interpolation method, one of `FillMethod.Hold`, `FillMethod.Pad`
     *               or `FillMethod.Linear`
     *  * `limit` - the number of missing values to fill before giving up
     *
     * Example:
     * ```
     * const filled = timeseries.fill({
     *     fieldSpec: ["direction.in", "direction.out"],
     *     method: "zero",
     *     limit: 3
     * });
     * ```
     */
    fill(options) {
        const { fieldSpec = null, method = types_1.FillMethod.Zero, limit = null } = options;
        let filledCollection;
        if (method === types_1.FillMethod.Zero || method === types_1.FillMethod.Pad) {
            filledCollection = this._collection.fill({ fieldSpec, method, limit });
        }
        else if (method === types_1.FillMethod.Linear) {
            if (_.isArray(fieldSpec)) {
                filledCollection = this._collection;
                fieldSpec.forEach(fieldPath => {
                    const args = { fieldSpec: fieldPath, method, limit };
                    filledCollection = filledCollection.fill(args);
                });
            }
            else {
                filledCollection = this._collection.fill({
                    fieldSpec,
                    method,
                    limit
                });
            }
        }
        else {
            throw new Error(`Invalid fill method: ${method}`);
        }
        const collection = new sortedcollection_1.SortedCollection(filledCollection);
        return this.setCollection(collection);
    }
    /**
     * Align event values to regular time boundaries. The value at
     * the boundary is interpolated. Only the new interpolated
     * points are returned. If limit is reached nulls will be
     * returned at each boundary position.
     *
     * One use case for this is to modify irregular data (i.e. data
     * that falls at slightly irregular times) so that it falls into a
     * sequence of evenly spaced values. We use this to take data we
     * get from the network which is approximately every 30 second
     * (:32, 1:02, 1:34, ...) and output data on exact 30 second
     * boundaries (:30, 1:00, 1:30, ...).
     *
     * Another use case is data that might be already aligned to
     * some regular interval, but that contains missing points.
     * While `fill()` can be used to replace `null` values, `align()`
     * can be used to add in missing points completely. Those points
     * can have an interpolated value, or by setting limit to 0,
     * can be filled with nulls. This is really useful when downstream
     * processing depends on complete sequences.
     *
     * Example:
     * ```
     * const aligned = ts.align({
     *     fieldSpec: "value",
     *     period: "1m",
     *     method: "linear"
     * });
     * ```
     */
    align(options) {
        const collection = new sortedcollection_1.SortedCollection(this._collection.align(options));
        return this.setCollection(collection);
    }
    /**
     * Returns the derivative of the `TimeSeries` for the given columns. The result will
     * be per second. Optionally you can substitute in `null` values if the rate
     * is negative. This is useful when a negative rate would be considered invalid.
     */
    rate(options) {
        const collection = new sortedcollection_1.SortedCollection(this._collection.rate(options));
        return this.setCollection(collection);
    }
    /**
     * Builds a new `TimeSeries` by dividing events within the `TimeSeries`
     * across multiple fixed windows of size `windowSize`.
     *
     * Note that these are windows defined relative to Jan 1st, 1970,
     * and are UTC, so this is best suited to smaller window sizes
     * (hourly, 5m, 30s, 1s etc), or in situations where you don't care
     * about the specific window, just that the data is smaller.
     *
     * Each window then has an aggregation specification applied as
     * `aggregation`. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * { in_avg: { in: avg() }, out_avg: { out: avg() } }
     * ```
     * will aggregate both "in" and "out" using the average aggregation
     * function and return the result as in_avg and out_avg.
     *
     * Note that each aggregation function, such as `avg()` also can take a
     * filter function to apply before the aggregation. A set of filter functions
     * exists to do common data cleanup such as removing bad values. For example:
     * ```
     * { value_avg: { value: avg(filter.ignoreMissing) } }
     * ```
     *
     * Example:
     * ```
     *     const timeseries = new TimeSeries(data);
     *     const dailyAvg = timeseries.fixedWindowRollup({
     *         windowSize: "1d",
     *         aggregation: {value: {value: avg()}}
     *     });
     * ```
     *
     * Note that to output the result as `TimeEvent`'s instead of `IndexedEvent`'s,
     * you can do the following :
     * ```
     * timeseries.fixedWindowRollup(options).mapKeys(index => time(index.asTimerange().mid()))
     * ```
     *
     */
    fixedWindowRollup(options) {
        if (!options.window) {
            throw new Error("window must be supplied");
        }
        if (!options.aggregation || !_.isObject(options.aggregation)) {
            throw new Error("aggregation object must be supplied, for example: {value: {value: avg()}}");
        }
        const aggregatorPipeline = this._collection
            .window({ window: options.window, trigger: types_1.Trigger.onDiscardedWindow })
            .aggregate(options.aggregation)
            .flatten();
        const collections = new sortedcollection_1.SortedCollection(aggregatorPipeline);
        return this.setCollection(collections);
    }
    /**
     * Builds a new `TimeSeries` by dividing events into hours.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: {in: avg()}, out_avg: {out: avg()}}
     * ```
     *
     */
    hourlyRollup(options) {
        const { aggregation } = options;
        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error("aggregation object must be supplied, for example: {value: {value: avg()}}");
        }
        return this.fixedWindowRollup({
            window: window_1.window(duration_1.duration("1h")),
            aggregation
        });
    }
    /**
     * Builds a new `TimeSeries` by dividing events into days.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: {in: avg()}, out_avg: {out: avg()}}
     * ```
     *
     */
    dailyRollup(options) {
        const { aggregation, timezone = "Etc/UTC" } = options;
        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error("aggregation object must be supplied, for example: {avg_value: {value: avg()}}");
        }
        return this._rollup({ window: window_1.daily(timezone), aggregation });
    }
    /**
     * Builds a new `TimeSeries` by dividing events into months.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     * ```
     * {in_avg: {in: avg()}, out_avg: {out: avg()}}
     * ```
     *
     */
    /*
    monthlyRollup(options: RollupOptions<T>): TimeSeries<Index> {
        const { aggregation } = options;

        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }

        return this._rollup({ windowSize: period("monthly"), aggregation });
    }
    */
    /**
     * Builds a new `TimeSeries` by dividing events into years.
     *
     * Each window then has an aggregation specification `aggregation`
     * applied. This specification describes a mapping of output
     * fieldNames to aggregation functions and their fieldPath. For example:
     *
     * ```
     * {in_avg: {in: avg()}, out_avg: {out: avg()}}
     * ```
     *
     */
    /*
    yearlyRollup(options: RollupOptions<T>): TimeSeries<Index> {
        const { aggregation } = options;

        if (!aggregation || !_.isObject(aggregation)) {
            throw new Error(
                "aggregation object must be supplied, for example: {value: {value: avg()}}"
            );
        }

        return this._rollup({ windowSize: period("yearly"), aggregation });
    }
    */
    /**
     * @private
     *
     * Internal function to build the `TimeSeries` rollup functions using
     * an aggregator Pipeline.
     */
    _rollup(options) {
        const aggregatorPipeline = this._collection
            .window({ window: options.window, trigger: types_1.Trigger.onDiscardedWindow })
            .aggregate(options.aggregation)
            .flatten();
        const collections = new sortedcollection_1.SortedCollection(aggregatorPipeline);
        return this.setCollection(collections);
    }
    /**
     * Builds multiple `Collection`s, each collects together
     * events within a window of size `windowSize`. Note that these
     * are windows defined relative to Jan 1st, 1970, and are UTC.
     *
     * Example:
     * ```
     * const timeseries = new TimeSeries(data);
     * const collections = timeseries.collectByFixedWindow({windowSize: "1d"});
     * console.log(collections); // {1d-16314: Collection, 1d-16315: Collection, ...}
     * ```
     *
     */
    collectByWindow(options) {
        return this._collection.window({ window: options.window }).ungroup();
    }
    /*
     * STATIC
     */
    /**
     * Static function to compare two `TimeSeries` to each other. If the `TimeSeries`
     * are of the same instance as each other then equals will return true.
     */
    // tslint:disable:member-ordering
    static equal(series1, series2) {
        return series1._data === series2._data && series1._collection === series2._collection;
    }
    /**
     * Static function to compare two `TimeSeries` to each other. If the `TimeSeries`
     * are of the same value as each other then equals will return true.
     */
    static is(series1, series2) {
        return (Immutable.is(series1._data, series2._data) &&
            sortedcollection_1.SortedCollection.is(series1._collection, series2._collection));
    }
    /**
     * Reduces a list of `TimeSeries` objects using a reducer function. This works
     * by taking each event in each `TimeSeries` and collecting them together
     * based on timestamp. All events for a given time are then merged together
     * using the reducer function to produce a new event. The reducer function is
     * applied to all columns in the `fieldSpec`. Those new events are then
     * collected together to form a new `TimeSeries`.
     *
     * Example:
     *
     * For example you might have two TimeSeries with columns "in" and "out" which
     * corresponds to two measurements per timestamp. You could use this function to
     * obtain a new TimeSeries which was the sum of the the three measurements using
     * the `sum()` reducer function and an ["in", "out"] fieldSpec.
     *
     * ```
     * const totalSeries = TimeSeries.timeSeriesListReduce({
     *     name: "totals",
     *     seriesList: [inTraffic, outTraffic],
     *     reducer: sum(),
     *     fieldSpec: [ "in", "out" ]
     * });
     * ```
     */
    static timeSeriesListReduce(options) {
        const { seriesList, fieldSpec, reducer } = options, data = __rest(options, ["seriesList", "fieldSpec", "reducer"]);
        const combiner = event_1.Event.combiner(fieldSpec, reducer);
        return TimeSeries.timeSeriesListEventReduce(Object.assign({ seriesList,
            fieldSpec, reducer: combiner }, data));
    }
    /**
     * Takes a list of `TimeSeries` and merges them together to form a new
     * `TimeSeries`.
     *
     * Merging will produce a new `Event` only when events are conflict free, so
     * it is useful in the following cases:
     *  * to combine multiple `TimeSeries` which have different time ranges, essentially
     *  concatenating them together
     *  * combine `TimeSeries` which have different columns, for example inTraffic has
     *  a column "in" and outTraffic has a column "out" and you want to produce a merged
     *  trafficSeries with columns "in" and "out".
     *
     * Example:
     * ```
     * const inTraffic = new TimeSeries(trafficDataIn);
     * const outTraffic = new TimeSeries(trafficDataOut);
     * const trafficSeries = TimeSeries.timeSeriesListMerge({
     *     name: "traffic",
     *     seriesList: [inTraffic, outTraffic]
     * });
     * ```
     */
    static timeSeriesListMerge(options) {
        const { seriesList, fieldSpec, reducer, deep = false } = options, data = __rest(options, ["seriesList", "fieldSpec", "reducer", "deep"]);
        const merger = event_1.Event.merger(deep);
        return TimeSeries.timeSeriesListEventReduce(Object.assign({ seriesList,
            fieldSpec, reducer: merger }, data));
    }
    /**
     * @private
     */
    static timeSeriesListEventReduce(options) {
        const { seriesList, fieldSpec, reducer } = options, data = __rest(options, ["seriesList", "fieldSpec", "reducer"]);
        if (!seriesList || !_.isArray(seriesList)) {
            throw new Error("A list of TimeSeries must be supplied to reduce");
        }
        if (!reducer || !_.isFunction(reducer)) {
            throw new Error("reducer function must be supplied, for example avg()");
        }
        // for each series, make a map from timestamp to the
        // list of events with that timestamp
        const eventList = [];
        seriesList.forEach(series => {
            for (const e of series._collection.eventList()) {
                eventList.push(e);
            }
        });
        const events = reducer(Immutable.List(eventList));
        // Make a collection. If the events are out of order, sort them.
        // It's always possible that events are out of order here, depending
        // on the start times of the series, along with it the series
        // have missing data, so I think we don't have a choice here.
        const collection = new sortedcollection_1.SortedCollection(events);
        const timeseries = new TimeSeries(Object.assign({}, data, { collection }));
        return timeseries;
    }
}
exports.TimeSeries = TimeSeries;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXNlcmllcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lc2VyaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7Ozs7Ozs7Ozs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBSTVCLHlDQUFzQztBQUN0QyxtQ0FBZ0Y7QUFDaEYsbUNBQXVDO0FBSXZDLHlEQUFzRDtBQUN0RCxpQ0FBb0M7QUFDcEMsMkNBQW1EO0FBQ25ELHFDQUF5QztBQUV6QywyQ0FXcUI7QUFFckIsbUNBZWlCO0FBRWpCLHVCQUF1QixJQUFJO0lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFM0IsT0FBTztJQUNQLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRXBDLFFBQVE7SUFDUixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNiLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksYUFBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMvQyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksYUFBSyxDQUFDLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEMsQ0FBQztJQUNMLENBQUM7SUFFRCxXQUFXO0lBQ1gsQ0FBQyxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUM7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