import { Observable } from "rxjs";
import { Synchronizer } from "./synchronizer";

export interface PropertySynchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT = never,
    WriteParamsT = never
> extends Synchronizer<T, PropKey, ReadParamsT, WriteParamsT> {

    read(
        requiredDetails: Partial<T>,
        options: PropertySynchronizer.ReadOptions<T, PropKey, ReadParamsT>
    ): Observable<T[PropKey]>;

    write?(
        value: T[PropKey],
        options: PropertySynchronizer.WriteOptions<T, PropKey, WriteParamsT>
    ): Observable<any>;
}

export namespace PropertySynchronizer {

    export type ReadOptions<
        T,
        PropKey extends keyof T = keyof T,
        ParamsT = never
    > = Synchronizer.BaseOptions<T, PropKey, ParamsT> & Synchronizer.ReadOptions<ParamsT>;

    export type WriteOptions<
        T,
        PropKey extends keyof T = keyof T,
        ParamsT = never
    > = Synchronizer.BaseOptions<T, PropKey, ParamsT> & Synchronizer.WriteOptions<ParamsT>;
}
