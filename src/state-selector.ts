
import { BehaviorSubject, EMPTY, forkJoin, merge, Observable, of, throwError, zip } from "rxjs";
import { catchError, distinctUntilChanged, filter, map, mergeMap, publishReplay, refCount, take, tap } from "rxjs/operators";
import { SyncClass } from "./decorators/sync-class";
import { SyncState } from "./decorators/sync-state";
import { SyncStore } from "./sync-store";
import { Synchronizer } from "./synchronizer/synchronizer";
import { SynchronizerDictionary } from "./synchronizer/synchronizer-dictionary";

type PendingStateRequestDictionary<T> = {
    [P in keyof T]?: Observable<T>;
};

export class StateSelector<T> {

    public readonly synchronizers = SyncClass.getStoreOptions(this.stateClass).synchronizers;

    private readonly injector = this.store.injector;
    private readonly pendingRequests$ = new BehaviorSubject<PendingStateRequestDictionary<T>>({});

    constructor(
        private store: SyncStore,
        private stateClass: SyncClass<T>,
        private state$: Observable<T | undefined>
    ) {}

    public dispatch<PropT extends keyof T>(propertyName: PropT, value: T[PropT]): Observable<T> {
        const PropUpdateAction = SyncState.UpdateAction.Type<T, PropT>(this.stateClass);

        return this.store.dispatch(new PropUpdateAction(propertyName, value));
    }

