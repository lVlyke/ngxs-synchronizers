import { Observable } from "rxjs";

export interface Synchronizer<
    T,
    PropKey extends keyof T,
    ParamsT = any
> {
    requiredProperties?: Array<keyof T>;
    proxy?: boolean;

    read(
        requiredDetails: Partial<T>,
        options: Synchronizer.ReadOptions<T, PropKey, ParamsT>
    ): Observable<T[PropKey]>;
}

export namespace Synchronizer {

    export interface Options<ParamsT = any> {
        requestParams?: ParamsT;
        clearStore?: boolean;
    }

    export interface ReadOptions<
        T,
        PropKey extends keyof T,
        ParamsT = any
    > extends Options<ParamsT> {
        propertyName: PropKey;
    }
}
