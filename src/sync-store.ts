import { Injectable, Injector } from "@angular/core";
import { Store } from "@ngxs/store";
import { SyncClass } from "./decorators/sync-class";
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

    public state<T>(syncState: SyncClass<T>): StateSelector<T> {
        const statePath: SyncClass<unknown>[] = [...SyncClass.resolveParents(syncState).reverse(), syncState];
        const state$ = this.select<T>(state => statePath.reduce((parentState, childState) => {
            return parentState[SyncClass.getStoreOptions(childState).name];
        }, state));

        return new StateSelector<T>(this, syncState, state$);
    }
}
