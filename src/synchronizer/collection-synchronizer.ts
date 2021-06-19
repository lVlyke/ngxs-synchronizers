import { Observable } from "rxjs";
import { Synchronizer } from "./synchronizer";

export interface CollectionSynchronizer<
    T,
    ReadParamsT = never,
    WriteParamsT = never
> extends Synchronizer<T, keyof T, ReadParamsT, WriteParamsT> {

    read(
        requiredDetails: Partial<T>,
        options: CollectionSynchronizer.ReadOptions<T, ReadParamsT>
    ): Observable<T[keyof T]>;

    write?(
        value: T[keyof T],
        options: CollectionSynchronizer.WriteOptions<T, WriteParamsT>
    ): Observable<any>;
}

export namespace CollectionSynchronizer {

    export type ReadOptions<
        T,
        ParamsT = never
    > = Synchronizer.BaseOptions<T, keyof T, ParamsT> & Synchronizer.ReadOptions<ParamsT>;

    export type WriteOptions<
        T,
        ParamsT = never
    > = Synchronizer.BaseOptions<T, keyof T, ParamsT> & Synchronizer.WriteOptions<ParamsT>;
}