    public property<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT] | undefined> {
        return this.state$.pipe(map(state => state?.[propertyName]));
    }

    public properties(): Observable<T | undefined> {
        return this.state$;
    }

    public definedProperty<PropT extends keyof T>(propertyName: PropT): Observable<T[PropT]> {
        return this.property<PropT>(propertyName).pipe(
            filter((value): value is T[PropT] => value !== null && value !== undefined)
        );
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

    public require<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        if (Array.isArray(propertyNames)) {
            return this.requireAll<RequestParamsT>(propertyNames, options);
        } else {
            return this.requireOne<keyof T, RequestParamsT>(propertyNames, options);
        }
    }

    public requireProperty<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T[PropT]> {
        return this.requireOne<PropT, RequestParamsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    public sync<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        if (Array.isArray(propertyNames)) {
            return this.syncAll<RequestParamsT>(propertyNames, options);
        } else {
            return this.syncOne<keyof T, RequestParamsT>(propertyNames, options);
        }
    }

    public syncProperty<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T[PropT]> {
        return this.syncOne<PropT, RequestParamsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    public export<RequestParamsT = never>(
        propertyNames: keyof T | Array<keyof T>,
        options?: Synchronizer.WriteOptions<RequestParamsT>
    ): Observable<any> {
        if (Array.isArray(propertyNames)) {
            return this.exportAll<RequestParamsT>(propertyNames, options);
        } else {
            return this.exportOne<keyof T, RequestParamsT>(propertyNames, options);
        }
    }

    private requireOne<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        return this.state$.pipe(
            take(1),
            mergeMap(state => {
                if (state?.[propertyName] !== undefined && state?.[propertyName] !== null) {
                    return of(state);
                } else {
                    return this.sync<RequestParamsT>(propertyName, options);
                }
            })
        );
    }

    private requireAll<RequestParamsT = never>(
        propertyNames: Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        if (propertyNames.length === 0) {
            return this.state$.pipe(take<T | undefined>(1)) as Observable<T>;
        } else {
            const errors: any[] = [];
            return forkJoin(propertyNames.map(propertyName => {
                return this.requireOne<keyof T, RequestParamsT>(propertyName, options).pipe(
                    catchError((error) => {
                        errors.push(error);
                        return of(undefined);
                    })
                );
            })).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take<T | undefined>(1)) as Observable<T>;
                    } else {
                        return throwError(errors);
                    }
                })
            );
        }
    }

    private syncOne<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        options = options || {};
        const errorPrefix = "[NGXS-Synchronizers] Cannot sync state:";

        let synchronizer: Synchronizer<T, PropT, RequestParamsT, never>;
        try {
            synchronizer = this.resolveSynchronizer(propertyName);
        } catch (error) {
            return throwError(error);
        }

        // Check for cached values/pending requests only if this isn't a dependent requestor
        if (!synchronizer.proxy) {
            if (options.clearStore) {
                // TODO-Synchronize on this?
                this.dispatch(propertyName, undefined!).subscribe();
            }

            if (synchronizer.requiredProperties && synchronizer.requiredProperties.some(requiredPropertyName => requiredPropertyName === propertyName)) {
                return throwError(`${errorPrefix} Synchronizer for "${String(propertyName)}" requires a reference to itself.`);
            }
        }

        return this.pendingRequests$.pipe(
            take(1),
            mergeMap((pendingRequests) => {
                let pendingRequest$ = pendingRequests[propertyName] as Observable<T>;

                if (pendingRequest$ && !options!.clearStore) {
                    // Use the existing request if this value is currently being requested
                    return pendingRequest$;
                } else {
                    // First request any required fields needed to fetch the propertyName
                    if (synchronizer.proxy) {
                        pendingRequest$ = this.syncAll<RequestParamsT>(synchronizer.requiredProperties ?? [], options);
                    } else {
                        pendingRequest$ = this.requireAll<RequestParamsT>(synchronizer.requiredProperties ?? []);
                    }

                    // Then fetch the propertyName
                    pendingRequest$ = pendingRequest$.pipe(
                        mergeMap((requiredDetails: any) => synchronizer.read(requiredDetails, { propertyName, ...options })),
                        mergeMap((value: any) => this.dispatch(propertyName, value)), // Update the store value
                        catchError((error) => {
                            this.clearPropertyUpdater(propertyName, pendingRequest$!);
                            return throwError(error);
                        }),
                        tap(() => this.clearPropertyUpdater(propertyName, pendingRequest$!)), // Remove the pending request
                        mergeMap(() => this.state$.pipe(take<T | undefined>(1)) as Observable<T>), // Get the newly updated state
                        publishReplay(1),
                        refCount()
                    );

                    this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: pendingRequest$ }));
                    return pendingRequest$;
                }
            })
        );
    }

    private syncAll<RequestParamsT = never>(
        propertyNames: Array<keyof T>,
        options?: Synchronizer.ReadOptions<RequestParamsT>
    ): Observable<T> {
        options = options || {};

        if (propertyNames.length === 0) {
            return this.state$.pipe(take<T | undefined>(1)) as Observable<T>;
        }

        // Update each required propertyName
        const errors: any[] = [];
        return forkJoin(propertyNames.map(name => this.sync<RequestParamsT>(name, options).pipe(
            catchError((error) => {
                errors.push(error);
                return of(undefined);
            })))).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take<T | undefined>(1)) as Observable<T>;
                    } else {
                        return throwError(`Error syncing properties: ${errors.join(", ")}`);
                    }
                })
            );
    }

    private exportOne<PropT extends keyof T, RequestParamsT = never>(
        propertyName: PropT,
        options?: Synchronizer.WriteOptions<RequestParamsT>
    ): Observable<any> {
        options = options || {};
        const errorPrefix = "[NGXS-Synchronizers] Cannot export state:";

        let synchronizer: Synchronizer<T, PropT, never, RequestParamsT>;
        try {
            synchronizer = this.resolveSynchronizer(propertyName);
        } catch (error) {
            return throwError(error);
        }

        if (!synchronizer.write) {
            return throwError(`${errorPrefix} Synchronizer for "${String(propertyName)}" doesn't have a write method defined.`);
        }

        // Write the latest data in the store
        return this.property(propertyName).pipe(
            take(1),
            mergeMap(data => synchronizer.write!(data!, { propertyName, ...options })),
            publishReplay(1),
            refCount()
        );
    }

    private exportAll<RequestParamsT = never>(
        propertyNames: Array<keyof T>,
        options?: Synchronizer.WriteOptions<RequestParamsT>
    ): Observable<any> {
        options = options || {};

        if (propertyNames.length === 0) {
            return EMPTY;
        }

        // Update each required propertyName
        const errors: any[] = [];
        return forkJoin(propertyNames.map(name => this.export<RequestParamsT>(name, options).pipe(
            catchError((error) => {
                errors.push(error);
                return of(undefined);
            })))).pipe(
                mergeMap((results) => {
                    if (errors.length === 0) {
                        return of(results);
                    } else {
                        return throwError(`Error exporting properties: ${errors.join(", ")}`);
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

    private resolveSynchronizer<PropT extends keyof T, RequestParamsT>(propertyName: PropT): Synchronizer<T, PropT, RequestParamsT, RequestParamsT> {
        return SynchronizerDictionary.resolveSynchronizerInstance(
            this.injector,
            this.synchronizers ?? {},
            propertyName
        ) as Synchronizer<T, PropT, never, RequestParamsT>;
    }
}
