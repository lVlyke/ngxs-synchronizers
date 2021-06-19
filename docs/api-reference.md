# ngxs-synchronizers API Reference

## `NgxsSyncModule`

The Angular module for this library.

```ts
class NgxsSyncModule {}
```

## `@SyncState`

The class decorator used to create state definitions. Wraps the `@State` decorator [from NGXS](https://www.ngxs.io/concepts/state).

See the [NGXS documentation](https://www.ngxs.io/concepts/state) for more information about `@State`.

```ts
function SyncState<T>(options: SyncStoreOptions<T>): ClassDecorator
```

`options` - The [`SyncStoreOptions`](#syncstoreoptions) used to define this state.

## `SyncStoreOptions`

Interface for defining a state via `@SyncState`.

```ts
interface SyncStoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
    synchronizers?: SynchronizerDictionary<T>;
}
```

`name` - See [NGXS docs](https://www.ngxs.io/concepts/state).

`defaults` - See [NGXS docs](https://www.ngxs.io/concepts/state).

`children` - See [NGXS docs](https://www.ngxs.io/concepts/state).

`synchronizers` - The synchronizers for this state, declared as a [`SynchronizerDictionary`](#synchronizerdictionary).

## `SynchronizerDictionary`

A dictionary of synchronizers for a given state, which is either a record of property synchronizers or a single collection synchronizer.

```ts
type SynchronizerDictionary<T> = {
    [P in keyof T]?: Type<PropertySynchronizer<T, P>>;
} | Type<CollectionSynchronizer<T>>;

namespace SynchronizerDictionary {

    function keys<T>(dict: SynchronizerDictionary<T>): Array<keyof T>;

    function isCollectionSynchronizer<T>(
        dict: SynchronizerDictionary<T>
    ): dict is Type<CollectionSynchronizer<T>>;

    function resolveSynchronizer<T>(
        dict: SynchronizerDictionary<T>,
        propKey: keyof T
    ): Type<Synchronizer<T, keyof T, unknown, unknown>>;

    function resolveSynchronizerInstance<T>(
        injector: Injector,
        dict: SynchronizerDictionary<T>,
        propKey: keyof T
    ): Synchronizer<T, keyof T, unknown, unknown>;
}
```

### Namespace functions

#### `SynchronizerDictionary.keys`

```ts
function keys<T>(dict: SynchronizerDictionary<T>): Array<keyof T>
```

Returns the list of keys in the dictionary.

`dict` - The synchronizer dictionary.

#### `SynchronizerDictionary.isCollectionSynchronizer`

```ts
function isCollectionSynchronizer<T>(
    dict: SynchronizerDictionary<T>
): dict is Type<CollectionSynchronizer<T>>
```

Returns whether or not the given dictionary is a [`CollectionSynchronizer`](#collectionsynchronizer).

`dict` - The synchronizer dictionary.

#### `SynchronizerDictionary.resolveSynchronizer`

```ts
function resolveSynchronizer<T>(
    dict: SynchronizerDictionary<T>,
    propKey: keyof T
): Type<Synchronizer<T, keyof T, unknown, unknown>>
```

Resolves the synchronizer associated with the property `propKey` from the dictionary (or the [`CollectionSynchronizer`](#collectionsynchronizer)).

`dict` - The synchronizer dictionary.

`propKey` - The property to resolve the synchronizer of.

#### `SynchronizerDictionary.resolveSynchronizerInstance`

```ts
function resolveSynchronizerInstance<T>(
    injector: Injector,
    dict: SynchronizerDictionary<T>,
    propKey: keyof T
): Synchronizer<T, keyof T, unknown, unknown>
```

Resolves a synchronizer instance associated with the property `propKey` from the dictionary (or the [`CollectionSynchronizer`](#collectionsynchronizer)).

`injector` - The Angular injector.

`dict` - The synchronizer dictionary.

`propKey` - The property to resolve the synchronizer instance of.

## `SyncStore`

A global state manager for interacting with synchronizers. Extends the `Store` class [from NGXS](https://www.ngxs.io/concepts/store).

See the [NGXS documentation](https://www.ngxs.io/concepts/store) for more information about `Store`.

```ts
class SyncStore extends Store {

    public state<T>(syncState: SyncClass<T>): StateSelector<T>;
}
```

### Methods

#### `SyncStore.state`

```ts
function state<T>(syncState: SyncClass<T>): StateSelector<T>
```

Method used for obtaining a [`StateSelector`](#stateselector) instance for a given [`SyncClass`](#syncclass). `StateSelector` instances are cached so that the same instance will be used for each `SyncClass` type. If the given `syncState` is not a known state, the method will return `null`.

```syncState``` - The state class to obtain a [`StateSelector`](#stateselector) for.

## `SyncClass`

```ts
import { Type } from '@angular/core';

type SyncClass<T> = Type<T>;
```

## `StateSelector`

Used to manage synchronizers and synchronization state. `StateSelector` objects are unique to a specific state class.

```ts
class StateSelector<T> {

    public dispatch<PropT extends keyof T>(propertyName: PropT, value: T[PropT]): Observable<T>;

    public property<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]>;
    public properties(): Observable<T>;
    public definedProperty<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]>;

    public isSyncingProperty(propertyName: keyof T): Observable<boolean>;
    public onPropertySyncing<PropT extends keyof T>(propertyName: PropT): Observable<PropT>;
    public onPropertySynced<PropT extends keyof T>(propertyName: PropT): Observable<PropT>;
    public onEveryPropertySyncing(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>;
    public onEveryPropertySynced(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>;
    public onSomePropertySyncing(...propertyNames: Array<keyof T>): Observable<keyof T>;
    public onSomePropertySynced(...propertyNames: Array<keyof T>): Observable<keyof T>;

    public require<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T>;

    public requireProperty<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T[PropT]>;

    public sync<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T>;

    public syncProperty<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T[PropT]>;

    public export<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.WriteOptions<RequestParamsT>
    ): Observable<any>;
}
```

### Methods

#### `StateSelector.dispatch`

```ts
function dispatch<PropT extends keyof T>(propertyName: PropT, value: T[PropT]): Observable<T>
```

Dispatches an action that updates the property `propertyName` to the given `value`. Returns an observable that emits after all actions have completed.

`propertyName` - The name of the property to update.

`value` - The value to set the property to.

#### `StateSelector.property`

```ts
function property<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]>
```

Returns an observable that emits the value of the property `propertyName`. This observable will emit every time the property's value changes.

`propertyName` - The name of the property to observe.

#### `StateSelector.properties`

```ts
function properties(): Observable<T>
```

Returns an observable that emits the current state value. This observable will emit every time the state is updated.

#### `StateSelector.definedProperty`

```ts
function definedProperty<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]>
```

Returns an observable that emits the value of the property `propertyName` only if the value is not `null` or `undefined`. This observable will emit every time the property's value changes and is not `null` or `undefined`.

`propertyName` - The name of the property to observe.

#### `StateSelector.isSyncingProperty`

```ts
function isSyncingProperty(propertyName: keyof T): Observable<boolean>
```

Returns an observable that emits whether or not the property `propertyName` is being synchronized. This observable will emit every time the property's synchronization state changes.

`propertyName` - The name of the property to observe the synchronization state of.

#### `StateSelector.onPropertySyncing`

```ts
function onPropertySyncing<PropT extends keyof T>(propertyName: PropT): Observable<PropT>
```

Returns an observable that emits whenever the property `propertyName` is starting to be synchronized. This observable will emit every time the property is starting to be synchronized. The returned observable will emit `propertyName`.

`propertyName` - The name of the property to observe the synchronization state of.

#### `StateSelector.onPropertySynced`

```ts
function onPropertySynced<PropT extends keyof T>(propertyName: PropT): Observable<PropT>
```

Returns an observable that emits whenever the property `propertyName` is completed being synchronized. This observable will emit every time the property is completed being synchronized. The returned observable will emit `propertyName`.

`propertyName` - The name of the property to observe the synchronization state of.

#### `StateSelector.onEveryPropertySyncing`

```ts
function onEveryPropertySyncing(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>
```

Returns an observable that emits whenever all of the given properties in `propertyNames` are starting to be synchronized. This observable will emit every time all of the given properties are starting to be synchronized. The returned observable will emit an array of property names that are being synchronized.

`propertyNames` - The names of the properties to observe the synchronization states of.

#### `StateSelector.onEveryPropertySynced`

```ts
function onEveryPropertySynced(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>
```

Returns an observable that emits whenever all of the given properties in `propertyNames` are completed being synchronized. This observable will emit every time all of the given properties are completed being synchronized. The returned observable will emit an array of property names that are completed being synchronized.

`propertyNames` - The names of the properties to observe the synchronization states of.

#### `StateSelector.onSomePropertySyncing`

```ts
function onSomePropertySyncing(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>
```

Returns an observable that emits whenever any of the given properties in `propertyNames` is starting to be synchronized. This observable will emit every time any of the given properties is starting to be synchronized. The returned observable will emit an array of property names that are being synchronized.

`propertyNames` - The names of the properties to observe the synchronization states of.

#### `StateSelector.onSomePropertySynced`

```ts
function onSomePropertySynced(...propertyNames: Array<keyof T>): Observable<Array<keyof T>>
```

Returns an observable that emits whenever any of the given properties in `propertyNames` is completed being synchronized. This observable will emit every time any of the given properties is completed being synchronized. The returned observable will emit an array of property names that are completed being synchronized.

`propertyNames` - The names of the properties to observe the synchronization states of.

#### `StateSelector.require`

```ts
function require<RequestParamsT = never>(
    propertyNames: keyof T | Array<keyof T>,
    options?: Synchronizer.ReadOptions<RequestParamsT>
): Observable<T>
```

Conditionally invokes the read operation for the synchronizers of the given properties in `propertyNames` only if the property value is not yet defined. Returns an observable that emits the value of the state after the invoked synchronizer operations are completed, or the current property value if it was defined.

`propertyNames` - The names of the properties (or single property) to conditionally invoke the read operation of their synchronizer(s) on.

`options` - (Optional) The [`Synchronizer.ReadOptions`](#synchronizer.readoptions) to pass to each synchronizer's read operation when invoked.

See [`Synchronizer.read`](#synchronizer.read) for more information.

#### `StateSelector.requireProperty`

```ts
function requireProperty<PropT extends keyof T, RequestParamsT = never>(
    propertyName: PropT,
    options?: Synchronizer.ReadOptions<RequestParamsT>
): Observable<T[PropT]>
```

Conditionally invokes the read operation for the synchronizer of the given property `propertyName` only if the property value is not yet defined. Returns an observable that emits the value of the property after the invoked synchronizer operation is completed, or the current property value if it was defined.

`propertyName` - The name of the property to conditionally invoke the read operation of its synchronizer on.

`options` - (Optional) The [`Synchronizer.ReadOptions`](#synchronizer.readoptions) to pass to the synchronizer's read operation when invoked.

See [`Synchronizer.read`](#synchronizer.read) for more information.

#### `StateSelector.sync`

```ts
function sync<RequestParamsT = never>(
    propertyNames: keyof T | Array<keyof T>,
    options?: Synchronizer.ReadOptions<RequestParamsT>
): Observable<T>
```

Invokes the read operation for the synchronizers of the given properties in `propertyNames`. Returns an observable that emits the value of the state after the invoked synchronizer operations are completed.

`propertyNames` - The names of the properties (or single property) to invoke the read operation of their synchronizer(s) on.

`options` - (Optional) The [`Synchronizer.ReadOptions`](#synchronizer.readoptions) to pass to each synchronizer's read operation when invoked.

See [`Synchronizer.read`](#synchronizer.read) for more information.

#### `StateSelector.syncProperty`

```ts
function syncProperty<PropT extends keyof T, RequestParamsT = never>(
    propertyName: PropT,
    options?: Synchronizer.ReadOptions<RequestParamsT>
): Observable<T[PropT]>
```

Invokes the read operation for the synchronizer of the given property `propertyName`. Returns an observable that emits the value of the property after the invoked synchronizer operation is completed.

`propertyName` - The name of the property to invoke the read operation of its synchronizer on.

`options` - (Optional) The [`Synchronizer.ReadOptions`](#synchronizer.readoptions) to pass to the synchronizer's read operation when invoked.

See [`Synchronizer.read`](#synchronizer.read) for more information.

#### `StateSelector.export`

```ts
function export<RequestParamsT = never>(
    propertyNames: keyof T | Array<keyof T>,
    options?: Synchronizer.WriteOptions<RequestParamsT>
): Observable<any>
```

Invokes the write operation for the synchronizers of the given properties in `propertyNames`. Returns an observable that emits the combined response value after the invoked synchronizer operations are completed.

`propertyNames` - The names of the properties (or single property) to invoke the write operation of their synchronizer(s) on.

`options` - (Optional) The [`Synchronizer.WriteOptions`](#synchronizer.writeoptions) to pass to each synchronizer's write operation when invoked.

See [`Synchronizer.write`](#synchronizer.write) for more information.

## `Synchronizer`

Base interface for all synchronizers.

```ts
interface Synchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT,
    WriteParamsT
> {
    requiredProperties?: Array<keyof T>;
    proxy?: boolean;

    read(
        requiredDetails: Partial<T>,
        options: Synchronizer.BaseOptions<T, PropKey, ReadParamsT> & Synchronizer.ReadOptions<ReadParamsT>
    ): Observable<T[PropKey]>;

    write?(
        value: T[PropKey],
        options: Synchronizer.BaseOptions<T, PropKey, WriteParamsT> & Synchronizer.WriteOptions<WriteParamsT>
    ): Observable<any>;
}

namespace Synchronizer {

    interface BaseOptions<
        T,
        PropKey extends keyof T,
        ParamsT
    > {
        propertyName: PropKey;
        requestParams?: ParamsT;
    }

    interface ReadOptions<ParamsT> {
        clearStore?: boolean;
        requestParams?: ParamsT;
    }

    interface WriteOptions<ParamsT> {
        requestParams?: ParamsT;
    }
}
```

### Interface properties

`requiredProperties` - (Optional) The list of properties that are required to be defined before this synchronizer's read operation is invoked. If any of the given properties has its own synchronizer, it's read operation will be completed before invoking this synchronizer if its value is not yet defined (or if this is a proxy synchronizer).

`proxy` - (Optional) Whether or not this is a proxy synchronizer. A proxy synchronizer is a synchronizer that does not make its own requests, but simply transforms the state of other synchronized values. A proxy synchronizer's `requiredProperties` will always have their synchronizer's invoked when the proxy synchronizer itself is invoked. Defaults to `false`.

### Interface methods

#### `Synchronizer.read`

```ts
function read(
    requiredDetails: Partial<T>,
    options: Synchronizer.BaseOptions<T, PropKey, ReadParamsT> & Synchronizer.ReadOptions<ReadParamsT>
): Observable<T[PropKey]>
```

The read operation of the synchronizer, used to retrieve a value from a remote data store. Returns an observable that emits the value retrieved from the remote data store.

`requiredDetails` - A partial list of state values corresponding to the properties defined in `requiredProperties`. Empty if no `requiredProperties` were defined.

`options` - The [`Synchronizer.ReadOptions`](#synchronizer.readoptions) to use for this operation.

#### `Synchronizer.write`

```ts
function write(
    value: T[PropKey],
    options: Synchronizer.BaseOptions<T, PropKey, WriteParamsT> & Synchronizer.WriteOptions<WriteParamsT>
): Observable<any>
```

(Optional) The write operation of the synchronizer, used to send a value to a remote data store. Returns an observable that emits the response (if any) from the remote data store after the write operation is complete.

`value` - The value to write to the remote data store.

`options` - The [`Synchronizer.WriteOptions`](#synchronizer.writeoptions) to use for this operation.

### Namespace functions

#### `Synchronizer.BaseOptions`

```ts
interface BaseOptions<
    T,
    PropKey extends keyof T,
    ParamsT
> {
    propertyName: PropKey;
    requestParams?: ParamsT;
}
```

The base interface for all [`Synchronizer`](#synchronizer) operations.

`propertyName` - The name of the state property involved in the current operation.

`requestParams` - (Optional) Any request params to be passed to the remote data store.

#### `Synchronizer.ReadOptions`

```ts
interface ReadOptions<ParamsT> {
    clearStore?: boolean;
    requestParams?: ParamsT;
}
```

The interface for all [`Synchronizer`](#synchronizer) read operations.

`clearStore` - (Optional) Whether or not the current property value should be cleared before invoking the read operation.

`requestParams` - (Optional) Any request params to be passed to the remote data store.

#### `Synchronizer.WriteOptions`

```ts
interface WriteOptions<ParamsT> {
    requestParams?: ParamsT;
}
```

The interface for all [`Synchronizer`](#synchronizer) write operations.

`requestParams` - (Optional) Any request params to be passed to the remote data store.

## `PropertySynchronizer`

Interface for declaring property synchronizers, which are linked to a specific state property.

```ts
interface PropertySynchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT = never,
    WriteParamsT = never
> extends Synchronizer<T, PropKey, ReadParamsT, WriteParamsT> {

    read(
        requiredDetails: Partial<T>,
        options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
    ): Observable<T[PropKey]>;

    write?(
        value: T[PropKey],
        options: PropertySynchronizer.WriteOptions<T, PropKey, WriteParamsT>
    ): Observable<any>;
}
```

### Interface methods

#### `PropertySynchronizer.read`

```ts
function read(
    requiredDetails: Partial<T>,
    options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
): Observable<T[PropKey]>
```

See [`Synchronizer.read`](#synchronizer.read).

#### `PropertySynchronizer.write`

```ts
function write(
    value: T[PropKey],
    options: PropertySynchronizer.WriteOptions<T, PropKey, WriteParamsT>
): Observable<any>
```

See [`Synchronizer.write`](#synchronizer.write).

## `CollectionSynchronizer`

Interface for declaring collection synchronizers, which manage all properties dynamically in a given state.

```ts
interface CollectionSynchronizer<
    T,
    ReadParamsT = never,
    WriteParamsT = never
> extends Synchronizer<T, keyof T, ReadParamsT, WriteParamsT> {

    read(
        requiredDetails: Partial<T>,
        options: CollectionSynchronizer.ReadOptions<T, ReadParamsT>
    ): Observable<T[keyof T]>;

    write?(
        value: T[keyof T],
        options: CollectionSynchronizer.WriteOptions<T, WriteParamsT>
    ): Observable<any>;
}
```

### Interface methods

#### `CollectionSynchronizer.read`

```ts
function read(
    requiredDetails: Partial<T>,
    options: CollectionSynchronizer.ReadOptions<T, PropKey, ReadParamsT>
): Observable<T[PropKey]>
```

See [`Synchronizer.read`](#synchronizer.read).

#### `CollectionSynchronizer.write`

```ts
function write(
    value: T[PropKey],
    options: CollectionSynchronizer.WriteOptions<T, PropKey, WriteParamsT>
): Observable<any>
```

See [`Synchronizer.write`](#synchronizer.write).

## `StateSynchronizer`

Abstract class for declaring state synchronizers, which are a special kind of aggregate [`PropertySynchronizer`](#propertysynchronizer) that by default invoke all of the synchronizers defined for the given state.

```ts
abstract class StateSynchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT = never,
    WriteParamsT = never
> implements PropertySynchronizer<T, PropKey, ReadParamsT, WriteParamsT> {

    constructor(
        private readonly injector: Injector,
        private readonly propertyState: SyncClass<T[PropKey]>
    );

    public read(
        _requiredDetails: Partial<T>,
        _options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
    ): Observable<T[PropKey]>;

    protected readSubset(properties: Array<keyof T[PropKey]>): Observable<T[PropKey]>;
}
```

### Methods

#### `StateSynchronizer.constructor`

```ts
constructor(
    private readonly injector: Injector,
    private readonly propertyState: SyncClass<T[PropKey]>
)
```

`injector` - The Angular injector used to resolve state dependencies.

`propertyState` - The state class definition to invoke its synchronizer operations on.

#### `StateSynchronizer.read`

```ts
function read(
    _requiredDetails: Partial<T>,
    _options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
): Observable<T[PropKey]>
```

By default, invokes all of the synchronizers read operations defined for the given state.

`_requiredDetails` - Unused.

`_options` - Unused.

#### `StateSynchronizer.readSubset`

```ts
function readSubset(properties: Array<keyof T[PropKey]>): Observable<T[PropKey]>
```

Helper method for invoking the read synchronizer operation on a specific subset of properties. Can be used in conjunction with overriding [`read`](#statesynchronizer.read) to override the default behavior of the state synchronizer. Returns an observable that emits when all read operations have completed.

`properties` - The list of properties that will have their read synchronizer operation invoked.