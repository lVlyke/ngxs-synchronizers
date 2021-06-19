# NGXS Synchronizers

Easily keep your app's local state synchronized with your backend, databases and more! ngxs-synchronizers simplifies synchronizing your NGXS-based application state with external data sources.

* [**About**](#about)
* [**Features**](#features)
* [**Installation**](#installation)
* [**Quick start**](#quick-start)
* [**Full usage guide**](/docs/usage-guide.md)
* API reference (coming soon)

## About

**ngxs-synchronizers** is an extension to NGXS that allows for easy synchronization between a local NGXS state and an external data source (i.e. backend service, database, JSON file, etc.) through special Angular services called _Synchronizers_. Synchronizers can be used to read and write data from an external data source, and can be used to more easily manage application state synchronization and data dependency requirements.

Check out the [quick start guide](#quick-start) if you're already familiar with NGXS and want to quickly add ngxs-synchronizers to your existing app. The [full usage guide](/docs/usage-guide.md) gives a complete walkthrough of each feature.

## Features

* **Easy to configure** - Straightforward configuration that can be used accross your whole application or targeted at specific modules.
* **Efficient** - ngxs-synchronizers uses RxJS for efficient updating of data. Duplicate data requests are automatically batched into single requests and all synchronization requests can be observed and cancelled. Data can be conditionally required, allowing for zero-configuration caching and lazy-loading of requests.
* **Easy to integrate** - ngxs-synchronizers integrates transparently with NGXS and makes it feel like part of NGXS instead of yet another library.

## Installation

ngxs-synchronizers requires @ngxs/store as a dependency. Both can be installed from npm with the following command:

```bash
npm install @ngxs/store ngxs-synchronizers
```

## Quick start

This section assumes you have an existing NGXS-enabled application already set up. Please see the [usage guide](/docs/usage-guide.md) for more detailed usage information.

After installing ngxs-synchronizers, we need to make some slight modifications to our existing ```@State``` classes. Given the following example NGXS ```State``` definition:

```ts
import { State } from '@ngxs/store';

interface Session {
    username: string;
    messages: string[];
}

@State<Session>({
    name: 'session',
    defaults: null
})
@Injectable()
class SessionState {
    ...
}
```

We first need to replace the ```@State``` decorator with the ```@SyncState``` decorator from ngxs-synchronizers. Now our ```SessionState``` class should look like this:

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

Next, we need to create a ```Synchronizer``` service to sync up with our app's backend service. We're going to write a property synchronizer that gets the user's latest messages from the backend. Let's assume an existing service called ```Messages``` that contains a ```get``` method for retreiving the list of messages for a given username from the backend.

### Synchronizer service example:

```ts
import { PropertySynchronizer } from 'ngxs-synchronizers';

@Injectable({ providedIn: 'root' })
export class MessagesSynchronizer implements PropertySynchronizer<Session, 'messages'> {

    // We need to know the username in order to fetch the messages
    public readonly requiredProperties = ['username'];

    // messagesProvider is an existing service for retrieving user messages from the backend
    constructor(private readonly messagesProvider: Messages) {}

    public read({ username }: Session): Observable<string[]> {
        // Get current messages for the active user
        return this.messagesProvider.get(username);
    }
}
```

Our newly created ```MessagesSynchronizer``` service implements the ```PropertySynchronizer``` interface and specifies that it's managing the ```messages``` property on our ```Session``` model. We are also specifying that this synchronizer relies on the latest value of the ```username``` field from our ```Session``` store. In this case, we're assuming this value already exists in our local state. However, we could also create a ```PropertySynchronizer``` for the ```username``` property itself, and it would then automatically be invoked when ```MessagesSynchronizer``` is invoked.

The ```read``` method we've implemented receives any required fields from the object that are needed to perform the request. Since we've specified we require the ```username``` field, the ```read``` method will receive a partial ```Session``` object that contains the current value for ```username``` in our local store. The method should return an ```Observable``` with a return type that corresponds to the type of the field we're synchronizing, which in this case is a ```string[]```.

Now that we've created a ```Synchronizer```, we need to tell ngxs-synchronizers about it. Let's go back to our ```SessionState``` definition and register our new synchronizer:

```ts
interface Session {
    username: string;
    messages: string[];
}

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

With that, we're now ready to start using our new synchronizer.

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