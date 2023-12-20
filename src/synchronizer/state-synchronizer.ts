import { Injector } from "@angular/core";
import { forkJoin, Observable, of } from "rxjs";
import { map, switchMap, take } from "rxjs/operators";
import { SyncClass } from "../decorators/sync-class";
import { StateSelector } from "../state-selector";
import { SyncStore } from "../sync-store";
import { PropertySynchronizer } from "./property-synchronizer";
import { SynchronizerDictionary } from "./synchronizer-dictionary";

export abstract class StateSynchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT = never,
    WriteParamsT = never
> implements PropertySynchronizer<T, PropKey, ReadParamsT, WriteParamsT> {

    constructor(
        private readonly injector: Injector,
        private readonly propertyState: SyncClass<T[PropKey]>
    ) {}

    public read(
        _requiredDetails: Partial<T>,
        _options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
    ): Observable<T[PropKey]> {
        const syncStore = this.injector.get(SyncStore);
        const stateSelector = syncStore.state<T[PropKey]>(this.propertyState);

        // Sync each property in the sub-store that has a synchronizer
        return this.readSubset(SynchronizerDictionary.keys(stateSelector.synchronizers ?? {}));
    }

    protected readSubset(properties: Array<keyof T[PropKey]>): Observable<T[PropKey]> {
        const syncStore = this.injector.get(SyncStore);
        const stateSelector = syncStore.state<T[PropKey]>(this.propertyState);

        // Sync each property in the sub-store that has a synchronizer and combine with the current store's data
        return this.readProperties(stateSelector, properties).pipe(
            map(results => Object.assign({}, ...results) as T[PropKey]),
            switchMap(newProperties => stateSelector.properties().pipe(take(1), map(originalProperties => ({
                ...originalProperties,
                ...newProperties
            }))))
        );
    }

    private readProperties(
        stateSelector: StateSelector<T[PropKey]>,
        keys: Array<keyof T[PropKey]>
    ): Observable<Partial<T[PropKey]>[]> {
        // Sync each property in the dictionary
        return keys.length > 0
            ? forkJoin(keys.map((propKey) => this.readProperty(stateSelector, propKey)))
            : of([]);
    }

    private readProperty<SubPropT extends keyof T[PropKey]>(
        stateSelector: StateSelector<T[PropKey]>,
        propKey: SubPropT
    ): Observable<Partial<T[PropKey]>> {
        // Use `syncProperty` to invoke the synchronizer for this property
        return stateSelector.syncProperty<SubPropT>(propKey).pipe(
            map(result => ({ [propKey]: result }) as any as Partial<T[PropKey]>)
        );
    }
}
