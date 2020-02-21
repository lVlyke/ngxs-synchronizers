
import { BehaviorSubject, forkJoin, merge, Observable, of, throwError, zip } from "rxjs";
import { catchError, distinctUntilChanged, filter, map, mergeMap, publishReplay, refCount, take, tap } from "rxjs/operators";
import { SyncState } from "./decorators/sync-state";
import { SyncStore } from "./sync-store";
import { Synchronizer } from "./synchronizer/synchronizer";
import { SynchronizerDictionary } from "./synchronizer/synchronizer-dictionary";

type PendingStateRequestDictionary<T> = {
    [P in keyof T]?: Observable<T>;
};

export class StateSelector<T> {

    public readonly synchronizers = SyncState.Class.getStoreOptions(this.stateClass).synchronizers;

    private readonly injector = this.store.injector;
    private readonly pendingRequests$ = new BehaviorSubject<PendingStateRequestDictionary<T>>({});

    constructor(
        private store: SyncStore,
        private stateClass: SyncState.Class<T>,
        private state$: Observable<T>
    ) {}

    public dispatch<PropT extends keyof T>(propertyName: PropT, value: T[PropT]): Observable<T> {
        const PropUpdateAction = SyncState.UpdateAction.Type<T, PropT>(this.stateClass);

        return this.store.dispatch(new PropUpdateAction(propertyName, value));
    }

