import { Injectable } from "@angular/core";
import { Store } from "@ngxs/store";
import { SyncState } from "./decorators/sync-state";
import { StateSelector } from "./state-selector";
import { Synchronizers } from "./sychronizers";

interface InternalStore {
    _stateStream: any;
    _internalStateOperations: any;
    _config: any;
    _internalExecutionStrategy: any;
    _stateFactory: any;
}

@Injectable()
export class SyncStore extends Store {

    private synchronizers: Synchronizers;

    constructor(synchronizers: Synchronizers, store: Store) {
        const internalStore: InternalStore = store as any;

        super(
            internalStore._stateStream,
            internalStore._internalStateOperations,
            internalStore._config,
            internalStore._internalExecutionStrategy,
            internalStore._stateFactory,
            undefined
        );

        this.synchronizers = synchronizers;
    }

    public state<T>(syncState: SyncState.Class, ...parentStates: SyncState.Class[]): StateSelector<T> {
        return new StateSelector<T>(
            this,
            syncState,
            this.select(state => [...parentStates, syncState].reduce((newState, curState) => newState[curState.stateName], state)),
            this.synchronizers.getCollection<T>(syncState.stateName)
        );
    }
}
