import { Injectable, Injector } from "@angular/core";
import { Store } from "@ngxs/store";
import { SyncState } from "./decorators/sync-state";
import { StateSelector } from "./state-selector";

interface InternalStore {
    _stateStream: any;
    _internalStateOperations: any;
    _config: any;
    _internalExecutionStrategy: any;
    _stateFactory: any;
}

@Injectable()
export class SyncStore extends Store {

    public readonly injector: Injector;

    constructor(injector: Injector, store: Store) {
        const internalStore: InternalStore = store as any;

        super(
            internalStore._stateStream,
            internalStore._internalStateOperations,
            internalStore._config,
            internalStore._internalExecutionStrategy,
            internalStore._stateFactory,
            undefined
        );

        this.injector = injector;
    }

    public state<T>(syncState: SyncState.Class<T>): StateSelector<T> {
        const statePath: SyncState.Class<unknown>[] = [...SyncState.Class.resolveParents(syncState).reverse(), syncState];
        const state$ = this.select<T>(state => statePath.reduce((parentState, childState) => {
            return parentState[SyncState.Class.getStoreOptions(childState).name];
        }, state));

        return new StateSelector<T>(this, syncState, state$);
    }
}
