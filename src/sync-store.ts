import { Injectable, Injector, Signal } from "@angular/core";
import { Store, TypedSelector } from "@ngxs/store";
import { SyncClass } from "./decorators/sync-class";
import { StateSelector } from "./state-selector";
import { Observable, Subscription } from "rxjs";

type ActionOrArrayOfActions<T> = T extends (infer U)[] ? NonNullable<U>[] : NonNullable<T>;

@Injectable()
export class SyncStore {

    public readonly injector: Injector;
    private readonly store: Store;
    private readonly _selectorMap: Map<SyncClass<any>, StateSelector<any>>;

    constructor(injector: Injector, store: Store) {

        this.injector = injector;
        this.store = store;
        this._selectorMap = new Map();
    }

    public state<T>(syncState: SyncClass<T>): StateSelector<T> {
        // If the selector hasn't been created for this state class yet, create it
        if (!this._selectorMap.has(syncState)) {
            const statePath: SyncClass<unknown>[] = [...SyncClass.resolveParents(syncState).reverse(), syncState];

            /* eslint-disable @typescript-eslint/no-unsafe-return */
            const state$ = this.select<T>(state => statePath.reduce((parentState, childState) => {
                /* eslint-disable @typescript-eslint/no-unsafe-return */
                /* eslint-disable @typescript-eslint/no-unsafe-member-access */
                return parentState[SyncClass.getStoreOptions(childState).name];
            }, state));

            // Record each state selector to keep pending requests in sync between state() calls
            this._selectorMap.set(syncState, new StateSelector<T>(this, syncState, state$));
        }

        return this._selectorMap.get(syncState)!;
    }

    public dispatch<T>(actionOrActions: ActionOrArrayOfActions<T>): Observable<void> {
        return this.store.dispatch<T>(actionOrActions);
    }

    public select<T>(selector: TypedSelector<T>): Observable<T> {
        return this.store.select<T>(selector);
    }

    public selectOnce<T>(selector: TypedSelector<T>): Observable<T> {
        return this.store.selectOnce<T>(selector);
    }

    public selectSnapshot<T>(selector: TypedSelector<T>): T {
        return this.store.selectSnapshot<T>(selector);
    }

    public selectSignal<T>(selector: TypedSelector<T>): Signal<T> {
        return this.store.selectSignal<T>(selector);
    }

    public subscribe(fn?: (value: any) => void): Subscription {
        return this.store.subscribe(fn);
    }

    public snapshot(): any {
        return this.store.snapshot();
    }

    public reset(state: any): void {
        return this.store.reset(state);
    }
}
