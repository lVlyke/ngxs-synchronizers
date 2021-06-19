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
    private readonly _selectorMap: Map<SyncClass<any>, StateSelector<any>>;

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
        this._selectorMap = new Map();
    }

    public state<T>(syncState: SyncClass<T>): StateSelector<T> {
        // If the selector hasn't been created for this state class yet, create it
        if (!this._selectorMap.has(syncState)) {
            const statePath: SyncClass<unknown>[] = [...SyncClass.resolveParents(syncState).reverse(), syncState];
            const state$ = this.select<T>(state => statePath.reduce((parentState, childState) => {
                return parentState[SyncClass.getStoreOptions(childState).name];
            }, state));

            // Record each state selector to keep pending requests in sync between state() calls
            this._selectorMap.set(syncState, new StateSelector<T>(this, syncState, state$));
        }

        return this._selectorMap.get(syncState);
    }
}
