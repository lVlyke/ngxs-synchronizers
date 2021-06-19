import { Observable } from "rxjs";

export interface Synchronizer<
    T,
    PropKey extends keyof T,
    ReadParamsT,
    WriteParamsT
> {
    requiredProperties?: Array<keyof T>;
    proxy?: boolean;

    read(
        requiredDetails: Partial<T>,
        options: Synchronizer.BaseOptions<T, PropKey, ReadParamsT> & Synchronizer.ReadOptions<ReadParamsT>
    ): Observable<T[PropKey]>;

    write?(
        value: T[PropKey],
        options: Synchronizer.BaseOptions<T, PropKey, WriteParamsT> & Synchronizer.WriteOptions<WriteParamsT>
    ): Observable<any>;
}

export namespace Synchronizer {

    export interface BaseOptions<
        T,
        PropKey extends keyof T,
        ParamsT
    > {
        propertyName: PropKey;
        requestParams?: ParamsT;
    }

    export interface ReadOptions<ParamsT> {
        clearStore?: boolean;
        requestParams?: ParamsT;
    }

    export interface WriteOptions<ParamsT> {
        requestParams?: ParamsT;
    }
}
