import { Injector } from "@angular/core";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SyncState } from "../decorators/sync-state";
import { StateSelector } from "../state-selector";
import { SyncStore } from "../sync-store";
import { PropertySynchronizer } from "./property-synchronizer";
import { SynchronizerDictionary } from "./synchronizer-dictionary";

export abstract class StateSynchronizer<
    T,
    PropKey extends keyof T
> implements PropertySynchronizer<T, PropKey> {

    constructor(
        private readonly injector: Injector,
        private readonly propertyState: SyncState.Class<T[PropKey]>
    ) {}

    public read(): Observable<T[PropKey]> {
        const syncStore = this.injector.get(SyncStore);
        const stateSelector = syncStore.state<T[PropKey]>(this.propertyState);

        // Sync each property in the sub-store that has a synchronizer
        return this.readProperties(stateSelector).pipe(map(results => Object.assign({}, ...results)));
    }

    private readProperties(
        stateSelector: StateSelector<T[PropKey]>
    ): Observable<Partial<T[PropKey]>[]> {
        const synchronizerKeys = SynchronizerDictionary.keys(stateSelector.synchronizers);

        // Sync each property in the dictionary
        return forkJoin(synchronizerKeys.map((propKey) => this.readProperty(stateSelector, propKey)));
    }

    private readProperty<SubPropT extends keyof T[PropKey]>(
        stateSelector: StateSelector<T[PropKey]>,
        propKey: SubPropT
    ): Observable<Partial<T[PropKey]>> {
        // Use `syncProperty` to invoke the synchronizer for this property
        return stateSelector.syncProperty<SubPropT>(propKey).pipe(map(result => ({ [propKey]: result }) as any));
    }
}
