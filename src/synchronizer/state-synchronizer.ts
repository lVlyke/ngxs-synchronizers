import { Injector } from "@angular/core";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SyncState } from "../decorators/sync-state";
import { Synchronizers } from "../sychronizers";
import { SyncStore } from "../sync-store";
import { PropertySynchronizer } from "./property-synchronizer";

export abstract class StateSynchronizer<C, T extends keyof C> implements PropertySynchronizer<C, T> {

    constructor(
        private readonly injector: Injector,
        public readonly property: T,
        private readonly state: SyncState.Class<T>
    ) {}

    public read(): Observable<C[T]> {
        const syncStore = this.injector.get(SyncStore);
        const synchronizers = this.injector.get(Synchronizers);
        const stateSelector = syncStore.state<T>(this.state);
        const stateSynchronizerDict = synchronizers.getCollection<C[T]>(this.state.stateName) as PropertySynchronizer.Collection<C[T]>;
        const stateSynchronizers: PropertySynchronizer<C[T], any>[] = Object.values(stateSynchronizerDict.synchronizers);

        // Sync each property in the sub-store that has a synchronizer
        return forkJoin(stateSynchronizers.map(synchronizer => {
            return stateSelector.syncProperty(synchronizer.property).pipe(
                map(result => ({ [synchronizer.property]: result }))
            );
        })).pipe(map(results => Object.assign({}, ...results)));
    }
}
