import { Observable } from "rxjs";
import { Synchronizer } from "./synchronizer";

export interface PropertySynchronizer<
    T,
    PropKey extends keyof T,
    ParamsT = any
> extends Synchronizer<T, PropKey, ParamsT> {

    read(
        requiredDetails: Partial<T>,
        options: PropertySynchronizer.ReadOptions<T, PropKey, ParamsT>
    ): Observable<T[PropKey]>;
}

export namespace PropertySynchronizer {

    export type Dictionary<T> = {
        [P in keyof T]?: PropertySynchronizer<T, P>;
    };

    export type ReadOptions<
        T = any,
        PropKey extends keyof T = keyof T,
        ParamsT = any
    > = Synchronizer.ReadOptions<T, PropKey, ParamsT>;
}