    public property<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]> {
        return this.state$.pipe(map((state: T) => state[propertyName]));
    }

    public definedProperty<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]> {
        return this.property<PropT>(propertyName).pipe(filter<T[PropT]>(Boolean));
    }

    public isSyncingProperty(propertyName: keyof T): Observable<boolean> {
        return this.getPropertyUpdater(propertyName).pipe(
            map(Boolean),
            distinctUntilChanged()
        );
    }

    public onPropertySyncing<PropT extends keyof T>(propertyName: PropT): Observable<PropT> {
        return this.isSyncingProperty(propertyName).pipe(
            filter(Boolean),
            map(() => propertyName),
        );
    }

    public onPropertySynced<PropT extends keyof T>(propertyName: PropT): Observable<PropT> {
        return this.isSyncingProperty(propertyName).pipe(
            filter(updating => !updating),
            map(() => propertyName)
        );
    }

    public onEveryPropertySyncing(...propertyNames: Array<keyof T>): Observable<Array<keyof T>> {
        return zip(...propertyNames.map(propertyName => this.onPropertySyncing(propertyName)));
    }

    public onEveryPropertySynced(...propertyNames: Array<keyof T>): Observable<Array<keyof T>> {
        return zip(...propertyNames.map(propertyName => this.onPropertySynced(propertyName)));
    }

    public onSomePropertySyncing(...propertyNames: Array<keyof T>): Observable<keyof T> {
        return merge(...propertyNames.map(propertyName => this.onPropertySyncing(propertyName)));
    }

    public onSomePropertySynced(...propertyNames: Array<keyof T>): Observable<keyof T> {
        return merge(...propertyNames.map(propertyName => this.onPropertySynced(propertyName)));
    }

    public require<OptsT = any>(propertyNames: keyof T | Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        if (Array.isArray(propertyNames)) {
            return this.requireAll<OptsT>(propertyNames, options);
        } else {
            return this.requireOne<keyof T, OptsT>(propertyNames, options);
        }
    }

    public requireProperty<PropT extends keyof T, OptsT = any>(propertyName: PropT, options?: Synchronizer.Options<OptsT>): Observable<T[PropT]> {
        return this.requireOne<PropT, OptsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    public sync<OptsT = any>(propertyNames: keyof T | Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        if (Array.isArray(propertyNames)) {
            return this.syncAll<OptsT>(propertyNames, options);
        } else {
            return this.syncOne<keyof T, OptsT>(propertyNames, options);
        }
    }

    public syncProperty<PropT extends keyof T, OptsT = any>(propertyName: PropT, options?: Synchronizer.Options<OptsT>): Observable<T[PropT]> {
        return this.syncOne<PropT, OptsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    private requireOne<PropT extends keyof T, OptsT = any>(propertyName: PropT, options?: Synchronizer.Options<OptsT>): Observable<T> {
        return this.state$.pipe(
            take(1),
            mergeMap(state => {
                if (state[propertyName]) {
                    return of(state);
                } else {
                    return this.sync<OptsT>(propertyName, options);
                }
            })
        );
    }

    private requireAll<OptsT = any>(propertyNames: Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        if (propertyNames.length === 0) {
            return this.state$.pipe(take(1));
        } else {
            const errors: any[] = [];
            return forkJoin(propertyNames.map(propertyName => {
                return this.requireOne<keyof T, OptsT>(propertyName, options).pipe(
                    catchError((error) => {
                        errors.push(error);
                        return of(undefined);
                    })
                );
            })).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take(1));
                    } else {
                        return throwError(errors);
                    }
                })
            );
        }
    }

    private syncOne<PropT extends keyof T, OptsT = any>(propertyName: PropT, options?: Synchronizer.Options<OptsT>): Observable<T> {
        options = options || {};
        const errorPrefix = "[NGXS-Synchronizers] Cannot sync state:";
        let synchronizer: Synchronizer<T, keyof T>;
        try {
            synchronizer = SynchronizerDictionary.resolveSynchronizerInstance(this.injector, this.synchronizers, propertyName);
        } catch (error) {
            return throwError(error);
        }

        // Check for cached values/pending requests only if this isn't a dependent requestor
        if (!synchronizer.proxy) {
            if (options.clearStore) {
                // TODO-Synchronize on this?
                this.dispatch(propertyName, undefined).subscribe();
            }

            if (synchronizer.requiredProperties && synchronizer.requiredProperties.some(requiredPropertyName => requiredPropertyName === propertyName)) {
                return throwError(`${errorPrefix} Synchronizer for "${propertyName}" requires a reference to itself.`);
            }
        }

        return this.pendingRequests$.pipe(
            take(1),
            mergeMap((pendingRequests) => {
                let pendingRequest$ = pendingRequests[propertyName];

                if (pendingRequest$ && !options.clearStore) {
                    // Use the existing request if this value is currently being requested
                    return pendingRequest$;
                } else {
                    // First request any required fields needed to fetch the propertyName
                    if (synchronizer.proxy) {
                        pendingRequest$ = this.syncAll<OptsT>(synchronizer.requiredProperties, options);
                    } else {
                        pendingRequest$ = this.requireAll<OptsT>(synchronizer.requiredProperties || []);
                    }

                    // Then fetch the propertyName
                    pendingRequest$ = pendingRequest$.pipe(
                        mergeMap((requiredDetails: any) => synchronizer.read(requiredDetails, { propertyName, ...options })),
                        mergeMap((value: any) => this.dispatch(propertyName, value)), // Update the store value
                        catchError((error) => {
                            this.clearPropertyUpdater(propertyName, pendingRequest$);
                            return throwError(error);
                        }),
                        tap(() => this.clearPropertyUpdater(propertyName, pendingRequest$)), // Remove the pending request
                        mergeMap(() => this.state$.pipe(take(1))), // Get the newly updated state
                        publishReplay(1),
                        refCount()
                    );

                    this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: pendingRequest$ }));
                    return pendingRequest$;
                }
            })
        );
    }

    private syncAll<OptsT = any>(propertyNames: Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        options = options || {};

        if (propertyNames.length === 0) {
            return this.state$.pipe(take(1));
        }

        // Update each required propertyName
        const errors: any[] = [];
        return forkJoin(propertyNames.map(name => this.sync<OptsT>(name, options).pipe(
            catchError((error) => {
                errors.push(error);
                return of(undefined);
            })))).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take(1));
                    } else {
                        return throwError(`Error updating properties: ${errors.join(", ")}`);
                    }
                })
            );
    }

    private getPropertyUpdater(propertyName: keyof T): Observable<Observable<T> | undefined> {
        return this.pendingRequests$.pipe(map(pendingRequests => pendingRequests[propertyName]));
    }

    private clearPropertyUpdater(propertyName: keyof T, request: Observable<T>): void {
        this.pendingRequests$.pipe(
            take(1),
            filter(pendingRequests => pendingRequests[propertyName] === request)
        ).subscribe(pendingRequests => this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: undefined })));
    }
}
