# NGXS Synchronizers

Easily keep your app's local state synchronized with your backend, databases and more! ngxs-synchronizers simplifies synchronizing your NGXS-based application state with external data sources.

* [**About**](#about)
* [**Features**](#features)
* [**Installation**](#installation)
* [**Quick start**](#quick-start)
* [**Tutorial**](/docs/usage-guide.md)
* API reference

## About

**ngxs-synchronizers** is an extension to NGXS that allows for easy synchronization between a local NGXS state and an external data source (backend service, database, JSON file, etc) through special Angular services called _Synchronizers_. ngxs-synchronizers can be used to fetch new data from an external data source, _require_ data that isn't already present in the app (allowing for zero-configuration caching), and can be used to listen to remote requests for easily managing complex UI interactions that rely on synchronization of asynchronous data requests.

Check out the [quick start guide](#quick-start) if you're already familiar with NGXS and want to add ngxs-synchronizers to your existing app, or read through the [full tutorial](/docs/usage-guide.md) for a more thorough walkthrough.

## Features

* **Easy to configure** - Straightforward configuration that can be used accross your whole application or targeted at specific modules.
* **Efficient** - ngxs-synchronizers uses RxJS for efficient updating of data. Duplicate data requests are automatically batched into single requests and all synchronization requests can be observed and cancelled.
* **Easy to integrate** - ngxs-synchronizers integrates transparently with NGXS and makes it feel like part of NGXS instead of yet another library.

## Installation

ngxs-synchronizers requires @ngxs/store as a dependency. Both can be installed from npm with the following command:

```bash
npm install @ngxs/store ngxs-synchronizers
```

## Quick start

This section assumes you have an existing NGXS-enabled application already set up. Please see the [usage guide](/docs/usage-guide.md) for more detailed usage information.

After installing ngxs-synchronizers, we need to make some slight modifications to our existing ```@State``` classes. Given the following example NGXS ```State```:

```ts
interface Session {
    username: string;
    messages: string[];
}

@State<Session>({
    name: 'session',
    defaults: null
})
class SessionState {}
```

We need to replace the ```@State``` decorator with the ```@SyncState``` decorator from ngxs-synchronizers and add a static ```stateName``` field to the class. Now our ```SessionState``` class should look like this:

```ts
interface Session {
    username: string;
    messages: string[];
}

@SyncState<Session>({
    name: SessionState.stateName,
    defaults: null
})
class SessionState {

    public static readonly stateName = 'session';
}
```

Next, we need to define at least one ```Synchronizer``` service to sync up with our theoretical backend service. We're going to write a property synchronizer that gets the user's latest messages from the backend. Let's assume an existing service called ```Messages``` that contains a ```get``` method for retreiving the list of messages for a given username from the backend.

### Synchronizer service example:

```ts
@Injectable()
export class MessagesSynchronizer implements PropertySynchronizer<Session, 'messages'> {

    public readonly property = 'messages';
    public readonly requiredProperties = ['username'];

    // messagesProvider is an existing service for retrieving user messages from the backend
    constructor(private readonly messagesProvider: Messages) {}

    public read({ username }: Session): Observable<string[]> {
        // Get current messages for the active user
        return this.messagesProvider.get(username);
    }
}
```

Our newly created ```MessagesSynchronizer``` service implements the ```PropertySynchronizer``` interface and specifies that it's managing the ```messages``` property on our ```Session``` model. We are also specifying that this synchronizer relies on the latest value of the ```username``` field from our ```Session``` store. In this case we're assuming this value already exists in our local state, but we could also create a ```Synchronizer``` for the ```username``` field and it would automatically be invoked when we go to request new messages through this synchronizer.

The ```read``` method we've implemented receives any required fields from the object that are needed to perform the request. Since we've specified we require the ```username``` field, the ```read``` method will receive a partial ```Session``` object that contains the current value for ```username``` in our local store. The method should return an ```Observable``` with a return type that corresponds to the type of the field we're synchronizing, which in this case is a ```string[]```.

Now that we've created a ```Synchronizer```, we need to tell ngxs-synchronizers about it. Create a new file called ```app-synchronizers.module.ts``` in your project and declare a new dictionary with the ```MessagesSynchronizer``` we just created and call ```NgxsSyncModule.withSynchronizers``` like in the example below:

```ts
@NgModule({
    imports: [
        NgxsSyncModule.withSynchronizers({
            'session': [MessagesSynchronizer]
        })
    ],
    exports: [ NgxsSyncModule ]
})
export class AppSynchronizersModule {}
```

Note that the ```'session'``` key in the dictionary corresponds to the ```stateName``` of the ```SyncState``` we created earlier. Make sure that this new module is imported in your ```AppModule```. Now we can start using our new synchronizer.

Let's assume we have a page in our app that shows the user's messages. When the user navigates to this page we want to make sure we've fetched the user's messages so we can display them. To do this, we can use the ```SyncStore``` service to update our ```session``` store with the latest messages from the backend service:

### ```SyncStore``` example:

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

We call ```SyncStore.state``` to get the ```StateSelector``` corresponding to our ```SessionState```. Calling ```StateSelector.syncProperty``` uses the ```MessagesSynchronizer``` we defined earlier to get the latest messages from the backend.

This works well, however we might want to only fetch the messages from the backend once when the user first navigates to the page, and then offer a refresh mechanism for loading new messages, or re-fetch them periodically. We can replace the call to ```syncProperty``` with ```requireProperty```, which will only make a request to the backend if the data doesn't already exist in the local store. Otherwise it will just return the existing data in the store.

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

Now the user's messages will only be fetched from the backend the first time the user navigates to ```MessagesPage```.