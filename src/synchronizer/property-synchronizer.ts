import { Observable } from "rxjs";
import { Synchronizer } from "./synchronizer";

export interface PropertySynchronizer<
    T,
    PropKey extends keyof T,
    ParamsT = any
> extends Synchronizer<T, PropKey, ParamsT> {
    property: PropKey;

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

    export class Collection<T> implements Synchronizer.ICollection<T> {
        protected _synchronizers: Dictionary<T> = {};

        constructor(...args: PropertySynchronizer<T, any>[]) {
            // Create the dictionary from the list of synchronizers
            this._synchronizers = args.reduce((synchronizers: Dictionary<T>, synchronizer: PropertySynchronizer<T, any>) => {
                return Object.assign(synchronizers, { [synchronizer.property]: synchronizer });
            }, {});
        }

        public get synchronizers(): Dictionary<T> {
            return this._synchronizers;
        }

        public setSynchronizer<ParamsT = any>(stateProperty: keyof T, synchronizer: PropertySynchronizer<T, typeof stateProperty, ParamsT>) {
            this._synchronizers[stateProperty] = synchronizer;
        }

        public getSynchronizer<ParamsT = any>(stateProperty: keyof T): PropertySynchronizer<T, typeof stateProperty, ParamsT> {
            const synchronizer = this._synchronizers[stateProperty] as PropertySynchronizer<T, typeof stateProperty, ParamsT>;

            if (synchronizer) {
                return synchronizer;
            } else {
                throw new Error(`No Synchronizer defined for state property "${stateProperty}".`);
            }
        }
    }
}
