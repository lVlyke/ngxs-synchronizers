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

    /**
     * @deprecated
     */
    export interface ICollection<T> {
        setSynchronizer<ParamsT = any>(stateProperty: keyof T, synchronizer: Synchronizer<T, typeof stateProperty, ParamsT>): void;
        getSynchronizer<ParamsT = any>(stateProperty: keyof T): Synchronizer<T, typeof stateProperty, ParamsT>;
    }
}
