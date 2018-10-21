import { Observable, BehaviorSubject, zip, merge, of, forkJoin, throwError } from "rxjs";
import { filter, map, distinctUntilChanged, mergeMap, take, catchError, shareReplay, tap } from "rxjs/operators";
import { Synchronizer } from "./synchronizer";
import { SyncState } from "./decorators/sync-state";
import { Store } from "@ngxs/store";

export class StateSelector<T> {

    private readonly pendingRequests$ = new BehaviorSubject<{ [P in keyof T]?: Observable<any> }>({});

    constructor(
        private store: Store,
        private stateClass: SyncState.Class,
        private state$: Observable<T>,
        private synchronizers: Synchronizer.Collection<T>
    ) {}

    public dispatch<MetaKey extends keyof T>(propertyName: MetaKey, value: T[MetaKey]): Observable<T> {
        const updateAction = SyncState.UpdateAction.For<T, T[MetaKey]>(this.stateClass);

        return this.store.dispatch(new updateAction(propertyName, value));
    }

    public metadata<MetaKey extends keyof T>(propertyName: MetaKey): Observable<T[MetaKey]> {
        return this.state$.pipe(map((state: T) => state[propertyName]));
    }

    public definedMetadata<MetaKey extends keyof T>(propertyName: MetaKey): Observable<T[MetaKey]> {
        return this.metadata<MetaKey>(propertyName).pipe(filter(Boolean));
    }

    public isSyncingMetadata(propertyName: keyof T): Observable<boolean> {
        return this.getMetadataUpdater(propertyName).pipe(
            map(Boolean),
            distinctUntilChanged()
        );
    }

    public onMetadataSyncing(propertyName: keyof T): Observable<keyof T> {
        return this.isSyncingMetadata(propertyName).pipe(
            filter(Boolean),
            map(() => propertyName),
        );
    }

    public onMetadataSynced(propertyName: keyof T): Observable<keyof T> {
        return this.isSyncingMetadata(propertyName).pipe(
            filter(updating => !updating),
            map(() => propertyName)
        );
    }

    public onAllMetadataSyncing(...propertyNames: Array<keyof T>): Observable<Array<keyof T>> {
        return zip(...propertyNames.map(propertyName => this.onMetadataSyncing(propertyName)));
    }

    public onAllMetadataSynced(...propertyNames: Array<keyof T>): Observable<Array<keyof T>> {
        return zip(...propertyNames.map(propertyName => this.onMetadataSynced(propertyName)));
    }

    public onAnyMetadataSyncing(...propertyNames: Array<keyof T>): Observable<keyof T> {
        return merge(...propertyNames.map(propertyName => this.onMetadataSyncing(propertyName)));
    }

    public onAnyMetadataSynced(propertyNames: Array<keyof T>): Observable<keyof T> {
        return merge(...propertyNames.map(propertyName => this.onMetadataSynced(propertyName)));
    }

    public require<OptsT = any>(propertyName: keyof T, options?: Synchronizer.Options<OptsT>): Observable<T> {
        return this.state$.pipe(
            take(1),
            mergeMap(state => {
                if (state[propertyName]) {
                    return of(state);
                }
                else {
                    return this.sync<OptsT>(propertyName, options);
                }
            })
        );
    }

    public requireSome<OptsT = any>(fields: Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        if (fields.length === 0) {
            return this.state$.pipe(take(1));
        }
        else {
            let errors: any[] = [];
            return forkJoin(fields.map(propertyName => {
                return this.require(propertyName, options).pipe(
                    catchError((error) => {
                        errors.push(error);
                        return of(undefined);
                    })
                );
            })).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take(1));
                    }
                    else {
                        return throwError(`Error requiring fields: ${errors.join(", ")}`);
                    }
                })
            );
        }
    }

    public requireMetadata<MetaKey extends keyof T, OptsT = any>(propertyName: MetaKey, options?: Synchronizer.Options<OptsT>): Observable<T[MetaKey]> {
        return this.require<OptsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    public sync<OptsT = any>(propertyName: keyof T, options?: Synchronizer.Options<OptsT>): Observable<T> {
        options = options || {};
        const errorPrefix = "Error: Cannot update session info:";
        const synchronizer = this.synchronizers.getSynchronizer(propertyName);

        // Check for cached values/pending requests only if this isn't a dependent requestor
        if (!synchronizer.proxy) {
            if (options.clearStore) {
                // TODO-Synchronize on this?
                this.dispatch(propertyName, undefined).subscribe();
            }

            if (synchronizer.requiredProperties && synchronizer.requiredProperties.some(requiredPropertyName => requiredPropertyName === propertyName)) {
                return throwError(`${errorPrefix} Synchronizer requires a reference to itself.`);
            }
        }

        return this.pendingRequests$.pipe(
            take(1),
            mergeMap((pendingRequests) => {
                let pendingRequest$ = pendingRequests[propertyName];

                if (pendingRequest$ && !options.clearStore) {
                    // Use the existing request if this value is currently being requested
                    return pendingRequest$;
                }
                else {
                    // First request any required fields needed to fetch the propertyName
                    if (synchronizer.proxy) {
                        pendingRequest$ = this.syncSome(synchronizer.requiredProperties, options);
                    }
                    else {
                        pendingRequest$ = this.requireSome(synchronizer.requiredProperties || []);
                    }

                    // Then fetch the propertyName
                    pendingRequest$ = pendingRequest$.pipe(
                        mergeMap((requiredDetails: any) => synchronizer.read(requiredDetails, options)),
                        mergeMap((value: any) => this.dispatch(propertyName, value)), // Update the store value
                        catchError((error) => {
                            console.error(`Failed to request propertyName "${propertyName}": ${error}`);
                            this.clearMetadataUpdater(propertyName, pendingRequest$);
                            return throwError(error);
                        }),
                        tap(() => this.clearMetadataUpdater(propertyName, pendingRequest$)), // Remove the pending request
                        mergeMap(() => this.state$.pipe(take(1))), // Get the newly updated Session
                        shareReplay(1)
                    );

                    this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: pendingRequest$ }));
                    return pendingRequest$;
                }
            })
        );
    }

    public syncSome<OptsT = any>(requiredMetadataNames: Array<keyof T>, options?: Synchronizer.Options<OptsT>): Observable<T> {
        options = options || {};

        if (requiredMetadataNames.length === 0) {
            return this.state$.pipe(take(1));
        }

        // Update each required propertyName
        let errors: any[] = [];
        return forkJoin(requiredMetadataNames.map(name => this.sync<OptsT>(name, options).pipe(
            catchError((error) => {
                errors.push(error);
                return of(undefined);
            })))).pipe(
                mergeMap(() => {
                    if (errors.length === 0) {
                        return this.state$.pipe(take(1));
                    }
                    else {
                        return throwError(`Error updating fields: ${errors.join(", ")}`);
                    }
                })
            );
    }

    public syncMetadata<MetaKey extends keyof T, OptsT = any>(propertyName: MetaKey, options?: Synchronizer.Options<OptsT>): Observable<T[MetaKey]> {
        return this.sync<OptsT>(propertyName, options).pipe(map(session => session[propertyName]));
    }

    private getMetadataUpdater(propertyName: keyof T): Observable<Observable<any> | undefined> {
        return this.pendingRequests$.pipe(map(pendingRequests => pendingRequests[propertyName]));
    }

    private clearMetadataUpdater(propertyName: keyof T, request: Observable<any>) {
        this.pendingRequests$.pipe(
            take(1),
            filter(pendingRequests => pendingRequests[propertyName] === request)
        ).subscribe(pendingRequests => this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: undefined })));
    }
}