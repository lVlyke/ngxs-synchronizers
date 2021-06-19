# NGXS Synchronizers Usage Guide

A full [**API reference**](/docs/api-reference.md) is also available.

* [**Installation**](#installation)
* **SyncState**
  * [**Defining a state**](#defining-a-state)
* [**SyncStore**](#syncstore)
* [**StateSelector**](#stateselector)
* **Property Synchronizers**
  * [**Defining a property synchronizer**](#defining-a-property-synchronizer)
  * [**Using a property synchronizer**](#using-a-property-synchronizer)
* **Collection Synchronizers**
  * [**Defining a collection synchronizer**](#defining-a-collection-synchronizer)
  * [**Using a collection synchronizer**](#using-a-collection-synchronizer)
* **State Synchronizers**
  * [**Defining a state synchronizer**](#defining-a-state-synchronizer)
  * [**Using a state synchronizer**](#using-a-state-synchronizer)

## What is ngxs-synchronizers?

**ngxs-synchronizers** is an extension to NGXS that allows for easy synchronization between a local NGXS state and an external data source (i.e. backend service, database, JSON file, etc.) through special Angular services called _Synchronizers_. Synchronizers can be used to read and write data from an external data source, and can be used to more easily manage application state synchronization and data dependency requirements.

## When should I use ngxs-synchronizers?

ngxs-synchronizers is useful for applications that require synchronizing data between the local application and a remote data store like a backend web service or a database. If your application state relies on external data sources, ngxs-synchronizers can be useful for simplifying and abstracting communication and synchronization between your application and the remote data source.

## Installation

ngxs-synchronizers requires **@ngxs/store** as a dependency. Both can be installed from npm with the following command:

```bash
npm install @ngxs/store ngxs-synchronizers
```

You must import the `NgxsSyncModule` module into the root of your application.

Since ngxs-synchronizers is built on top of NGXS, it is recommended to read through the [NGXS documentation](https://www.ngxs.io/) to understand how NGXS works before proceeding.

## Defining a state
_[NGXS docs](https://www.ngxs.io/concepts/state)_

States are classes along with decorators to describe metadata and action mappings. Normally in NGXS we would use the `@State` decorator. ngxs-synchronizers provides its own `@SyncState` decorator that should be used instead. This decorator behaves like `@State` and adds extra configuration options specific to ngxs-synchronizers.

Let's create our first state class:

```ts
import { SyncState } from 'ngxs-synchronizers';

interface Session {
    username: string;
    messages: string[];
}

@SyncState<Session>({
    name: 'session',
    defaults: null
})
@Injectable()
class SessionState {
    ...
}
```

So far this is a straightforward state class definition that is not much different than a normal NGXS state definition. However, we must now define a synchronizer class that will allow us to read data from our remote data store.

## SyncStore
_[NGXS docs](https://www.ngxs.io/concepts/store)_

The `SyncStore` class is an extension of the `Store` class from NGXS. `SyncStore` has all the same methods and behavior as `Store`, but also adds a new `state` method that allows us to interact with our synchronizers.

## StateSelector

`StateSelector` is the class used to manage synchronizers and synchronization state. It is primarily used to invoke synchronizers and monitor the status of in-flight synchronizations.

## Defining a property synchronizer

In this example, we are going to write a _property_ synchronizer that gets the user's latest messages from the backend. Let's assume an existing Angular service called ```Messages``` that contains a ```get``` method for retreiving the list of messages for a given username from the backend.

### Property synchronizer example:

```ts
import { PropertySynchronizer } from 'ngxs-synchronizers';

@Injectable({ providedIn: 'root' })
export class MessagesSynchronizer implements PropertySynchronizer<Session, 'messages'> {

    // We need to know the username in order to fetch the messages
    // This creates a dependency on the `username` field.
    public readonly requiredProperties = ['username'];

    // messagesProvider is an existing service for retrieving user messages from the backend
    constructor(private readonly messagesProvider: Messages) {}

    public read({ username }: Session): Observable<string[]> {
        // Get current messages for the active user
        return this.messagesProvider.get(username);
    }
}
```

Our newly created ```MessagesSynchronizer``` service implements the ```PropertySynchronizer``` interface and specifies that it's managing the ```messages``` property on our ```Session``` model. We are also specifying that this synchronizer relies on the latest value of the ```username``` field from our ```Session``` store. In this example, we are assuming this value already exists in our local state. However, if we also create a ```PropertySynchronizer``` for the ```username``` field, it will be automatically be invoked 
_before_ ```MessagesSynchronizer``` is invoked.

The ```read``` method we have implemented receives all required fields from the object that we declared in `requiredProperties`. Since we have specified that we require the ```username``` field, the ```read``` method will receive a partial ```Session``` object that contains the current value for ```username```. The `read` method should return an ```Observable``` with a return type that corresponds to the type of the field we're synchronizing, which in this case is a ```string[]```.

Now that we have created our property synchronizer, we need to register it with our  ```SessionState``` class definition from earlier:

```ts
@SyncState<Session>({
    name: 'session',
    defaults: null,
    synchronizers: {
        // Register the `MessagesSynchronizer` for the `messages` property
        messages: MessagesSynchronizer
    }
})
@Injectable()
class SessionState {
    ...
}
```

With the `MessagesSynchronizer` registered, we can now use it to read data from the backend service.

## Using a property synchronizer

In this example we will use `SyncStore` and `StateSelector` to invoke our `MessageSynchronizer`.

Assume that we have a page in our application that shows the user's messages. When the user navigates to this page, we want to make sure we have fetched the user's messages so that we can display them. To do this, we can use the `read` function of `MessageSynchronizer` to update our local `session` store with the latest messages from the backend service. 

To invoke our synchronizer, we must use a `StateSelector`:


```ts
@Component({...})
export class MessagesPage {

    public messages: string[];

    constructor(store: SyncStore) {
        // Fetch the latest messages from the backend
        store.state<Session>(SessionState)
             .syncProperty('messages')
             .subscribe(messages => this.messages = messages);
    }
}
```

When we call `SyncStore.state` with `SessionState`, we get a `StateSelector` object that represents the current synchronization state of our state. Calling `StateSelector.syncProperty` invokes the `read` function of `MessagesSynchronizer` to get the latest messages from the backend.

This works well, however we might want to only fetch the messages from the backend once when the user first navigates to the page, and then offer a refresh mechanism for loading new messages, or re-fetch them periodically. We can replace the call to `syncProperty` with `requireProperty`, which will only make a request to the backend if the data does not already exist in the local application store. No request will be made if data already exists for the given property in the local application store.

### ```requireProperty``` example:

```ts
@Component({...})
export class MessagesPage {

    public messages: string[];

    constructor(store: SyncStore) {
        // Fetch the latest messages from the backend
        store.state<Session>(SessionState)
             .requireProperty('messages')
             .subscribe(messages => this.messages = messages);
    }
}
```

Now the user's messages will only be fetched from the backend the first time the user navigates to ```MessagesPage```. On each subsequent visit to the page, the previously fetched messages will be returned.

## Defining a collection synchronizer

Unlike a property synchronizer, a collection synchronizer is responsible for synchronizing a collection of data in a store.

In the next example, let's assume the user has access to an inventory of items, each with a unique ID. We could represent that inventory with the following types:

```ts
export interface InventoryItem {
    id: string;
    name: string;
}

// An `Inventory` is a collection of `InventoryItem` objects keyed by their ID
export type Inventory = Record<string, InventoryItem>;
```

We could just fetch the entire list of inventory items and put them in our local application store, but this would not be feasible if our inventory is large and contains thousands of items.

Instead, we can use a collection synchronizer to fetch only the items the user needs access to on a case-by-case basis as they progress through the application.

First, let's create a new state definition to represent the inventory: 

```ts
import { SyncState } from 'ngxs-synchronizers';

export interface InventoryItem {
    id: string;
    name: string;
}

export type Inventory = Record<string, InventoryItem>;

@SyncState<Inventory>({
    name: 'inventory',
    defaults: null
})
@Injectable()
class InventoryState {
    ...
}
```

Now, let's create a collection synchronizer for our new `inventory` state. Assume we have an `ItemInventory` Angular service that can retrieve individual inventory items from our remote data source:

```ts
import { CollectionSynchronizer } from 'ngxs-synchronizers';

@Injectable({ providedIn: 'root' })
export class InventorySynchronizer implements CollectionSynchronizer<Inventory> {

    // itemInventory is an existing service for retrieving inventory items from the backend
    constructor(private readonly itemInventory: ItemInventory) {}

    public read(_inventory: Inventory, options: CollectionSynchronizer.ReadOptions<Inventory>): Observable<InventoryItem> {
        // Get the inventory item by the specified ID:
        const itemId = options.propertyName;
        return this.itemInventory.getItem(itemId);
    }
}
```

When a specific `InventoryItem` is requested by ID, our `InventorySynchronizer` will look up the specified item from the backend. Now we need to register our collection synchronizer with our `InventoryState` from earlier:

```ts
@SyncState<Inventory>({
    name: 'inventory',
    defaults: null,
    // The `InventorySynchronizer` is used to synchronize all of the fields in this state
    synchronizers: InventorySynchronizer
})
@Injectable()
class InventoryState {
    ...
}
```

`InventorySynchronizer` will now be used to handle any requests for inventory items.

## Using a collection synchronizer

Using a collection synchronizer is very similar to using a property synchronizer, except that the properties being synced will be items of the collection that the synchronizer manages.

Assume we have a page in our application that is used to show the details about a specific `InventoryItem`. We will need to look up the item from the backend when the user navigates to the page.

To do this, we'll invoke our `InventorySynchronizer`:

```ts
import { Route } from "@angular/router";

@Component({...})
export class InventoryItemPage {

    public item: InventoryItem;

    constructor(store: SyncStore, route: Route) {
        // Retrieve the `itemId` param from the page route
        route.params.pipe(
            map(params => params.itemId),
            switchMap((itemId: string) => {
                // Fetch the specified item from the backend using the `InventorySynchronizer`
                return store.state<Inventory>(InventoryState)
                    .syncProperty(itemId);
            })
        ).subscribe(item => this.item = item);
    }
}
```

When we call `syncProperty` with the specified `itemId`, the `read` method from `InventorySynchronizer` will be invoked and retrieve the given item from the backend.

As with property synchronizers, we could instead use `requireProperty` instead of `syncProperty` to only make a new request to the backend if the item data is not already in our local application store:

```ts
store.state<Inventory>(InventoryState)
     .requireProperty(itemId);
```

## Defining a state synchronizer

A state synchronizer is a special kind of property synchronizer that invokes all of the synchronizers defined for a given state. This allows you to call all of the synchronizers on a given state at once. This is useful for creating aggregate synchronizers for child states.

Recall our `SessionState` definition from earlier:

```ts
import { SyncState } from 'ngxs-synchronizers';

interface Session {
    username: string;
    messages: string[];
}

@SyncState<Session>({
    name: 'session',
    defaults: null,
    synchronizers: {
        messages: MessagesSynchronizer
    }
})
@Injectable()
class SessionState {
    ...
}
```

Now, we will create a new parent state called `ApplicationState`, which will have the `SessionState` as a child:

```ts
import { SyncState } from 'ngxs-synchronizers';

interface AppData {
    session: Session;
}

@SyncState<AppData>({
    name: 'app',
    defaults: null,
    children: [SessionState]
})
@Injectable()
class AppState {
    ...
}
```

What if we wanted to synchronize our entire `session` state by invoking a synchronizer from the `AppState`? With state synchronizers, we can do just that. 

First, create a new synchronizer called `SessionSynchronizer`:

```ts
import { Injector } from '@angular/core';
import { StateSynchronizer } from 'ngxs-synchronizers';

@Injectable({ providedIn: 'root' })
export class SessionSynchronizer extends StateSynchronizer<AppData, "session"> {

    constructor(injector: Injector) {
        // Use the child `SessionState`
        super(injector, SessionState);
    }
}
```

`SessionSynchronizer` extends the `StateSynchronizer` class, which handles automatically invoking all child synchronizers of a given state definition. In this example, we are creating a state synchronizer for `SessionState`, which in turn will invoke the `MessageSynchronizer` for the `messages` field (and any other synchronizers defined in that state).

This behavior can be customized by overriding the `read` method of the synchronizer and using the `StateSynchronizer.readSubset` method to invoke specific synchronizers.

With our `SessionSynchronizer` defined, we need to register it with our `AppState` definition:

```ts
@SyncState<AppData>({
    name: 'app',
    defaults: null,
    synchronizers: {
        // Register the `SessionSynchronizer`
        session: SessionSynchronizer
    }
    children: [SessionState]
})
@Injectable()
class AppState {
    ...
}
```

Now when we synchronize on the `session` property in `AppState`, all of the synchronizers defined in `SessionState` will be invoked automatically.

## Using a state synchronizer

Using a state synchronizer is identical to using a property synchronizer:

```ts
store.state<AppData>(AppState)
     .syncProperty('session');
```