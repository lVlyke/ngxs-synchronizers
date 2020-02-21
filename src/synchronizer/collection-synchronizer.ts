import { Observable } from "rxjs";
import { Synchronizer } from "./synchronizer";

export interface CollectionSynchronizer<
    T,
    ParamsT = any
> extends Synchronizer<T, keyof T, ParamsT> {
    read(
        requiredDetails: Partial<T>,
        options: CollectionSynchronizer.ReadOptions<T, ParamsT>
    ): Observable<T[keyof T]>;
}

export namespace CollectionSynchronizer {

    export type Dictionary<T> = CollectionSynchronizer<T>;

    export type ReadOptions<
        T = any,
        ParamsT = any
    > = Synchronizer.ReadOptions<T, keyof T, ParamsT>;

    export class Collection<T> implements Synchronizer.ICollection<T> {

        constructor(private synchronizer: CollectionSynchronizer<T>) {}

        public get synchronizers(): Dictionary<T> {
            return this.synchronizer;
        }

        public setSynchronizer<ParamsT = any>(_stateProperty: keyof T, synchronizer: CollectionSynchronizer<T, ParamsT>): void {
            this.synchronizer = synchronizer;
        }

        public getSynchronizer<ParamsT = any>(_stateProperty: keyof T): CollectionSynchronizer<T, ParamsT> {
            return this.synchronizer;
        }
    }
}
