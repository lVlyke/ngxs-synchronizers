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
}
