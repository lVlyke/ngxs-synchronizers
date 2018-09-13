import { Store } from "@ngxs/store";
import { Observable, BehaviorSubject, zip, merge, of, forkJoin } from "rxjs";
import { filter, map, distinctUntilChanged, flatMap, take, catchError, shareReplay } from "rxjs/operators";
import { Injectable } from "@angular/core";
import { Synchronizer } from "./synchronizer";
import { SyncState } from "./decorators/sync-state";

@Injectable()
export class SyncStore extends Store {

    private pendingRequests$ = new BehaviorSubject<{ [stateMetadata: string]: Observable<any> }>({});

    constructor(
        private synchronizers: Synchronizer.Collection,
        store: Store
    ) {
        super(null, null, null);

        Object.assign(this, store);
    }

    public state(): Observable<any> {
        return this.select(state => state);
    }

    public metadata(propertyName: string): Observable<any> {
        return this.select(state => state[propertyName]);
    }

    public definedMetadata<T>(propertyName: string): Observable<T> {
        return this.select(state => state[propertyName]).pipe(filter(Boolean));
    }

    public isSyncingMetadata(propertyName: string): Observable<boolean> {
        return this.getMetadataUpdater(propertyName).pipe(
            map(Boolean),
            distinctUntilChanged()
        );
    }

    public onMetadataSyncing(propertyName: string): Observable<string> {
        return this.isSyncingMetadata(propertyName).pipe(
            filter(Boolean),
            map(() => propertyName),
        );
    }

    public onMetadataSynced(propertyName: string): Observable<string> {
        return this.isSyncingMetadata(propertyName).pipe(
            filter(updating => !updating),
            map(() => propertyName)
        );
    }

    public onAllMetadataSyncing(...propertyNames: string[]): Observable<string[]> {
        return zip(...propertyNames.map(propertyName => this.onMetadataSyncing(propertyName)));
    }

    public onAllMetadataSynced(...propertyNames: string[]): Observable<string[]> {
        return zip(...propertyNames.map(propertyName => this.onMetadataSynced(propertyName)));
    }

    public onAnyMetadataSyncing(...propertyNames: string[]): Observable<string> {
        return merge(...propertyNames.map(propertyName => this.onMetadataSyncing(propertyName)));
    }

    public onAnyMetadataSynced(propertyNames: string[]): Observable<string> {
        return merge(...propertyNames.map(propertyName => this.onMetadataSynced(propertyName)));
    }

    public require(propertyName: string, options?: Synchronizer.Options<any>): Observable<any> {
        return this.state().pipe(
            take(1),
            flatMap(session => {
                if (session[propertyName]) {
                    return of(session);
                }
                else {
                    return this.sync(propertyName, options);
                }
            })
        );
    }

    public requireSome(fields: string[], options?: Synchronizer.Options<any>): Observable<any> {
        if (fields.length === 0) {
            return this.state().pipe(take(1));
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
                flatMap(() => {
                    if (errors.length === 0) {
                        return this.state().pipe(take(1));
                    }
                    else {
                        return Observable.throw(`Error requiring fields: ${errors.join(", ")}`);
                    }
                })
            );
        }
    }

    public requireMetadata<T>(propertyName: string): Observable<T> {
        return this.require(propertyName).pipe(map(session => session[propertyName] as T));
    }

    public sync(propertyName: string, options?: Synchronizer.Options<any>): Observable<any> {
        options = options || {};
        const errorPrefix = "Error: Cannot update session info:";
        const synchronizer = this.synchronizers.getSynchronizer(propertyName);

        // Check for cached values/pending requests only if this isn't a dependent requestor
        if (!synchronizer.proxy) {
            if (options.clearStore) {
                // TODO-Synchronize on this?
                this.dispatch(new SyncState.UpdateAction(propertyName, undefined)).subscribe();
            }

            if (synchronizer.requiredProperties && synchronizer.requiredProperties.some(requiredPropertyName => requiredPropertyName === propertyName)) {
                return Observable.throw(`${errorPrefix} Synchronizer requires a reference to itself.`);
            }
        }

        return this.pendingRequests$.pipe(
            take(1),
            flatMap((pendingRequests) => {
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
                        flatMap((requiredDetails: any) => synchronizer.read(requiredDetails, options)),
                        flatMap((value: any) => this.dispatch(new SyncState.UpdateAction(propertyName, value))), // Update the store value
                        catchError((error) => {
                            console.error(`Failed to request propertyName "${propertyName}": ${error}`);
                            this.clearMetadataUpdater(propertyName, pendingRequest$);
                            return Observable.throw(error);
                        }),
                        map(() => this.clearMetadataUpdater(propertyName, pendingRequest$)), // Remove the pending request
                        flatMap(() => this.state().pipe(take(1))), // Get the newly updated Session
                        shareReplay(1)
                    );

                    this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: pendingRequest$ }));
                    return pendingRequest$;
                }
            })
        );
    }

    public syncSome(requiredMetadataNames: string[], options?: Synchronizer.Options<any>): Observable<any> {
        options = options || {};

        if (requiredMetadataNames.length === 0) {
            return this.state().pipe(take(1));
        }

        // Update each required propertyName
        let errors: any[] = [];
        return forkJoin(requiredMetadataNames.map(name => this.sync(name, options).pipe(catchError((error) => {
            errors.push(error);
            return of(undefined);
        })))).pipe(
            flatMap(() => {
                if (errors.length === 0) {
                    return this.state().pipe(take(1));
                }
                else {
                    return Observable.throw(`Error updating fields: ${errors.join(", ")}`);
                }
            })
        );
    }

    public syncMetadata<T>(propertyName: string): Observable<T> {
        return this.sync(propertyName).pipe(map(session => session[propertyName] as T));
    }

    private getMetadataUpdater(propertyName: string): Observable<Observable<any> | undefined> {
        return this.pendingRequests$.pipe(map(pendingRequests => pendingRequests[propertyName]));
    }

    private clearMetadataUpdater(propertyName: string, request: Observable<any>) {
        this.pendingRequests$.pipe(
            take(1),
            filter(pendingRequests => pendingRequests[propertyName] === request)
        ).subscribe(pendingRequests => this.pendingRequests$.next(Object.assign(pendingRequests, { [propertyName]: undefined })));
    }
}